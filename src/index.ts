#!/usr/bin/env bun

import { runInteractive } from "./cli/interactive";

const hasFlags = process.argv.length > 2;

async function main() {
  if (hasFlags) {
    const { runNonInteractive } = await import("./cli/non-interactive");
    await runNonInteractive();
  } else {
    await runInteractive();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err.message ?? err);
  process.exit(1);
});
