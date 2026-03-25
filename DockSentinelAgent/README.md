# DockSentinelAgent

DockSentinelAgent e o runtime remoto do DockSentinel para controlar um Docker Engine em outro host.

## Requisitos

- Docker Engine acessivel pelo socket `/var/run/docker.sock`
- `DOCKSENTINEL_AGENT_TOKEN` gerado pela instancia principal do DockSentinel
- Porta padrao `45873`

## Execucao manual

```bash
docker run -d \
  --name docksentinel-agent \
  --restart unless-stopped \
  -p 45873:45873 \
  -e PORT=45873 \
  -e DOCKSENTINEL_AGENT_TOKEN='SEU_TOKEN_AQUI' \
  -v /var/run/docker.sock:/var/run/docker.sock \
  leufrasiojunior/docksentinel-agent:latest
```

## Desenvolvimento

```bash
npm install
npm run build
```

## Observacoes

- O agent nao possui UI, banco ou auth de usuarios.
- O startup faz um preflight e encerra com `exit 1` se detectar o DockSentinel principal no mesmo host.
- A API HTTP permanece em `/agent/v1/...` para manter compatibilidade com o servidor principal.
