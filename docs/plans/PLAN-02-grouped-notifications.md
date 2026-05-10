# Plano 02: Notificacoes agrupadas

## Resumo

Evitar chuva de notificacoes quando o usuario executa uma checagem em massa. A checagem agregada deve gerar uma unica notificacao in-app e, quando email estiver ativo, no maximo um email.

## Mudancas principais

- Usar o fluxo agregado `scanAndEnqueue(..., "scan_only")` como fonte de notificacao para `Checar todos`.
- Manter notificacoes individuais apenas para a acao individual `Checar` por container.
- Atualizar os textos de notificacao para linguagem de produto:
  - sucesso: `Checagem concluida`.
  - erro parcial: `Checagem concluida com falhas`.
  - fluxo com update: `Checagem e atualizacao iniciadas`.
- Remover `mode` tecnico dos titulos e mensagens visiveis.
- Manter `mode` apenas no `payload/meta`, para diagnostico interno.
- Enriquecer o payload agregado com:
  - `scannedImages`: lista de containers/imagens escaneadas.
  - `updateCandidates`: lista de containers/imagens com update.
  - `errorSummaries`: lista curta com `{ container, message }` para falhas.

## Comportamento esperado

- Se todos os containers forem checados sem erro:
  - criar uma notificacao `scan_info`.
  - mensagem deve citar total escaneado e total com update.
- Se alguns containers falharem:
  - criar uma notificacao `scan_error`.
  - mensagem deve citar total escaneado, total com update e total com falha.
  - a causa curta deve estar disponivel no payload para email e telas futuras.
- Se nenhum container tiver update:
  - ainda criar resumo unico, desde que notificacoes `info` estejam habilitadas.

## Criterios de aceite

- `Checar todos` nao cria uma notificacao por container.
- O centro de notificacoes recebe um unico item para uma checagem em massa.
- O texto visivel nao mostra `manual_check`, `scan_only`, `scan_and_update` ou payload tecnico.
- Falhas mostram uma causa curta, suficiente para o usuario entender o problema inicial.

## Testes

- Atualizar/criar teste unitario de `NotificationsService` para:
  - `emitScanInfo` com payload agregado.
  - `emitScanError` com `errorSummaries`.
  - `notificationLevel="errors_only"` ignorando `scan_info`.
- Rodar: `npm run test --workspace api -- notifications.service.spec.ts`.
- Rodar build da API: `npm run build --workspace api`.

## Assumptions

- Nao sera criada nova tabela nem migracao.
- O payload JSON atual da notificacao e suficiente para guardar os campos extras.
- Historico antigo pode continuar com textos tecnicos; a mudanca vale para novas notificacoes.

