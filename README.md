# DockSentinel

<p align="center">
  <img src="apps/docksentinel-web/src/assets/logo.png" alt="DockSentinel logo" width="180" />
</p>

<p align="center">
  <strong>Monitoramento e atualizacao inteligente de containers Docker</strong>
</p>

## O que e o DockSentinel?

DockSentinel e um painel web para monitorar updates de containers Docker e executar atualizacoes com controle, seguranca e rastreabilidade.

Ele foi pensado para ambientes self-hosted e homelab onde voce precisa:

- identificar quais containers possuem nova imagem;
- decidir quando atualizar;
- executar atualizacao individual ou em lote;
- acompanhar fila e historico de jobs.

## Instalacao com Docker Compose (Docker Hub)

### Imagens disponiveis

- `docker pull leufrasiojunior/docksentinel:latest`
- `docker pull leufrasiojunior/docksentinel:beta`

### 1. Crie o `docker-compose.yml`

```yaml
services:
  docksentinel:
    image: leufrasiojunior/docksentinel:latest
    # image: leufrasiojunior/docksentinel:beta
    container_name: docksentinel
    restart: unless-stopped
    ports:
      - "8080:80"
      - "3000:3000"
    environment:
      PORT: "3000"
      LOG_LEVEL: "info"
      DATABASE_URL: "file:/data/docksentinel.db"
      DOCKSENTINEL_SECRET: "CHANGE_ME_CHANGE_ME_CHANGE_ME_32CHARS_MIN"
      AUTO_MIGRATE: "true"
      SWAGGER_ENABLED: "true"
      CORS_ORIGINS: "*"
      TZ: "America/Sao_Paulo"
    volumes:
      - docksentinel_data:/data
      - /var/run/docker.sock:/var/run/docker.sock

volumes:
  docksentinel_data:
```

### 2. Suba o DockSentinel

Versao `latest` (padrao):

```bash
docker compose pull
docker compose up -d
```

Versao `beta`:

```bash
DOCKSENTINEL_TAG=beta docker compose pull
DOCKSENTINEL_TAG=beta docker compose up -d
```

### 3. Acesse a aplicacao

- UI: `http://localhost:8080`
- API docs (opcional): `http://localhost:3000/docs`

## Como usar

Depois de subir o container:

1. Acesse `http://localhost:8080`.
2. Abra o Dashboard para listar os containers do host.
3. Rode a checagem de updates (manual ou automatica).
4. Atualize containers individualmente ou em lote.
5. Ajuste modo de autenticacao e scheduler em Settings.

Se `SWAGGER_ENABLED=true`, a API fica disponivel em `http://localhost:3000/docs`.

## Atualizacao da aplicacao

Para atualizar a imagem e recriar o container:

```bash
docker compose pull
docker compose up -d
```

## Observacoes importantes

- Troque `DOCKSENTINEL_SECRET` por um valor forte (minimo 32 caracteres). Para gerar automaticamente, voce pode usar: `https://www.random.org/passwords/`.
- O mount `/var/run/docker.sock` e obrigatorio para o DockSentinel inspecionar e atualizar containers do host.
- O banco SQLite fica persistido no volume `docksentinel_data`.
