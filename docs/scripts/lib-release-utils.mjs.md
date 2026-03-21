# Script: `scripts/lib/release-utils.mjs`

## 1. Objetivo

Centralizar funcoes reutilizaveis de release:

- leitura/escrita JSON
- parse de versao e tag
- validacao de semver base e canais
- sugestao de tag automatica
- leitura da ultima tag `v*` do Git

## 2. Quem usa

- `scripts/publish.mjs`
- `scripts/release.mjs`
- testes em `scripts/tests/release-utils.test.mjs`

## 3. API exportada

### 3.1 Funcoes de arquivo

- `readJson(filePath)`: le e parseia JSON.
- `writeJson(filePath, data)`: grava JSON formatado com identacao 2.
- `getRootPackagePath(rootDir?)`: caminho do `package.json` raiz.
- `readRootVersion(rootDir?)`: le `version` da raiz com validacao.

### 3.2 Parse e validacao

- `parseVersion(v)`:
  - aceita `X.Y.Z`
  - aceita `X.Y.Z-alpha.N`
  - aceita `X.Y.Z-beta.N`
  - retorna `null` em formato invalido
- `parseTag(tag)`:
  - aceita `vX.Y.Z`
  - aceita `vX.Y.Z-alpha.N`
  - aceita `vX.Y.Z-beta.N`
- `isValidBaseVersion(base)`:
  - regex `^\d+\.\d+\.\d+$`
- `buildVersion(channel, base, n)`:
  - `stable/release` => `X.Y.Z`
  - `alpha/beta` => `X.Y.Z-channel.N`
  - valida formato e `n >= 1`

### 3.3 Regras de negocio de release

- `suggestTag(channel, currentVersion)`:
  - para `release`: retorna `v<base>`
  - para `alpha/beta`:
    - se canal atual igual: incrementa `N`
    - senao: comeca em `.1`
- `validateTagForChannel(tag, channel)`:
  - verifica formato
  - verifica se canal da tag bate com canal pedido
  - retorna objeto:
    - sucesso: `{ ok: true, parsed }`
    - falha: `{ ok: false, error }`

### 3.4 Integracao com Git

- `tryReadLatestVTag()`:
  - roda `git describe --tags --match "v*" --abbrev=0`
  - retorna tag ou `null`
  - nao lanca erro para o chamador.

## 4. Regras de formato suportadas

Versao:

- `1.2.3`
- `1.2.3-alpha.1`
- `1.2.3-beta.9`

Tag:

- `v1.2.3`
- `v1.2.3-alpha.1`
- `v1.2.3-beta.9`

Nao suportado no momento:

- `rc`
- metadados de build (`+meta`)
- prefixos diferentes de `v`

## 5. Beneficios dessa separacao

- reduz duplicacao entre `publish` e `release`;
- concentra regras de semver/tag em um ponto;
- simplifica testes unitarios;
- facilita evolucao futura (ex.: canal `rc`).

## 6. Efeitos colaterais

- `readJson`/`writeJson` alteram arquivos quando chamados.
- `tryReadLatestVTag` executa comando Git de leitura.

