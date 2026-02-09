# DockSentinel - Manual de Uso (Scripts e Workflows)

Este manual descreve como usar os scripts da pasta `scripts/` e como funcionam os workflows em `.github/workflows/`.

## 1. Visao geral

Fluxo principal de release/publicacao:

1. Voce executa `npm run publish -- <canal> [tag]`.
2. O script `scripts/publish.mjs` valida o canal e decide a tag.
3. Ele chama `scripts/release.mjs`, que:
   - atualiza versao no `package.json` da raiz (e `package-lock.json`, se existir),
   - cria commit de release,
   - cria tag git anotada,
   - faz push de commit e tag.
4. O push da tag `v*` dispara `.github/workflows/docker-publish.yml`.
5. O workflow builda e publica imagem Docker no Docker Hub.

## 2. Scripts disponiveis

Definidos no `package.json` da raiz:

- `npm run publish`
- `npm run publish:alpha`
- `npm run publish:beta`
- `npm run publish:release`
- `npm run version:current`
- `npm run tag:latest`

## 3. Como usar (comandos)

### 3.1 Publicar alpha

Automatico (sugere proxima tag):

```bash
npm run publish -- alpha
```

Informando tag manual:

```bash
npm run publish -- alpha v0.2.0-alpha.1
```

### 3.2 Publicar beta

Automatico:

```bash
npm run publish -- beta
```

Manual:

```bash
npm run publish -- beta v0.2.0-beta.1
```

### 3.3 Publicar release estavel

Automatico (usa a base da versao atual):

```bash
npm run publish -- release
```

Manual:

```bash
npm run publish -- release v0.2.0
```

### 3.4 Consultar versao atual

```bash
npm run version:current
```

Le o `version` do `package.json` da raiz e imprime no terminal.

### 3.5 Consultar ultima tag v* alcancavel do HEAD

```bash
npm run tag:latest
```

Retorna a tag mais recente no historico atual.

## 4. Como os scripts funcionam internamente

### 4.1 `scripts/publish.mjs`

Responsabilidades:

- aceita canal: `alpha`, `beta` ou `release`;
- opcionalmente recebe uma tag manual;
- se nao vier tag, gera sugestao com base no `package.json` da raiz;
- valida formato da tag;
- chama `scripts/release.mjs` com os argumentos corretos.

Regra de sugestao automatica:

- versao atual `X.Y.Z-alpha.N` + canal `alpha` => sugere `vX.Y.Z-alpha.(N+1)`;
- versao atual `X.Y.Z-beta.N` + canal `beta` => sugere `vX.Y.Z-beta.(N+1)`;
- troca de canal (ex.: estava beta e pediu alpha) => comeca em `.1`;
- canal `release` => sugere `vX.Y.Z` (sem sufixo).

### 4.2 `scripts/release.mjs`

Responsabilidades:

- exige repositorio git limpo (`git status --porcelain` sem saida);
- faz `git fetch --all --tags`;
- monta versao final:
  - `alpha`: `X.Y.Z-alpha.N`
  - `beta`: `X.Y.Z-beta.N`
  - `stable`: `X.Y.Z`
- atualiza versao no `package.json` da raiz;
- tenta atualizar `package-lock.json` (campos `version` e `packages[""].version`);
- cria commit `chore(release): v...`;
- cria tag anotada `v...`;
- faz push de `HEAD` e da tag para `origin`.

Falhas comuns que ele bloqueia:

- git com alteracoes pendentes;
- versao repetida;
- parametros invalidos para canal/tag.

### 4.3 `scripts/version.mjs`

- Le `package.json` na raiz.
- Exibe o campo `version`.
- Falha se o arquivo nao existir ou nao tiver `version`.

### 4.4 `scripts/tag-latest.mjs`

- Executa `git describe --tags --match "v*" --abbrev=0`.
- Retorna a ultima tag `v*` encontrada a partir do `HEAD`.
- Falha se nao existir tag `v*` no historico atual.

## 5. Workflows de GitHub Actions

## 5.1 `.github/workflows/docker-publish.yml`

Nome do workflow: `Publish Docker (tags only)`.

Disparo:

- `push` de tags `v*`.

O que faz:

1. Checkout do codigo.
2. Configura QEMU e Buildx.
3. Login no Docker Hub usando:
   - `DOCKERHUB_USERNAME`
   - `DOCKERHUB_TOKEN`
4. Gera tags Docker via `docker/metadata-action`:
   - `{{version}}`
   - `{{major}}.{{minor}}`
   - `{{major}}`
   - `sha-<curto>`
5. Adiciona tag de canal extra:
   - `latest` para `vX.Y.Z`
   - `alpha` para `vX.Y.Z-alpha.N`
   - `beta` para `vX.Y.Z-beta.N`
6. Build e push multi-arquitetura:
   - `linux/amd64`
   - `linux/arm64`

Observacao:

- O job usa `environment: ci-ds`. Garanta que os secrets existam nesse Environment (ou ajuste o workflow para usar secrets do repositorio).

## 5.2 `.github/workflows/release-please.yml`

Nome do workflow: `Release Please`.

Disparo:

- push na branch `main`;
- execucao manual (`workflow_dispatch`).

O que faz:

- roda `googleapis/release-please-action@v4` com:
  - `release-type: node`
  - `target-branch: main`

Uso pratico:

- automatizar PR de release/changelog para versoes estaveis no fluxo baseado em Conventional Commits.

## 6. Fluxos recomendados

### 6.1 Alpha/Beta manual

1. Garanta branch correta e git limpo.
2. Execute:
   - `npm run publish -- alpha` ou
   - `npm run publish -- beta`
3. Acompanhe o workflow `Publish Docker (tags only)` no GitHub Actions.
4. Verifique imagem no Docker Hub.

### 6.2 Stable manual

1. Garanta branch `main` e git limpo.
2. Execute `npm run publish -- release`.
3. Valide a imagem com tag `latest` e a tag semver.

### 6.3 Stable com Release Please

1. Mantenha commits padronizados na `main`.
2. Deixe o workflow `Release Please` abrir/atualizar PR de release.
3. Ao publicar a tag estavel `vX.Y.Z`, o workflow de Docker dispara automaticamente.

## 7. Checklist rapido antes de publicar

- `package.json` da raiz possui campo `version`.
- Repositorio sem mudancas locais (`git status` limpo).
- Remoto `origin` configurado e com permissao de push.
- Secrets de Docker Hub configurados no GitHub.
- Nome de usuario do Docker Hub sem espacos/quebras.

## 8. Troubleshooting

Erro: `Seu git nao esta limpo. Commit/stash antes de gerar release.`

- Resolucao: commitar ou stashear alteracoes antes do `npm run publish`.

Erro: tag invalida (formato incorreto)

- Resolucao:
  - alpha: `vX.Y.Z-alpha.N`
  - beta: `vX.Y.Z-beta.N`
  - release: `vX.Y.Z`

Erro no Docker login (workflow)

- Resolucao: revisar `DOCKERHUB_USERNAME` e `DOCKERHUB_TOKEN` no ambiente `ci-ds`.

Erro: `package.json nao encontrado na raiz` ou sem `version`

- Resolucao: executar comandos na raiz do repo e garantir campo `version`.
