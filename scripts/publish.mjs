#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function sh(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

function readRootVersion() {
  const pkgPath = path.join(process.cwd(), "package.json");
  if (!fs.existsSync(pkgPath)) {
    console.error("package.json não encontrado na raiz do projeto.");
    process.exit(1);
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  if (!pkg.version) {
    console.error("package.json da raiz não possui o campo 'version'.");
    process.exit(1);
  }
  return pkg.version.trim();
}

// Converte "0.1.0-beta.1" -> { base:"0.1.0", channel:"beta", n:1 }
function parseVersion(v) {
  const pre = v.match(/^(\d+\.\d+\.\d+)-(alpha|beta)\.(\d+)$/);
  if (pre) return { base: pre[1], channel: pre[2], n: Number(pre[3]) };

  const stable = v.match(/^(\d+\.\d+\.\d+)$/);
  if (stable) return { base: stable[1], channel: null, n: null };

  return null;
}

function suggestTag(channel) {
  const current = readRootVersion();
  const parsed = parseVersion(current);

  if (!parsed) {
    console.error(
      `Versão atual inválida no package.json: "${current}". Esperado "X.Y.Z" ou "X.Y.Z-alpha.N" / "X.Y.Z-beta.N".`
    );
    process.exit(1);
  }

  // Se pediu release (stable): sempre sugere v<base>
  if (channel === "release") {
    return `v${parsed.base}`;
  }

  // alpha/beta:
  // - se a versão atual já é do mesmo canal, incrementa N
  // - caso contrário, começa em .1 usando a base atual
  if (parsed.channel === channel && typeof parsed.n === "number") {
    return `v${parsed.base}-${channel}.${parsed.n + 1}`;
  }

  return `v${parsed.base}-${channel}.1`;
}

function usage() {
  console.log(`
Uso:
  npm run publish -- beta [vX.Y.Z-beta.N]
  npm run publish -- alpha [vX.Y.Z-alpha.N]
  npm run publish -- release [vX.Y.Z]

Se você omitir a tag, será sugerida automaticamente a partir da versão atual do package.json (raiz).

Exemplos:
  npm run publish -- beta v0.1.0-beta.1
  npm run publish -- beta
  npm run publish -- release
`);
  process.exit(1);
}

const args = process.argv.slice(2);
const channel = args[0];
const tagArg = args[1]; // opcional

if (!channel) usage();

const allowed = new Set(["alpha", "beta", "release"]);
if (!allowed.has(channel)) {
  console.error(`Canal inválido: ${channel}. Use alpha | beta | release`);
  usage();
}

const tag = tagArg ?? suggestTag(channel);
console.log(`\n📌 Tag usada: ${tag}`);

if (channel === "release") {
  const m = tag.match(/^v(\d+\.\d+\.\d+)$/);
  if (!m) {
    console.error(`Tag de release inválida: ${tag}. Esperado: vX.Y.Z`);
    process.exit(1);
  }
  const base = m[1];
  sh(`node scripts/release.mjs stable ${base}`);
  process.exit(0);
}

// alpha/beta
{
  const m = tag.match(/^v(\d+\.\d+\.\d+)-(alpha|beta)\.(\d+)$/);
  if (!m) {
    console.error(`Tag ${channel} inválida: ${tag}. Esperado: vX.Y.Z-${channel}.N`);
    process.exit(1);
  }
  const base = m[1];
  const kind = m[2];
  const n = m[3];

  if (kind !== channel) {
    console.error(
      `Canal não bate com a tag. Você pediu "${channel}", mas a tag é "${kind}".`
    );
    process.exit(1);
  }

  sh(`node scripts/release.mjs ${channel} ${base} ${n}`);
}
