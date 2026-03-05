# Script: `scripts/release.mjs`

## 1. Objetivo

Executar o release de forma segura e controlada:

- validar pre-condicoes,
- atualizar versao em arquivos,
- criar commit e tag,
- fazer push para `origin`.

Tambem suporta modo de simulacao (`--dry-run`).

## 2. Como e acionado

Normalmente via `publish.mjs`, mas pode ser chamado direto:

```bash
node scripts/release.mjs alpha 1.2.0 1 [--dry-run] [--yes] [--non-interactive] [--keep-tag]
node scripts/release.mjs beta 1.2.0 1 [--dry-run] [--yes] [--non-interactive] [--keep-tag]
node scripts/release.mjs stable 1.2.0 [--dry-run] [--yes] [--non-interactive] [--keep-tag]
```

## 3. Argumentos e flags

Posicionais:

- `channel`: `alpha`, `beta` ou `stable`
- `base`: versao semver base `X.Y.Z`
- `n`: obrigatorio para `alpha` e `beta`, proibido para `stable`

Flags:

- `--dry-run`: mostra tudo sem executar mutacoes.
- `--yes`: pula confirmacoes por etapa.
- `--non-interactive`: impede prompts; se sem `--yes`, aborta quando precisar confirmar.
- `--keep-tag`: permite retry usando a mesma versao/tag (recria e faz push forcado da tag).

## 4. Dependencias internas

Importa:

- `confirm` e `ensurePromptsAvailableOrExit` de `./lib/cli.mjs`
- funcoes de versao/json de `./lib/release-utils.mjs`

## 5. Arquitetura interna

O script esta dividido em duas fases:

1. Planejamento (`buildReleasePlan`)
2. Execucao (`applyVersionFiles`, `runCommitAndTag`, `runPush`)

Isso melhora legibilidade e facilita `dry-run`.

## 6. Fluxo detalhado

1. Parse de argumentos e flags (`parseCliArgs`).
2. Validacao estrutural de entrada:
   - quantidade de argumentos;
   - canal permitido;
   - obrigatoriedade de `n` para pre-release;
   - semver base valida.
3. Valida estado do Git (`requireCleanGit`):
   - usa `git status --porcelain`;
   - se houver pendencias, aborta mostrando preview.
4. Construcao do plano (`buildReleasePlan`):
   - calcula `version` final com `buildVersion`;
   - monta `tag` (`v<version>`);
   - le `package.json` e valida versao atual;
   - garante que nova versao seja diferente da atual (exceto com `--keep-tag`);
   - inspeciona `package-lock.json`.
5. Verifica se tag ja existe localmente (`tagExists`).
6. Imprime resumo do plano (`printPlanSummary`).
7. Confirmacao por etapa (`confirmStepOrExit`):
   - etapa 1: atualizacao de arquivos;
   - etapa 2: commit + tag;
   - etapa 3: push.
8. Executa etapas:
   - `applyVersionFiles`
   - `runCommitAndTag`
   - `runPush`
9. Finaliza com mensagem de sucesso (ou `Dry-run concluido`).

Fluxo alternativo com `--keep-tag` (mesma versao/tag):

1. nao atualiza arquivos nem cria commit;
2. recria tag anotada local;
3. faz push forcado da tag para `origin` para disparar a Action novamente.

## 7. Comandos Git executados (modo real)

1. `git fetch --all --tags`
2. `git add "<arquivos tocados>"`
3. `git commit -m "chore(release): v..."`
4. `git tag -a "v..." -m "Release v..."`
5. `git push origin HEAD`
6. `git push origin "v..."`

No modo `--dry-run`, esses comandos sao apenas impressos.

No fluxo `--keep-tag`, os comandos principais ficam:

1. `git fetch --all --tags`
2. `git tag -f -a "v..." -m "Retry release v..."`
3. `git push origin "refs/tags/v..." --force`

## 8. Atualizacao de arquivos de versao

Sempre tenta atualizar:

- `package.json` raiz (`version`)

`package-lock.json`:

- se nao existir: ignora;
- se existir e for valido: atualiza `version` e `packages[""].version`;
- se parse falhar: loga warning e continua sem mexer no lock.

## 9. Validacoes importantes

- repositorio precisa estar limpo;
- nova versao nao pode repetir versao atual (a menos de `--keep-tag`);
- tag local nao pode existir em release normal (com `--keep-tag`, e reutilizada);
- `n` precisa ser inteiro >= 1 para `alpha/beta`;
- `stable` nao aceita `n`.

## 10. Comportamento de confirmacao

Sem `--yes`:

- pergunta antes de cada etapa mutavel;
- Enter confirma por padrao (`sim`).

Com `--non-interactive`:

- nao abre prompt;
- se precisar confirmar e `--yes` nao foi passado, aborta.

## 11. Efeitos colaterais

Em modo real:

- altera arquivos versionados;
- cria commit e tag locais;
- envia commit/tag para remoto.

Em `--dry-run`:

- nenhum efeito colateral em arquivo/Git.

## 12. Erros comuns

- Git sujo (`Commit/stash antes de gerar release`)
- versao repetida
- tag ja existente localmente
- canal/argumentos invalidos
- lockfile invalido (nao bloqueia release, mas nao atualiza lock)

Para repetir uma tag apos falha de Action:

- use `--keep-tag --yes --non-interactive`.
