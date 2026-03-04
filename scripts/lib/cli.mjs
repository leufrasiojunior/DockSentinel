#!/usr/bin/env node
import fs from "node:fs";
import readline from "node:readline";

const NON_TTY_PROMPTS_ENV = "DS_ALLOW_NON_TTY_PROMPTS";
let pipedAnswers = null;
let pipedAnswerIndex = 0;

export function isPromptSupported() {
  if (process.env[NON_TTY_PROMPTS_ENV] === "1") return true;
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

function askRaw(question) {
  if (!process.stdin.isTTY) {
    if (pipedAnswers === null) {
      const raw = fs.readFileSync(0, "utf-8");
      pipedAnswers = raw.split(/\r?\n/);
      if (pipedAnswers.length > 0 && pipedAnswers[pipedAnswers.length - 1] === "") {
        pipedAnswers.pop();
      }
      pipedAnswerIndex = 0;
    }

    process.stdout.write(question);
    if (pipedAnswerIndex >= pipedAnswers.length) return Promise.resolve(null);

    const answer = pipedAnswers[pipedAnswerIndex];
    pipedAnswerIndex += 1;
    return Promise.resolve(answer);
  }

  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      rl.close();
      resolve(value);
    };

    rl.on("close", () => {
      if (!settled) {
        settled = true;
        resolve("");
      }
    });

    rl.question(question, (answer) => {
      finish(answer);
    });
  });
}

export async function promptChoice(question, options) {
  if (!Array.isArray(options) || options.length === 0) {
    throw new Error("promptChoice precisa de pelo menos uma opcao.");
  }

  console.log(`\n${question}`);
  for (let i = 0; i < options.length; i += 1) {
    console.log(`  ${i + 1}) ${options[i].label}`);
  }

  while (true) {
    const rawAnswer = await askRaw(`Escolha uma opcao [1-${options.length}]: `);
    if (rawAnswer === null) {
      throw new Error("Entrada encerrada durante a seleção de opção.");
    }
    const raw = rawAnswer.trim();
    const n = Number(raw);
    if (Number.isInteger(n) && n >= 1 && n <= options.length) {
      return options[n - 1].value;
    }
    console.error(`Valor invalido: "${raw}".`);
  }
}

export async function promptInput(question, { defaultValue = "", validate } = {}) {
  while (true) {
    const suffix = defaultValue ? ` (${defaultValue})` : "";
    const rawAnswer = await askRaw(`${question}${suffix}: `);
    if (rawAnswer === null) {
      throw new Error("Entrada encerrada durante o preenchimento do campo.");
    }
    const raw = rawAnswer.trim();
    const value = raw || defaultValue;

    if (!value) {
      console.error("Valor obrigatorio.");
      continue;
    }

    if (typeof validate === "function") {
      const validation = validate(value);
      if (validation !== true) {
        const message =
          typeof validation === "string" ? validation : "Valor invalido.";
        console.error(message);
        continue;
      }
    }

    return value;
  }
}

export async function confirm(question, { defaultYes = false } = {}) {
  const suffix = defaultYes ? " [S/n]" : " [s/N]";

  while (true) {
    const rawAnswer = await askRaw(`${question}${suffix}: `);
    if (rawAnswer === null) {
      throw new Error("Entrada encerrada durante confirmação.");
    }
    const raw = rawAnswer.trim().toLowerCase();

    if (!raw) return defaultYes;
    if (raw === "s" || raw === "sim" || raw === "y" || raw === "yes") return true;
    if (raw === "n" || raw === "nao" || raw === "não" || raw === "no") return false;

    console.error('Resposta invalida. Use "s" ou "n".');
  }
}

export function ensurePromptsAvailableOrExit(contextMessage) {
  if (isPromptSupported()) return;
  console.error(
    `${contextMessage}\nUse --non-interactive com argumentos completos ou rode em terminal interativo.`
  );
  process.exit(1);
}
