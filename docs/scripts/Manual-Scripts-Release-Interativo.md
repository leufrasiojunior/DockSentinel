# DockSentinel - Manual dos Scripts de Release Interativo

Este manual descreve como usar os scripts de release atualizados em `scripts/publish.mjs` e `scripts/release.mjs`.

## 1. Objetivo

Com os scripts atuais voce consegue:

- publicar `alpha`, `beta` e `release` estavel;
- usar modo guiado interativo (wizard);
- executar `dry-run` sem mutar arquivos/git;
- rodar em CI com modo estrito (`--non-interactive`);
- exigir confirmacoes por etapa antes de mutacoes reais.

## 2. Scripts disponiveis na raiz

Definidos no `package.json`:

- `npm run publish`
- `npm run publish:alpha`
- `npm run publish:beta`
- `npm run publish:release`
- `npm run version:current`
- `npm run tag:latest`
- `npm run test:scripts`

## 3. Fluxo de release (resumo)

1. Voce executa `npm run publish -- ...`.
2. `scripts/publish.mjs` resolve canal/tag, valida e chama `scripts/release.mjs`.
3. `scripts/release.mjs` valida estado do git e monta o plano.
4. Em execucao real, ele:
   - atualiza `package.json` (e `package-lock.json` quando aplicavel),
   - cria commit `chore(release): vX.Y.Z...`,
   - cria tag anotada `vX.Y.Z...`,
   - faz push de `HEAD` e da tag para `origin`.
5. Se houver CI para tags `v*`, o pipeline de publicacao e disparado.

## 4. Uso do `publish` (entrada principal)

Sintaxe:

```bash
npm run publish -- [channel] [tag] [--dry-run] [--yes] [--non-interactive]
```

`channel` aceito:

- `alpha`
- `beta`
- `release`

`tag` esperada por canal:

- `alpha`: `vX.Y.Z-alpha.N`
- `beta`: `vX.Y.Z-beta.N`
- `release`: `vX.Y.Z`

Flags:

- `--dry-run`: simula tudo sem alterar arquivos, commit, tag ou push.
- `--yes`: pula confirmacoes interativas.
- `--non-interactive`: nao abre prompt e exige argumentos completos.

## 5. Modo interativo (wizard)

Quando usar:

- execute sem `channel`, ou
- execute sem `tag` (com `channel` informado e sem `--non-interactive`).

Comportamento:

1. Mostra contexto:
   - versao atual do `package.json`,
   - ultima tag `v*` alcancavel do `HEAD`.
2. Pergunta o canal (se faltou).
3. Sugere tag automaticamente (se faltou) e permite ajustar.
4. Mostra resumo final.
5. Pede confirmacao antes de chamar `release.mjs` (exceto com `--yes`).

Exemplo:

```bash
npm run publish --
```

Exemplo com simulacao:

```bash
npm run publish -- --dry-run
```

## 6. Modo nao interativo (CI/automacao)

Use quando nao houver terminal interativo.

Regra pratica:

- forneca `channel` e `tag`,
- use `--yes --non-interactive`.

Exemplos:

```bash
npm run publish -- alpha v0.2.0-alpha.3 --yes --non-interactive
npm run publish -- beta v0.2.0-beta.2 --yes --non-interactive
npm run publish -- release v0.2.0 --yes --non-interactive
```

Com simulacao em CI:

```bash
npm run publish -- release v0.2.0 --dry-run --yes --non-interactive
```

## 7. Uso direto do `release.mjs`

Normalmente voce nao precisa chamar esse script manualmente, mas ele continua disponivel:

```bash
node scripts/release.mjs alpha 1.2.0 1 [--dry-run] [--yes] [--non-interactive]
node scripts/release.mjs beta 1.2.0 1 [--dry-run] [--yes] [--non-interactive]
node scripts/release.mjs stable 1.2.0 [--dry-run] [--yes] [--non-interactive]
```

O script separa:

- construcao do plano de release;
- execucao por etapas.

Confirmacoes por etapa (sem `--yes`):

1. atualizar arquivos de versao;
2. criar commit e tag;
3. fazer push.

## 8. Regras de validacao importantes

`publish.mjs` valida:

- canal permitido (`alpha`, `beta`, `release`);
- formato da tag;
- compatibilidade entre canal e tag.

`release.mjs` valida:

- git limpo (`git status --porcelain` vazio);
- versao nova diferente da atual;
- tag local ainda nao existente;
- formato da versao base e de `N` para pre-release.

## 9. Dry-run: o que e simulado

Com `--dry-run`:

- mostra plano e comandos que seriam executados;
- nao altera `package.json` nem `package-lock.json`;
- nao cria commit;
- nao cria tag;
- nao faz push.

Importante:

- mesmo em `dry-run`, o script ainda exige repositorio limpo para manter o comportamento seguro e previsivel.

## 10. Comandos auxiliares

Versao atual da raiz:

```bash
npm run version:current
```

Ultima tag `v*` alcancavel do `HEAD`:

```bash
npm run tag:latest
```

Testes dos scripts:

```bash
npm run test:scripts
```

## 11. Troubleshooting

Erro: `Seu git nao esta limpo. Commit/stash antes de gerar release.`

- resolucao: commite/stasheie mudancas locais e tente novamente.

Erro: `No modo --non-interactive, informe o canal explicitamente...`

- resolucao: passe `channel` e `tag`.

Erro: confirmacao obrigatoria em `--non-interactive`

- resolucao: em automacao use `--yes --non-interactive`.

Erro de tag invalida

- resolucao:
  - alpha: `vX.Y.Z-alpha.N`
  - beta: `vX.Y.Z-beta.N`
  - release: `vX.Y.Z`

Erro: versao repetida

- resolucao: informe uma nova versao/tag.

## 12. Boas praticas recomendadas

Antes de publicar:

1. garantir branch correta;
2. garantir `git status` limpo;
3. executar primeiro com `--dry-run`;
4. validar resumo do plano;
5. executar release real.

Exemplo recomendado:

```bash
npm run publish -- beta --dry-run
npm run publish -- beta
```
