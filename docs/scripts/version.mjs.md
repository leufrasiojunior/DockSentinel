# Script: `scripts/version.mjs`

## 1. Objetivo

Ler e imprimir a versao atual da raiz do monorepo (`package.json`).

## 2. Como e acionado

Na raiz:

```bash
npm run version:current
```

Ou direto:

```bash
node scripts/version.mjs
```

## 3. Fluxo interno

1. Monta caminho para `package.json` na pasta atual (`process.cwd()`).
2. Verifica se o arquivo existe.
   - se nao existir: imprime erro e sai com codigo `1`.
3. Le e faz parse JSON.
4. Busca campo `version`.
   - se nao existir: imprime erro e sai com codigo `1`.
5. Imprime o valor da versao em `stdout`.

## 4. Entradas e saida

Entradas:

- nenhuma flag/argumento.

Saida:

- string da versao, por exemplo `0.1.2-beta.2`.

## 5. Efeitos colaterais

- nenhum (apenas leitura).

## 6. Erros tratados

- `package.json` ausente na raiz.
- `package.json` sem campo `version`.

## 7. Casos de uso

- pipeline para obter versao atual e montar artefatos.
- validacao rapida local antes de release.

