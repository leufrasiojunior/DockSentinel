# Script: `scripts/publish.mjs`

## 1. Objetivo

Orquestrar a publicacao de release de forma amigavel:

- resolve `channel` e `tag`,
- valida formato e compatibilidade,
- oferece modo interativo (wizard),
- delega a execucao real para `scripts/release.mjs`.

## 2. Como e acionado

Via scripts da raiz:

```bash
npm run publish -- [channel] [tag] [--dry-run] [--yes] [--non-interactive]
npm run publish:alpha
npm run publish:beta
npm run publish:release
```

## 3. Contrato de entrada

`channel` permitido:

- `alpha`
- `beta`
- `release`

`tag` esperada por canal:

- alpha: `vX.Y.Z-alpha.N`
- beta: `vX.Y.Z-beta.N`
- release: `vX.Y.Z`

Flags:

- `--dry-run`: repassa simulacao para `release.mjs`.
- `--yes`: pula confirmacao final no `publish` (e tambem no `release` quando repassado).
- `--non-interactive`: bloqueia prompts; exige argumentos completos.

## 4. Dependencias internas

Importa:

- `./lib/cli.mjs`
  - `confirm`
  - `ensurePromptsAvailableOrExit`
  - `promptChoice`
  - `promptInput`
- `./lib/release-utils.mjs`
  - `parseTag`
  - `readRootVersion`
  - `suggestTag`
  - `tryReadLatestVTag`
  - `validateTagForChannel`

## 5. Fluxo completo

1. Parse de argumentos (`parseCliArgs`)
   - separa flags e posicionais;
   - bloqueia flag desconhecida;
   - permite no maximo 2 posicionais (`channel` e `tag`).
2. Le contexto atual:
   - versao da raiz (`readRootVersion`);
   - ultima tag `v*` (`tryReadLatestVTag`).
3. Resolve canal (`resolveChannel`)
   - se veio argumento: valida contra lista permitida;
   - se faltou e `--non-interactive`: erro;
   - se faltou e modo interativo: exibe menu e pede escolha.
4. Resolve tag (`resolveTag`)
   - se veio argumento: valida compatibilidade canal/tag;
   - se nao veio: gera sugestao com `suggestTag`;
   - em `--non-interactive`: exige tag explicita e aborta;
   - em interativo: pergunta tag (com default sugerido + validacao em loop).
5. Imprime resumo da operacao (`printSummary`).
6. Pede confirmacao final (`confirmPlanOrExit`)
   - pulada com `--yes`;
   - em `--non-interactive` sem `--yes`, aborta para evitar operacao sem confirmacao.
7. Monta comando para `release.mjs` (`buildReleaseInvocation`)
   - `release` vira `stable` no script de release.
8. Executa `release.mjs` via `execFileSync`.

## 6. Regras de sugestao automatica de tag

Baseado em `package.json` da raiz:

- `release`: sugere `vX.Y.Z`
- `alpha`:
  - se versao atual ja for `alpha.N`, incrementa para `alpha.(N+1)`
  - senao, comeca em `alpha.1`
- `beta`:
  - se versao atual ja for `beta.N`, incrementa para `beta.(N+1)`
  - senao, comeca em `beta.1`

## 7. Modo interativo vs nao interativo

Interativo:

- pode omitir canal e/ou tag;
- abre wizard e confirma antes de continuar.

Nao interativo (`--non-interactive`):

- nao pode omitir canal/tag;
- recomendado usar junto com `--yes` para automacao CI.

## 8. Erros e bloqueios comuns

- canal invalido;
- tag em formato errado;
- canal e tag divergentes (`alpha` com tag `beta`, por exemplo);
- falta de canal/tag com `--non-interactive`;
- prompt indisponivel sem fallback valido.

## 9. Efeitos colaterais

Diretamente:

- nenhum no Git/arquivos (o script e orquestrador).

Indiretamente:

- aciona `release.mjs`, que pode mutar arquivos e Git.

## 10. Exemplos

Interativo (wizard):

```bash
npm run publish --
```

Com canal e tag explicitos:

```bash
npm run publish -- beta v0.2.0-beta.1
```

CI com simulacao:

```bash
npm run publish -- release v0.2.0 --dry-run --yes --non-interactive
```

