#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import {
  confirm,
  ensurePromptsAvailableOrExit,
  promptChoice,
  promptInput,
} from "./lib/cli.mjs";
import {
  parseTag,
  readRootVersion,
  suggestTag,
  tryReadLatestVTag,
  validateTagForChannel,
} from "./lib/release-utils.mjs";

const ALLOWED_CHANNELS = new Set(["alpha", "beta", "release"]);

function usage() {
  console.log(`
Uso:
  npm run publish -- beta [vX.Y.Z-beta.N] [--dry-run] [--yes] [--non-interactive]
  npm run publish -- alpha [vX.Y.Z-alpha.N] [--dry-run] [--yes] [--non-interactive]
  npm run publish -- release [vX.Y.Z] [--dry-run] [--yes] [--non-interactive]

Se você omitir canal/tag em modo interativo, o script abre um fluxo guiado.

Flags:
  --dry-run          Simula todo o release sem mutar arquivos/git.
  --yes              Pula confirmações interativas.
  --non-interactive  Não abre prompts; exige argumentos completos.

Exemplos:
  npm run publish -- beta v0.1.0-beta.1
  npm run publish -- beta
  npm run publish -- release --dry-run
`);
  process.exit(1);
}

function parseCliArgs(argv) {
  const flags = {
    dryRun: false,
    yes: false,
    nonInteractive: false,
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
    if (arg.startsWith("--")) {
      console.error(`Flag desconhecida: ${arg}`);
      usage();
    }
    positional.push(arg);
  }

  if (positional.length > 2) {
    console.error("Argumentos demais. Esperado: [channel] [tag].");
    usage();
  }

  return {
    channelArg: positional[0] ?? null,
    tagArg: positional[1] ?? null,
    flags,
  };
}

function runReleaseScript(args) {
  console.log(`\n$ ${process.execPath} ${args.join(" ")}`);
  execFileSync(process.execPath, args, { stdio: "inherit" });
}

async function resolveChannel(channelArg, context, flags) {
  if (channelArg) {
    if (!ALLOWED_CHANNELS.has(channelArg)) {
      throw new Error(`Canal inválido: ${channelArg}. Use alpha | beta | release.`);
    }
    return channelArg;
  }

  if (flags.nonInteractive) {
    throw new Error(
      'No modo --non-interactive, informe o canal explicitamente: "alpha", "beta" ou "release".'
    );
  }

  ensurePromptsAvailableOrExit("Canal não informado e prompt indisponível.");

  console.log("\nContexto atual:");
  console.log(`- Versão em package.json: ${context.currentVersion}`);
  console.log(`- Última tag v* no histórico: ${context.latestTag ?? "(nenhuma encontrada)"}`);

  return promptChoice("Selecione o canal de publicação:", [
    { label: "alpha", value: "alpha" },
    { label: "beta", value: "beta" },
    { label: "release (estável)", value: "release" },
  ]);
}

async function resolveTag({ channel, tagArg, currentVersion, flags }) {
  if (tagArg) {
    const validation = validateTagForChannel(tagArg, channel);
    if (!validation.ok) {
      throw new Error(`Tag inválida: ${validation.error}`);
    }
    return tagArg;
  }

  const suggestedTag = suggestTag(channel, currentVersion);

  if (flags.nonInteractive) {
    throw new Error(
      `No modo --non-interactive, informe também a tag. Sugestão para este caso: ${suggestedTag}`
    );
  }

  if (flags.yes) {
    console.log(`\nTag sugerida automaticamente: ${suggestedTag}`);
    return suggestedTag;
  }

  ensurePromptsAvailableOrExit("Tag não informada e prompt indisponível.");

  return promptInput("Tag para publicar", {
    defaultValue: suggestedTag,
    validate: (candidate) => {
      const validation = validateTagForChannel(candidate, channel);
      return validation.ok ? true : `Tag inválida: ${validation.error}`;
    },
  });
}

function printSummary({ channel, tag, currentVersion, latestTag, flags }) {
  console.log("\nResumo da publicação:");
  console.log(`- Canal: ${channel}`);
  console.log(`- Versão atual (package.json): ${currentVersion}`);
  console.log(`- Última tag v*: ${latestTag ?? "(nenhuma encontrada)"}`);
  console.log(`- Tag alvo: ${tag}`);

  if (flags.dryRun) {
    console.log("- Modo: dry-run");
  }
  if (flags.nonInteractive) {
    console.log("- Execução: non-interactive");
  }
}

async function confirmPlanOrExit(flags) {
  if (flags.yes) return;

  if (flags.nonInteractive) {
    throw new Error(
      "Confirmação obrigatória neste fluxo. Use --yes junto com --non-interactive para automação."
    );
  }

  ensurePromptsAvailableOrExit("Não foi possível abrir prompt de confirmação.");
  const accepted = await confirm("Confirma executar o release com os dados acima?", {
    defaultYes: false,
  });
  if (!accepted) {
    console.error("Operação cancelada.");
    process.exit(1);
  }
}

function buildReleaseInvocation({ channel, tag, flags }) {
  const parsed = parseTag(tag);
  if (!parsed) {
    throw new Error(
      'Tag inválida. Use: "vX.Y.Z", "vX.Y.Z-alpha.N" ou "vX.Y.Z-beta.N".'
    );
  }

  const args = ["scripts/release.mjs"];
  if (channel === "release") {
    args.push("stable", parsed.base);
  } else {
    args.push(channel, parsed.base, String(parsed.n));
  }

  if (flags.dryRun) args.push("--dry-run");
  if (flags.yes) args.push("--yes");
  if (flags.nonInteractive) args.push("--non-interactive");

  return args;
}

async function main() {
  const { channelArg, tagArg, flags } = parseCliArgs(process.argv.slice(2));

  const currentVersion = readRootVersion();
  const latestTag = tryReadLatestVTag();

  const channel = await resolveChannel(channelArg, { currentVersion, latestTag }, flags);
  const tag = await resolveTag({ channel, tagArg, currentVersion, flags });

  printSummary({ channel, tag, currentVersion, latestTag, flags });
  await confirmPlanOrExit(flags);

  const releaseArgs = buildReleaseInvocation({ channel, tag, flags });
  runReleaseScript(releaseArgs);
}

await main().catch((error) => {
  console.error(`\n❌ ${error?.message ?? error}`);
  process.exit(1);
});
