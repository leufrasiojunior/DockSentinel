# DockSentinel Agent

O `docksentinel-agent` permite que a instancia principal do DockSentinel controle um Docker remoto por meio de `Environments`.

## Porta padrao

- `45873`

## Instalacao rapida

Use o comando gerado na tela `Environments` do DockSentinel principal. Exemplo:

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

## Exemplo com Docker Compose

```yaml
services:
  docksentinel-agent:
    image: leufrasiojunior/docksentinel-agent:latest
    container_name: docksentinel-agent
    restart: unless-stopped
    ports:
      - "45873:45873"
    environment:
      PORT: "45873"
      DOCKSENTINEL_AGENT_TOKEN: "SEU_TOKEN_AQUI"
      TZ: "America/Sao_Paulo"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

## Regras importantes

- Cada agente controla um unico Docker Engine.
- O token do agente deve ser gerado pela UI do DockSentinel principal.
- O agente nao possui UI, banco, scheduler proprio ou autenticacao de usuario.
- Toda a operacao continua centralizada no DockSentinel principal.

## Validacao de conflito no host

O agente verifica o Docker local antes de subir a API.

Se ele detectar uma instalacao do DockSentinel principal no mesmo host:

- registra um erro claro nos logs do container;
- informa nome, imagem e id curto do container em conflito;
- encerra o processo com `exit 1`.

Isso evita instalar o agente acidentalmente no mesmo host do servidor principal.
