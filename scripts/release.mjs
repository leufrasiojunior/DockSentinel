#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function sh(cmd) {
  console.log(`\n$ ${cmd}`);
  return execSync(cmd, { stdio: "inherit" });
}

function shOut(cmd) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
}

function requireCleanGit() {
  const out = shOut("git status --porcelain");
  if (out) {
    console.error("Seu git não está limpo. Commit/stash antes de gerar release.");
    process.exit(1);
  }
}

function usage() {
  console.log(`
Uso:
  node scripts/release.mjs alpha  1.2.0 1
  node scripts/release.mjs beta   1.2.0 1
  node scripts/release.mjs stable 1.2.0

O script vai:
- Atualizar package.json (e package-lock.json se existir)
- Criar commit "chore(release): vX.Y.Z..."
- Criar tag anotada "vX.Y.Z..."
- Push do commit e da tag
`);
  process.exit(1);
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

function writeJson(filePath, data) {
  const content = JSON.stringify(data, null, 2) + "\n";
  fs.writeFileSync(filePath, content, "utf-8");
}

function bumpPackageJsonVersion(rootDir, newVersion) {
  const pkgPath = path.join(rootDir, "package.json");
  if (!fs.existsSync(pkgPath)) {
    console.error("Não encontrei package.json na raiz do projeto.");
    process.exit(1);
  }

  const pkg = readJson(pkgPath);

  if (!pkg.version) {
    console.error("package.json não tem o campo 'version'.");
    process.exit(1);
  }

  const oldVersion = pkg.version;
  if (oldVersion === newVersion) {
    console.error(`A versão já está em ${newVersion}. Escolha outra versão/tag.`);
    process.exit(1);
  }

  pkg.version = newVersion;
  writeJson(pkgPath, pkg);

  console.log(`Atualizado package.json: ${oldVersion} -> ${newVersion}`);
  return [pkgPath];
}

function bumpPackageLockVersion(rootDir, newVersion) {
  const lockPath = path.join(rootDir, "package-lock.json");
  if (!fs.existsSync(lockPath)) return [];

  try {
    const lock = readJson(lockPath);

    // Campos comuns no npm lockfile:
    // - lock.version (versão do pacote/root)
    // - lock.packages[""].version (npm v7+)
    const oldVersion = lock.version;

    lock.version = newVersion;

    if (lock.packages && lock.packages[""] && lock.packages[""].version) {
      lock.packages[""].version = newVersion;
    }

    writeJson(lockPath, lock);

    console.log(
      `Atualizado package-lock.json: ${oldVersion ?? "(sem)"} -> ${newVersion}`
    );
    return [lockPath];
  } catch (e) {
    console.log(
      "⚠️ Não consegui atualizar package-lock.json (talvez esteja em formato diferente). Prosseguindo..."
    );
    return [];
  }
}

const [channel, base, n] = process.argv.slice(2);
if (!channel || !base) usage();

const isAlpha = channel === "alpha";
const isBeta = channel === "beta";
const isStable = channel === "stable";

if (!isAlpha && !isBeta && !isStable) usage();
if ((isAlpha || isBeta) && !n) {
  console.error("Para alpha/beta, informe o número (ex: 1, 2, 3).");
  process.exit(1);
}

// Ex: base=1.2.0 / channel=alpha / n=1 -> version=1.2.0-alpha.1 / tag=v1.2.0-alpha.1
const version =
  isStable ? `${base}` : isAlpha ? `${base}-alpha.${n}` : `${base}-beta.${n}`;

const tag = `v${version}`;

requireCleanGit();

// Atualiza refs/tags
sh("git fetch --all --tags");

// Atualiza arquivos de versão
const rootDir = process.cwd();
const touched = [
  ...bumpPackageJsonVersion(rootDir, version),
  ...bumpPackageLockVersion(rootDir, version),
];

// Commit de release
sh(`git add ${touched.map((p) => `"${p}"`).join(" ")}`);
sh(`git commit -m "chore(release): ${tag}"`);

// Cria tag anotada no commit do release
sh(`git tag -a "${tag}" -m "Release ${tag}"`);

// Push do commit e da tag
sh(`git push origin HEAD`);
sh(`git push origin "${tag}"`);

console.log(`\n✅ Release pronto: ${tag}`);
console.log("Se o CI estiver configurado para tags v*, ele vai publicar no Docker Hub.");
