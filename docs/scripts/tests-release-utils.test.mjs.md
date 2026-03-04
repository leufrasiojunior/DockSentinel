# Script: `scripts/tests/release-utils.test.mjs`

## 1. Objetivo

Validar unitariamente as regras puras de versao/tag de `scripts/lib/release-utils.mjs`.

Esse arquivo cobre parse, sugestao de tag e validacao de compatibilidade canal/tag.

## 2. Como e acionado

Via:

```bash
npm run test:scripts
```

Trecho relevante:

```bash
node --test scripts/tests/release-utils.test.mjs
```

## 3. Framework utilizado

- `node:test`
- `node:assert/strict`

## 4. Testes existentes

### 4.1 `parseVersion`

- aceita stable `1.2.3`
- aceita prerelease:
  - `1.2.3-alpha.7`
  - `9.8.1-beta.2`
- rejeita formatos invalidos:
  - `1.2`
  - `1.2.3-rc.1`
  - `v1.2.3`

### 4.2 `suggestTag`

- incrementa mesmo canal:
  - alpha: `...alpha.2 -> ...alpha.3`
  - beta: `...beta.9 -> ...beta.10`
- troca de canal reinicia em `.1`
- para `release`, remove sufixo prerelease:
  - `1.2.3-alpha.4 -> v1.2.3`

### 4.3 `validateTagForChannel`

- cenarios positivos:
  - `release` com `vX.Y.Z`
  - `alpha` com `vX.Y.Z-alpha.N`
  - `beta` com `vX.Y.Z-beta.N`
- cenarios negativos:
  - mismatch de canal (`alpha` + tag `beta`)
  - formato invalido (`1.2.3` sem `v`)

## 5. Beneficio desse teste

- protege regra central de versionamento;
- reduz chance de regressao em sugestao/validacao de tags;
- acelera refactor de `publish.mjs` e `release.mjs`.

## 6. Efeitos colaterais

- nenhum no filesystem/Git (testes puramente funcionais).

