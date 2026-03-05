#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { confirm, ensurePromptsAvailableOrExit } from "./lib/cli.mjs";
import {
  buildVersion,
  getRootPackagePath,
  readJson,
  writeJson,
} from "./lib/release-utils.mjs";

function usage() {
  console.log(`
Uso:
  node scripts/release.mjs alpha  1.2.0 1 [--dry-run] [--yes] [--non-interactive] [--keep-tag]
  node scripts/release.mjs beta   1.2.0 1 [--dry-run] [--yes] [--non-interactive] [--keep-tag]
  node scripts/release.mjs stable 1.2.0   [--dry-run] [--yes] [--non-interactive] [--keep-tag]

Flags:
  --dry-run          Mostra tudo que seria executado sem mutar arquivos/git.
  --yes              Pula confirmações interativas.
  --non-interactive  Não abre prompts; use junto com --yes para automação.
  --keep-tag         Permite reaproveitar a mesma versão/tag para retry da publicação.

Fluxo:
  1) Atualizar package.json (e package-lock.json se existir/for válido)
  2) Criar commit "chore(release): vX.Y.Z..."
  3) Criar tag anotada "vX.Y.Z..."
  4) Push do commit e da tag
`);
  process.exit(1);
}

function parseCliArgs(argv) {
  const flags = {
    dryRun: false,
    yes: false,
    nonInteractive: false,
    keepTag: false,
  };
  const positional = [];

  for (const arg of argv) {
    if (arg === "--dry-run") {
      flags.dryRun = true;
      continue;
    }
    if (arg === "--yes") {
      flags.yes = true;
      continue;
    }
    if (arg === "--non-interactive") {
      flags.nonInteractive = true;
      continue;
    }
    if (arg === "--keep-tag") {
      flags.keepTag = true;
      continue;
    }
    if (arg.startsWith("--")) {
      console.error(`Flag desconhecida: ${arg}`);
      usage();
    }
    positional.push(arg);
  }

  return { positional, flags };
}

function quoteShell(value) {
  return `"${String(value).replace(/(["\\$`])/g, "\\$1")}"`;
}

function sh(cmd, { dryRun = false } = {}) {
  console.log(`\n$ ${cmd}`);
  if (dryRun) return;
  execSync(cmd, { stdio: "inherit" });
}

function shOut(cmd) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
}

function getCleanStatus() {
  return shOut("git status --porcelain");
}

function requireCleanGit() {
  const out = getCleanStatus();
  if (!out) return;

  const preview = out.split("\n").slice(0, 20).join("\n");
  console.error("Seu git não está limpo. Commit/stash antes de gerar release.");
  console.error("Arquivos pendentes:");
  console.error(preview);
  if (out.split("\n").length > 20) {
    console.error("... (lista truncada)");
  }
  process.exit(1);
}

function tagExists(tag) {
  try {
    shOut(`git rev-parse -q --verify "refs/tags/${tag}"`);
    return true;
  } catch {
    return false;
  }
}

function inspectLockFile(rootDir) {
  const lockPath = path.join(rootDir, "package-lock.json");
  if (!fs.existsSync(lockPath)) {
    return {
      path: lockPath,
      exists: false,
      parseError: null,
      oldVersion: null,
      hasRootPackageVersion: false,
    };
  }

  try {
    const lock = readJson(lockPath);
    const hasRootPackageVersion = Boolean(lock.packages && lock.packages[""]);
    return {
      path: lockPath,
      exists: true,
      parseError: null,
      oldVersion: lock.version ?? null,
      hasRootPackageVersion,
    };
  } catch (error) {
    return {
      path: lockPath,
      exists: true,
      parseError: error,
      oldVersion: null,
      hasRootPackageVersion: false,
    };
  }
}

function buildReleasePlan({
  channel,
  base,
  n,
  rootDir = process.cwd(),
  allowSameVersion = false,
}) {
  const version = buildVersion(channel, base, n);
  const tag = `v${version}`;
  const pkgPath = getRootPackagePath(rootDir);

  if (!fs.existsSync(pkgPath)) {
    throw new Error("Não encontrei package.json na raiz do projeto.");
  }

  const pkg = readJson(pkgPath);
  if (!pkg.version) {
    throw new Error("package.json não possui o campo 'version'.");
  }

  const oldVersion = String(pkg.version).trim();
  const isSameVersion = oldVersion === version;
  if (isSameVersion && !allowSameVersion) {
    throw new Error(`A versão já está em ${version}. Escolha outra versão/tag.`);
  }

  const lock = inspectLockFile(rootDir);
  const touchedFiles = [pkgPath];
  if (lock.exists && !lock.parseError) {
    touchedFiles.push(lock.path);
  }

  return {
    rootDir,
    channel,
    base,
    n,
    version,
    tag,
    pkg: {
      path: pkgPath,
      oldVersion,
      newVersion: version,
    },
    isSameVersion,
    lock,
    touchedFiles,
  };
}

function applyVersionFiles(plan, { dryRun }) {
  const touched = [];

  const pkg = readJson(plan.pkg.path);
  pkg.version = plan.version;
  if (dryRun) {
    console.log(
      `[dry-run] Atualizaria package.json: ${plan.pkg.oldVersion} -> ${plan.version}`
    );
  } else {
    writeJson(plan.pkg.path, pkg);
    console.log(`Atualizado package.json: ${plan.pkg.oldVersion} -> ${plan.version}`);
  }
  touched.push(plan.pkg.path);

  if (!plan.lock.exists) return touched;

  if (plan.lock.parseError) {
    console.warn(
      "⚠️ Não consegui ler package-lock.json (formato inválido). O arquivo não será alterado."
    );
    return touched;
  }

  const lock = readJson(plan.lock.path);
  const oldVersion = lock.version ?? "(sem)";
  lock.version = plan.version;
  if (lock.packages && lock.packages[""]) {
    lock.packages[""].version = plan.version;
  }

  if (dryRun) {
    console.log(`[dry-run] Atualizaria package-lock.json: ${oldVersion} -> ${plan.version}`);
  } else {
    writeJson(plan.lock.path, lock);
    console.log(`Atualizado package-lock.json: ${oldVersion} -> ${plan.version}`);
  }

  touched.push(plan.lock.path);
  return touched;
}

function runCommitAndTag(plan, touched, { dryRun }) {
  sh("git fetch --all --tags", { dryRun });
  sh(`git add ${touched.map((p) => quoteShell(p)).join(" ")}`, { dryRun });
  sh(`git commit -m "chore(release): ${plan.tag}"`, { dryRun });
  sh(`git tag -a "${plan.tag}" -m "Release ${plan.tag}"`, { dryRun });
}

function runPush(plan, { dryRun }) {
  sh("git push origin HEAD", { dryRun });
  sh(`git push origin "${plan.tag}"`, { dryRun });
}

function runKeepTagRetry(plan, { dryRun }) {
  sh("git fetch --all --tags", { dryRun });
  sh(`git tag -f -a "${plan.tag}" -m "Retry release ${plan.tag}"`, { dryRun });
  sh(`git push origin "refs/tags/${plan.tag}" --force`, { dryRun });
}

async function confirmStepOrExit(question, { yes, nonInteractive }) {
  if (yes) return;

  if (nonInteractive) {
    console.error(
      `Confirmação obrigatória para este fluxo. Use --yes junto com --non-interactive para automação.`
    );
    process.exit(1);
  }

  ensurePromptsAvailableOrExit("Não foi possível abrir prompt de confirmação.");
  const accepted = await confirm(question, { defaultYes: true });
  if (!accepted) {
    console.error("Operação cancelada.");
    process.exit(1);
  }
}

function printPlanSummary(plan, flags, { retryWithKeepTag, localTagExists }) {
  console.log("\nPlano de release:");
  console.log(`- Canal: ${plan.channel}`);
  console.log(`- Versão nova: ${plan.version}`);
  console.log(`- Tag: ${plan.tag}`);
  console.log(`- package.json atual: ${plan.pkg.oldVersion}`);

  if (retryWithKeepTag) {
    console.log("- Modo keep-tag: reutilizar versão/tag sem novo commit");
    console.log(`- Tag já existe localmente: ${localTagExists ? "sim" : "não"}`);
    console.log("- Ação prevista: recriar tag anotada e forçar push da tag no origin");
  } else {
    console.log(`- package.json: ${plan.pkg.oldVersion} -> ${plan.version}`);

    if (!plan.lock.exists) {
      console.log("- package-lock.json: não encontrado (sem alteração)");
    } else if (plan.lock.parseError) {
      console.log("- package-lock.json: inválido (será ignorado)");
    } else {
      const oldLock = plan.lock.oldVersion ?? "(sem)";
      console.log(`- package-lock.json: ${oldLock} -> ${plan.version}`);
    }
  }

  if (flags.dryRun) {
    console.log("- Modo: dry-run (nenhuma mutação será aplicada)");
  }
  if (flags.nonInteractive) {
    console.log("- Execução: non-interactive");
  }
}

async function main() {
  const { positional, flags } = parseCliArgs(process.argv.slice(2));
  const [channel, base, nRaw] = positional;

  if (!channel || !base) usage();
  if (positional.length > 3) {
    console.error("Argumentos demais.");
    usage();
  }

  const isAlpha = channel === "alpha";
  const isBeta = channel === "beta";
  const isStable = channel === "stable";
  if (!isAlpha && !isBeta && !isStable) {
    console.error(`Canal inválido: "${channel}". Use alpha | beta | stable.`);
    usage();
  }

  if ((isAlpha || isBeta) && !nRaw) {
    console.error("Para alpha/beta, informe o número (ex: 1, 2, 3).");
    process.exit(1);
  }
  if (isStable && nRaw) {
    console.error("Para stable, não informe o número N.");
    process.exit(1);
  }

  const n = nRaw ? Number(nRaw) : null;
  if ((isAlpha || isBeta) && (!Number.isInteger(n) || n <= 0)) {
    console.error(`Número inválido: "${nRaw}". Use inteiro >= 1.`);
    process.exit(1);
  }

  requireCleanGit();
  const plan = buildReleasePlan({
    channel,
    base,
    n,
    allowSameVersion: flags.keepTag,
  });
  const localTagExists = tagExists(plan.tag);
  const retryWithKeepTag = flags.keepTag && plan.isSameVersion;

  if (localTagExists && !retryWithKeepTag) {
    console.error(
      `A tag ${plan.tag} já existe localmente. Escolha outra versão ou remova a tag antes de continuar.`
    );
    process.exit(1);
  }

  printPlanSummary(plan, flags, { retryWithKeepTag, localTagExists });

  if (retryWithKeepTag) {
    await confirmStepOrExit(
      "Confirmar recriação e push forçado da tag para retry da Action?",
      flags
    );
    runKeepTagRetry(plan, { dryRun: flags.dryRun });

    if (flags.dryRun) {
      console.log(`\n✅ Dry-run keep-tag concluído: ${plan.tag}`);
      return;
    }

    console.log(`\n✅ Retry de tag concluído: ${plan.tag}`);
    console.log("A Action deve ser disparada novamente para esta tag.");
    return;
  }

  await confirmStepOrExit("Confirmar atualização dos arquivos de versão?", flags);
  const touched = applyVersionFiles(plan, { dryRun: flags.dryRun });

  await confirmStepOrExit("Confirmar criação de commit e tag?", flags);
  runCommitAndTag(plan, touched, { dryRun: flags.dryRun });

  await confirmStepOrExit("Confirmar push para origin?", flags);
  runPush(plan, { dryRun: flags.dryRun });

  if (flags.dryRun) {
    console.log(`\n✅ Dry-run concluído: ${plan.tag}`);
    return;
  }

  console.log(`\n✅ Release pronto: ${plan.tag}`);
  console.log("Se o CI estiver configurado para tags v*, ele vai publicar no Docker Hub.");
}

await main().catch((error) => {
  console.error(`\n❌ ${error?.message ?? error}`);
  process.exit(1);
});
