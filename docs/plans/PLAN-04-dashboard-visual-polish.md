# Plano 04: Polimento visual do dashboard

## Resumo

Melhorar a leitura visual do estado de update no painel, principalmente para containers com update disponivel e containers em atualizacao.

## Mudancas principais

- Dar mais destaque ao badge `Atualizacao disponivel`:
  - usar icone pequeno de alerta/update;
  - reforcar cor amber;
  - aplicar borda ou fundo leve na celula de update.
- Melhorar a linha enquanto um container esta atualizando:
  - manter spinner e texto `Atualizando...` no botao;
  - aplicar estado visual discreto na linha ou celula para indicar processamento.
- Depois de `Checar todos`, mostrar um unico toast de resumo:
  - `X containers checados`;
  - `Y com atualizacao`;
  - `Z com erro`.
- Evitar toasts por container em acoes de massa.
- Manter mensagens de erro por linha quando um container especifico falhar.

## UI esperada

- Estados de badge:
  - `Nao checado`: neutro.
  - `Checando`: azul com spinner ou indicacao clara.
  - `Atualizacao disponivel`: amber destacado.
  - `Atualizado`: verde.
  - `Erro`: vermelho com causa curta logo abaixo.
  - `Auto update off`: neutro/vermelho discreto conforme padrao atual.
- A tabela deve continuar densa e operacional, sem cards internos ou layout de landing page.

## Criterios de aceite

- O estado `Atualizacao disponivel` chama mais atencao que `Nao checado` e `Atualizado`.
- O estado `Atualizando...` continua claro e nao causa deslocamento visual relevante.
- `Checar todos` mostra um unico toast agregado.
- Textos cabem nos botoes e badges em larguras menores.

## Testes

- Build do frontend: `npm run build --workspace docksentinel-web`.
- Verificacao visual manual:
  - container com update disponivel;
  - container sem update;
  - container em atualizacao;
  - container com erro de checagem;
  - tela em largura desktop e mobile.

## Assumptions

- Usar os componentes existentes `Badge`, `Button`, `Table` e icones `lucide-react`.
- Nao alterar a estrutura principal da tabela neste plano.
- Nao criar dependencia visual nova.

