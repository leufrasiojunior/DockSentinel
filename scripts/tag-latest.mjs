#!/usr/bin/env node
import { execSync } from "node:child_process";

function shOut(cmd) {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
  } catch {
    return "";
  }
}

// pega a tag mais recente alcançável a partir do HEAD
const tag = shOut('git describe --tags --match "v*" --abbrev=0');

if (!tag) {
  console.error("Nenhuma tag v* encontrada no histórico atual.");
  process.exit(1);
}

console.log(tag);
