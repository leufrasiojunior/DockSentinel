# Script: `scripts/dev-all.sh`

## 1. Objetivo

Subir os dois servicos principais de desenvolvimento em paralelo:

- `api` (workspace `api`)
- frontend web (workspace `docksentinel-web`)

O script tambem gerencia encerramento para evitar processos orfaos.

## 2. Como e acionado

Na raiz do projeto:

```bash
npm run dev
```

Esse comando chama:

```bash
bash scripts/dev-all.sh
```

## 3. Dependencias e pre-requisitos

- `npm` instalado
- workspaces com nomes:
  - `api`
  - `docksentinel-web`
- scripts existentes:
  - `start:dev` em `apps/api/package.json`
  - `dev` em `apps/docksentinel-web/package.json`

## 4. Fluxo interno passo a passo

1. Ativa modo estrito:
   - `set -e`: encerra no primeiro comando com erro
   - `set -u`: falha ao usar variavel nao definida
   - `set -o pipefail`: falha se qualquer comando de pipe falhar
2. Define funcao `cleanup()`:
   - captura codigo de saida atual (`$?`)
   - remove os `trap` para evitar recursao
   - mata `API_PID` e `WEB_PID` se existirem
   - faz `wait` para colher termino dos filhos
   - sai com o mesmo codigo original
3. Registra `cleanup` para `INT`, `TERM` e `EXIT`.
4. Inicia API em background:
   - `npm run start:dev --workspace api &`
   - salva PID em `API_PID`.
5. Aguarda 10 segundos (`sleep 10`).
6. Inicia web em background:
   - `npm run dev --workspace docksentinel-web &`
   - salva PID em `WEB_PID`.
7. Executa `wait -n "$API_PID" "$WEB_PID"`:
   - o script fica bloqueado ate um dos dois processos terminar.

## 5. Comportamento de encerramento

- Se voce pressionar `Ctrl+C`, `cleanup` e executado.
- Se um dos servicos cair, `wait -n` retorna e o script sai.
- Na saida, o `trap EXIT` chama `cleanup` e tenta finalizar o outro servico.

## 6. Saida e efeitos colaterais

- Nao altera arquivos do repositorio.
- Apenas sobe processos de dev.
- Efeito colateral esperado: ocupacao de portas locais usadas por API e frontend.

## 7. Limitacoes e pontos de atencao

- Usa `sleep 10` fixo para esperar API; nao verifica healthcheck real.
- Se API levar mais de 10s para ficar pronta, a web pode subir antes do ideal.
- Shebang com `-X` (`#!/usr/bin/env bash -X`) habilita trace no shell; pode gerar log verboso dependendo do ambiente.

## 8. Exemplos de uso

Subir stack de desenvolvimento:

```bash
npm run dev
```

Parar tudo:

- `Ctrl+C` no terminal onde o script esta rodando.

