# Plano 03: Emails operacionais

## Resumo

Melhorar emails de notificacao para serem uteis para operacao diaria. O email deve mostrar um resumo amigavel dos nomes das imagens escaneadas, quais tem update e quais falharam, sem detalhes tecnicos brutos.

## Mudancas principais

- Reescrever o template HTML em `NotificationsService.renderTemplate`.
- Remover do email:
  - bloco `Detalhes tecnicos`;
  - JSON bruto do payload;
  - campos tecnicos como `type`, `level` e `mode`.
- Mostrar no email:
  - titulo da notificacao;
  - mensagem resumida;
  - total de imagens escaneadas;
  - lista curta de imagens escaneadas;
  - lista de containers/imagens com update disponivel;
  - lista de falhas com nome do container e causa curta, quando existir.
- Ajustar assunto do email para usar o titulo da notificacao, por exemplo:
  - `DockSentinel - Checagem concluida`
  - `DockSentinel - Checagem concluida com falhas`
- Escapar valores dinamicos inseridos no HTML para evitar HTML injection em nomes de containers, imagens ou mensagens de erro.

## Comportamento por tipo

- `scan_info`:
  - email com resumo de checagem e updates encontrados.
- `scan_error`:
  - email com resumo de checagem e uma secao `Falhas` com causas curtas.
- `job_success`:
  - email simples informando container atualizado.
- `job_failed` e `system_error`:
  - email com causa curta no corpo, sem stack trace e sem payload bruto.

## Criterios de aceite

- O email nao contem `Detalhes tecnicos`.
- O email nao contem JSON serializado do payload.
- O email mostra nomes de containers/imagens de forma legivel.
- Em caso de erro, o email explica a causa curta.
- Conteudo dinamico do email e escapado antes de entrar no HTML.

## Testes

- Atualizar `notifications.service.spec.ts` para validar o HTML enviado por `mail.send`.
- Casos obrigatorios:
  - scan com imagens escaneadas;
  - scan com updates;
  - scan com falhas;
  - ausencia de JSON tecnico no HTML.
- Rodar: `npm run test --workspace api -- notifications.service.spec.ts`.
- Rodar build da API: `npm run build --workspace api`.

## Assumptions

- O destinatario continua usando a configuracao atual de SMTP.
- Nao sera criado editor visual de template neste plano.
- Listas longas podem continuar truncadas para evitar emails excessivos.

