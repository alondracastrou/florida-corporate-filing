import SftpClient from "ssh2-sftp-client";
import { SFTP_CONFIG, SFTP_REMOTE_DIR } from "../constants";
import { datesToFilenames } from "../utils/filename";

const REMOTE_DIR = SFTP_REMOTE_DIR.endsWith("/") ? SFTP_REMOTE_DIR : `${SFTP_REMOTE_DIR}/`;

export interface DownloadResult {
  filename: string;
  buffer: Buffer;
}

export interface DownloadSummary {
  results: DownloadResult[];
  skippedFiles: string[];
}

export interface DownloadProgress {
  total: number;
  completed: number;
  currentFile: string;
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2_000;
const TRANSFER_TIMEOUT_MS = 120_000;

function isFatalError(err: unknown): boolean {
  const msg = String(err);
  return (
    msg.includes("Authentication failed") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("All configured authentication methods failed")
  );
}

function isConnectionError(err: unknown): boolean {
  const msg = String(err);
  return (
    msg.includes("ECONNRESET") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("EPIPE") ||
    msg.includes("Socket disconnected") ||
    msg.includes("Timeout") ||
    msg.includes("ERR_SOCKET_CLOSED") ||
    msg.includes("Channel open failure") ||
    msg.includes("end event called")
  );
}

function retryDelay(attempt: number): number {
  return RETRY_DELAY_MS * Math.pow(2, attempt) * (0.75 + Math.random() * 0.5);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise.then(
      (v) => { clearTimeout(timer); return v; },
      (e) => { clearTimeout(timer); throw e; }
    ),
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Timeout: ${label} after ${ms}ms`)), ms);
    }),
  ]);
}

async function createConnection(): Promise<SftpClient> {
  const sftp = new SftpClient("fl-leads");
  try {
    await sftp.connect(SFTP_CONFIG);
  } catch (err) {
    const msg = String(err);
    if (
      msg.includes("crypto") ||
      msg.includes("createDiffieHellmanGroup") ||
      msg.includes("not a function")
    ) {
      throw new Error(
        "ssh2 native crypto not compatible with Bun.\n" +
        "Rerun with: node --import tsx src/index.ts"
      );
    }
    throw err;
  }
  return sftp;
}

/** Retry an SFTP operation with reconnection on connection errors */
async function withRetry<T>(
  operation: (sftp: SftpClient) => Promise<T>,
  getSftp: () => SftpClient,
  reconnect: () => Promise<SftpClient>,
  label: string
): Promise<T> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation(getSftp());
    } catch (err) {
      if (isFatalError(err)) throw err;

      if (attempt < MAX_RETRIES && isConnectionError(err)) {
        await sleep(retryDelay(attempt));
        try {
          await reconnect();
        } catch {
          throw new Error(`Connection lost during ${label} and could not reconnect.`);
        }
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Failed ${label} after ${MAX_RETRIES + 1} attempts`);
}

export async function downloadFilings(
  startDate: Date,
  endDate: Date,
  onProgress?: (progress: DownloadProgress) => void
): Promise<DownloadSummary> {
  let sftp = await createConnection();
  let aborted = false;

  const cleanup = () => { aborted = true; };
  process.on("SIGINT", cleanup);

  const getSftp = () => sftp;
  const reconnect = async () => {
    await sftp.end().catch(() => {});
    sftp = await createConnection();
    return sftp;
  };

  try {
    // List remote directory with retry
    const remoteFiles = await withRetry(
      (s) => s.list(REMOTE_DIR),
      getSftp,
      reconnect,
      "directory listing"
    );
    const remoteFileNames = new Set(remoteFiles.map((f) => f.name));

    const expectedFiles = datesToFilenames(startDate, endDate);
    const filesToDownload: string[] = [];
    const skippedFiles: string[] = [];

    // Track files missing from server (weekends/holidays)
    for (const f of expectedFiles) {
      if (remoteFileNames.has(f)) {
        filesToDownload.push(f);
      } else {
        skippedFiles.push(f);
      }
    }

    if (filesToDownload.length === 0) {
      return { results: [], skippedFiles };
    }

    const results: DownloadResult[] = [];

    for (let i = 0; i < filesToDownload.length; i++) {
      if (aborted) break;

      const filename = filesToDownload[i];
      const remotePath = `${REMOTE_DIR}${filename}`;

      onProgress?.({
        total: filesToDownload.length,
        completed: i,
        currentFile: filename,
      });

      try {
        const result = await withRetry(
          (s) => withTimeout(s.get(remotePath), TRANSFER_TIMEOUT_MS, remotePath),
          getSftp,
          reconnect,
          `download ${filename}`
        );

        if (!Buffer.isBuffer(result)) {
          throw new Error(`Expected Buffer from SFTP get, received ${typeof result}`);
        }
        results.push({ filename, buffer: result });
      } catch (err) {
        if (isFatalError(err)) throw err;
        skippedFiles.push(filename);
      }
    }

    onProgress?.({
      total: filesToDownload.length,
      completed: filesToDownload.length,
      currentFile: aborted ? "aborted" : "done",
    });

    return { results, skippedFiles };
  } finally {
    process.off("SIGINT", cleanup);
    await sftp.end().catch(() => {});
  }
}

/** List available files on the SFTP server (for dry-run and testing) */
export async function listRemoteFiles(): Promise<string[]> {
  const sftp = await createConnection();
  try {
    const files = await sftp.list(REMOTE_DIR);
    return files
      .map((f) => f.name)
      .filter((n) => /^\d{8}c\.txt$/.test(n))
      .sort();
  } finally {
    await sftp.end().catch(() => {});
  }
}
