# Plano 01: Acoes do painel

## Resumo

Simplificar os botoes do dashboard e transformar `Checar todos` em uma checagem agregada. O painel deixa de expor o botao tecnico `Scan`, mantem a acao manual de checagem e renomeia `Scan + enqueue` para `Checar e atualizar`.

## Mudancas principais

- Remover o botao `Scan` da barra de acoes em `ContainerTable`.
- Remover o fluxo `handleScanOnly` do hook de containers e a variante `scanOnly` do tipo `BusyState`.
- Manter o botao `Checar todos`, mas trocar sua implementacao para chamar uma vez `scanAndEnqueue(environmentId, "scan_only")`.
- Usar o retorno agregado de `scanAndEnqueue` para preencher o estado `checks` por container:
  - resultado com `hasUpdate=true`: status `done` com update disponivel.
  - resultado com `hasUpdate=false`: status `done` sem update.
  - resultado com `error`: status `error` com mensagem curta.
- Renomear o botao `Scan + enqueue` para `Checar e atualizar`, mantendo a chamada `scanAndEnqueue(environmentId, "scan_and_update")`.
- Ajustar os textos PT/EN/ES para remover termos tecnicos da UI principal, como `scan_only`, `scan_and_update` e `enqueue`.

## Interfaces e tipos

- Tipar o retorno frontend de `scanAndEnqueue` com `scanned`, `mode`, `queued` e `results`.
- Criar tipo frontend para cada item de `results`, aceitando tanto resultado OK quanto resultado com erro.
- Nao criar endpoint novo; reutilizar `POST /api/environments/:environmentId/updates/scan-and-enqueue`.

## Criterios de aceite

- O dashboard nao mostra mais o botao `Scan`.
- `Checar todos` faz uma unica chamada agregada para `scan-and-enqueue`.
- Depois de `Checar todos`, cada linha mostra o estado correto da checagem.
- A acao `Checar e atualizar` continua exigindo confirmacao antes de enfileirar updates.
- O usuario nao ve `scan_only`, `scan_and_update` ou `enqueue` no dashboard principal.

## Testes

- Build do frontend: `npm run build --workspace docksentinel-web`.
- Verificacao manual no painel:
  - clicar em `Checar todos`;
  - confirmar que so aparece um resumo;
  - confirmar que as linhas recebem os badges corretos;
  - confirmar que `Checar e atualizar` ainda abre confirmacao e inicia o fluxo de update.

## Assumptions

- A acao individual `Checar` em cada linha continua usando `update-check`.
- O scheduler nao muda neste plano.
- O endpoint legado individual `update-check` nao sera removido.

