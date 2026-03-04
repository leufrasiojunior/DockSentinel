#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BASE_VERSION_RE = /^\d+\.\d+\.\d+$/;

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export function writeJson(filePath, data) {
  const content = JSON.stringify(data, null, 2) + "\n";
  fs.writeFileSync(filePath, content, "utf-8");
}

export function getRootPackagePath(rootDir = process.cwd()) {
  return path.join(rootDir, "package.json");
}

export function readRootVersion(rootDir = process.cwd()) {
  const pkgPath = getRootPackagePath(rootDir);
  if (!fs.existsSync(pkgPath)) {
    throw new Error("package.json não encontrado na raiz do projeto.");
  }

  const pkg = readJson(pkgPath);
  if (!pkg.version || typeof pkg.version !== "string") {
    throw new Error("package.json da raiz não possui o campo 'version'.");
  }

  return pkg.version.trim();
}

export function parseVersion(v) {
  const pre = v.match(/^(\d+\.\d+\.\d+)-(alpha|beta)\.(\d+)$/);
  if (pre) return { base: pre[1], channel: pre[2], n: Number(pre[3]) };

  const stable = v.match(/^(\d+\.\d+\.\d+)$/);
  if (stable) return { base: stable[1], channel: null, n: null };

  return null;
}

export function parseTag(tag) {
  const pre = tag.match(/^v(\d+\.\d+\.\d+)-(alpha|beta)\.(\d+)$/);
  if (pre) return { base: pre[1], channel: pre[2], n: Number(pre[3]) };

  const stable = tag.match(/^v(\d+\.\d+\.\d+)$/);
  if (stable) return { base: stable[1], channel: "release", n: null };

  return null;
}

export function isValidBaseVersion(base) {
  return BASE_VERSION_RE.test(base);
}

export function buildVersion(channel, base, n) {
  if (!isValidBaseVersion(base)) {
    throw new Error(
      `Versão base inválida: "${base}". Esperado formato X.Y.Z (ex: 1.2.3).`
    );
  }

  if (channel === "stable" || channel === "release") return base;

  if (channel !== "alpha" && channel !== "beta") {
    throw new Error(`Canal inválido: "${channel}". Use alpha | beta | stable.`);
  }

  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`Número inválido para ${channel}: "${n}". Use inteiro >= 1.`);
  }

  return `${base}-${channel}.${n}`;
}

export function suggestTag(channel, currentVersion) {
  const parsed = parseVersion(currentVersion);
  if (!parsed) {
    throw new Error(
      `Versão atual inválida no package.json: "${currentVersion}". Esperado "X.Y.Z" ou "X.Y.Z-alpha.N" / "X.Y.Z-beta.N".`
    );
  }

  if (channel === "release") {
    return `v${parsed.base}`;
  }

  if (channel === "alpha" || channel === "beta") {
    if (parsed.channel === channel && typeof parsed.n === "number") {
      return `v${parsed.base}-${channel}.${parsed.n + 1}`;
    }
    return `v${parsed.base}-${channel}.1`;
  }

  throw new Error(`Canal inválido para sugestão: "${channel}".`);
}

export function validateTagForChannel(tag, channel) {
  const parsed = parseTag(tag);
  if (!parsed) {
    return {
      ok: false,
      error:
        'Formato de tag inválido. Use: "vX.Y.Z", "vX.Y.Z-alpha.N" ou "vX.Y.Z-beta.N".',
    };
  }

  if (channel === "release" && parsed.channel !== "release") {
    return { ok: false, error: "Para release, use tag no formato vX.Y.Z." };
  }

  if ((channel === "alpha" || channel === "beta") && parsed.channel !== channel) {
    return {
      ok: false,
      error: `Canal não bate com a tag. Você pediu "${channel}", mas a tag é "${parsed.channel}".`,
    };
  }

  return { ok: true, parsed };
}

export function tryReadLatestVTag() {
  try {
    const raw = execSync('git describe --tags --match "v*" --abbrev=0', {
      stdio: ["ignore", "pipe", "pipe"],
    })
      .toString()
      .trim();
    return raw || null;
  } catch {
    return null;
  }
}
