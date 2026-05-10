# Roadmap: Dashboard, notificacoes e emails

## Objetivo

Reduzir ruido operacional no painel do DockSentinel e tornar as comunicacoes de update mais claras.

Decisoes ja fechadas:

- Remover o botao `Scan` do painel principal.
- Manter `Checar todos` como acao principal de checagem em massa.
- Fazer `Checar todos` gerar um resumo unico, nao uma notificacao/email por container.
- Renomear `Scan + enqueue` para `Checar e atualizar`.
- Melhorar emails para serem operacionais e amigaveis, sem JSON tecnico.
- Dar mais destaque visual a containers com update disponivel.

## Planos

1. [Plano 01 - Acoes do painel](./PLAN-01-dashboard-actions.md)
2. [Plano 02 - Notificacoes agrupadas](./PLAN-02-grouped-notifications.md)
3. [Plano 03 - Emails operacionais](./PLAN-03-operational-emails.md)
4. [Plano 04 - Polimento visual](./PLAN-04-dashboard-visual-polish.md)

## Ordem recomendada

1. Implementar o Plano 01 primeiro, porque ele muda o fluxo que hoje causa a chuva de notificacoes.
2. Implementar o Plano 02 em seguida, para garantir que backend e notificacoes fiquem alinhados.
3. Implementar o Plano 03 depois, usando o payload agregado criado/ajustado no Plano 02.
4. Implementar o Plano 04 por ultimo, quando os estados de checagem ja estiverem consolidados.

## Validacao geral

- `npm run test --workspace api -- notifications.service.spec.ts`
- `npm run build --workspace api`
- `npm run build --workspace docksentinel-web`

