# Como usar os scripts

Este guia resume como usar os scripts da raiz do projeto e quando cada comando deve entrar no seu fluxo.

## 1. Objetivo da pasta `scripts`

Os scripts existem para cobrir quatro necessidades principais:

- subir o ambiente local de desenvolvimento;
- consultar a versao atual do projeto;
- consultar a ultima tag `v*` disponivel no historico atual;
- publicar prereleases e releases estaveis.

Os utilitarios internos em `scripts/lib/` e os testes em `scripts/tests/` apoiam esses fluxos, mas normalmente nao precisam ser executados diretamente.

## 2. Quando usar cada comando

Os comandos disponiveis na raiz sao estes:

```bash
npm run dev
npm run publish
npm run publish:alpha
npm run publish:beta
npm run publish:release
npm run version:current
npm run tag:latest
npm run test:scripts
```

Uso pratico de cada um:

- `npm run dev`: sobe a API e o frontend web em paralelo.
- `npm run publish`: entrada principal para publicar via wizard ou informando canal e tag.
- `npm run publish:alpha`: atalho para prerelease `alpha`.
- `npm run publish:beta`: atalho para prerelease `beta`.
- `npm run publish:release`: fluxo manual de release estavel, usado como contingencia.
- `npm run version:current`: mostra o campo `version` do `package.json` da raiz.
- `npm run tag:latest`: mostra a ultima tag `v*` alcancavel a partir do `HEAD`.
- `npm run test:scripts`: roda os testes unitarios e de integracao dos scripts.

## 3. Fluxo de desenvolvimento local

Para subir o ambiente local:

```bash
npm run dev
```

Esse comando executa `scripts/dev-all.sh` e sobe:

- a API no workspace `api`;
- o frontend no workspace `docksentinel-web`.

Use esse fluxo quando quiser trabalhar localmente no projeto completo.

## 4. Fluxo de release e publicacao

### 4.1 Canais disponiveis

- `alpha`: prerelease inicial ou mais experimental.
- `beta`: prerelease mais proxima da versao estavel.
- `stable`: release estavel final.

No fluxo manual, as tags esperadas sao:

- `alpha`: `vX.Y.Z-alpha.N`
- `beta`: `vX.Y.Z-beta.N`
- `release`: `vX.Y.Z`

### 4.2 Alpha e beta

Para publicar uma prerelease, use o `publish`:

```bash
npm run publish -- alpha
npm run publish -- beta
```

Se voce nao informar a tag e estiver em modo interativo, o script sugere uma tag com base na versao atual do `package.json`.

Tambem e possivel informar a tag manualmente:

```bash
npm run publish -- alpha v2.1.0-alpha.1
npm run publish -- beta v2.1.0-beta.1
```

Quando a tag `v*` e enviada para o remoto, o workflow `docker-publish` entra em acao.

### 4.3 Stable oficial com `release-please`

O fluxo oficial de versao estavel e este:

1. Trabalhe normalmente na `develop`.
2. Faca o merge de `develop` para `main`.
3. O workflow `Release Please` roda no push da `main`.
4. Ele abre ou atualiza a PR de release estavel.
5. Ao fazer merge dessa PR, a tag estavel `vX.Y.Z` e criada.
6. O workflow `docker-publish` publica a imagem a partir dessa tag.

Se precisar forcar uma versao especifica, rode o workflow `Release Please` manualmente com o campo `release_as`, por exemplo:

- `2.0.1`
- `2.1.0`
- `2.5.0`

### 4.4 Stable manual como contingencia

O fluxo manual ainda existe, mas nao deve ser o caminho padrao da stable:

```bash
npm run publish -- release
```

Ou com tag explicita:

```bash
npm run publish -- release v2.1.0
```

Use esse caminho apenas quando voce realmente precisar gerar commit e tag manualmente fora do fluxo oficial do `release-please`.

### 4.5 Exemplos uteis

Wizard interativo:

```bash
npm run publish --
```

Simulacao sem mutar arquivos ou Git:

```bash
npm run publish -- beta v2.1.0-beta.1 --dry-run --yes --non-interactive
```

Retry da mesma tag para redisparar a publicacao:

```bash
npm run publish -- beta v2.1.0-beta.1 --keep-tag --yes --non-interactive
```

## 5. Comandos auxiliares

Consultar a versao atual:

```bash
npm run version:current
```

Consultar a ultima tag `v*` alcancavel:

```bash
npm run tag:latest
```

Esses dois comandos ajudam principalmente antes de uma publicacao ou para conferir o estado da linha de versao atual.

## 6. Testes dos scripts

Para validar os scripts:

```bash
npm run test:scripts
```

Esse comando cobre dois niveis:

- testes unitarios das regras de versao e validacao de tags;
- testes de integracao dos fluxos principais de `publish` e `release`.

Use esse comando depois de alterar scripts de release, validacao de tags ou comportamento do wizard.

## 7. Regras e cuidados

- Execute os comandos na raiz do repositorio.
- Garanta que o Git esteja limpo antes de publicar.
- `--dry-run` simula o fluxo sem alterar arquivos, commits, tags ou push.
- `--yes` pula confirmacoes interativas.
- `--non-interactive` exige argumentos completos e e indicado para automacao.
- `--keep-tag` reaproveita a mesma versao/tag para retry da publicacao.
- O `package.json` sozinho nao define a proxima stable do `release-please`.
- A stable oficial segue o fluxo da `main` com `release-please` e, quando necessario, `release_as`.

## 8. Troubleshooting rapido

Erro: `Seu git nao esta limpo. Commit/stash antes de gerar release.`

Resolucao: commite ou faca stash das alteracoes antes de rodar `publish`.

Erro: tag invalida

Resolucao: use o formato correto para o canal.

- `alpha`: `vX.Y.Z-alpha.N`
- `beta`: `vX.Y.Z-beta.N`
- `release`: `vX.Y.Z`

Erro: `Nenhuma tag v* encontrada no historico atual.`

Resolucao: confirme se voce esta na branch correta e se existe alguma tag `v*` alcancavel a partir do `HEAD`.

Erro: o merge em `main` abriu uma versao diferente da que voce esperava

Resolucao: confira o fluxo do `release-please` e, se precisar forcar uma versao especifica, use `workflow_dispatch` com `release_as`.
