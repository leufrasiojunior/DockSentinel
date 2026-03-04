# Script: `scripts/tag-latest.mjs`

## 1. Objetivo

Retornar a ultima tag Git no padrao `v*` alcancavel a partir do `HEAD`.

## 2. Como e acionado

Na raiz:

```bash
npm run tag:latest
```

Ou direto:

```bash
node scripts/tag-latest.mjs
```

## 3. Fluxo interno

1. Define helper `shOut(cmd)`:
   - executa comando shell com `execSync`.
   - retorna texto trimado.
   - em erro, retorna string vazia.
2. Executa:

```bash
git describe --tags --match "v*" --abbrev=0
```

3. Se nao houver resultado:
   - imprime erro `Nenhuma tag v* encontrada...`
   - encerra com codigo `1`.
4. Se houver:
   - imprime tag encontrada.

## 4. Entradas e saida

Entradas:

- nenhuma flag/argumento.

Saida:

- tag como `v0.1.2-beta.2`.

## 5. Efeitos colaterais

- nenhum no repositorio.

## 6. Dependencias

- Git instalado.
- repositorio com historico de tags `v*`.

## 7. Pontos de atencao

- O resultado e a tag mais proxima no historico alcancavel do commit atual, nao necessariamente a maior semver global do repo.

