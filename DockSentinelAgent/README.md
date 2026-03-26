# DockSentinelAgent

DockSentinelAgent e o runtime remoto do DockSentinel para controlar um Docker Engine em outro host.

## Requisitos

- Docker Engine acessivel pelo socket `/var/run/docker.sock`
- `DOCKSENTINEL_AGENT_TOKEN` gerado pela instancia principal do DockSentinel
- Porta padrao `45873`
- Diretorio persistente para o estado local do agent em `/var/lib/docksentinel-agent`

## Execucao manual

```bash
docker run -d \
  --name docksentinel-agent \
  --restart unless-stopped \
  -p 45873:45873 \
  -e PORT=45873 \
  -e DOCKSENTINEL_AGENT_TOKEN='SEU_TOKEN_AQUI' \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /opt/docksentinel-agent:/var/lib/docksentinel-agent \
  leufrasiojunior/docksentinel-agent:latest
```

## Desenvolvimento

```bash
npm install
npm run build
```

## Rotacao de token

- Quando o DockSentinel principal iniciar uma rotacao, o agent entra em `pending_rotation`.
- Abra `http://HOST:45873/setup`, cole o bootstrap token e volte ao app principal.
- O DockSentinel principal conclui a rotacao automaticamente quando o agent estiver pronto, mas tambem oferece o botao `Complete rotation`.
- Depois da rotacao, o agent passa a usar a credencial salva no estado local e deixa de depender do token antigo em `env`.

## Observacoes

- O agent nao possui banco nem auth de usuarios. A unica UI embutida e a pagina local de setup em `/setup`, exposta apenas enquanto o agent estiver sem pareamento ou com rotacao pendente.
- O startup faz um preflight e encerra com `exit 1` se detectar o DockSentinel principal no mesmo host.
- A API HTTP permanece em `/agent/v1/...` para manter compatibilidade com o servidor principal.
