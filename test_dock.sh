#!/usr/bin/env bash
set -euo pipefail

# ==========================================================
# DockSentinel - Teste manual (Jeito 1): trocar imagem "na mão"
#
# Objetivo:
# 1) Rodar um container com uma versão ANTIGA (ex: nginx:1.24)
# 2) (Opcional) Chamar a API (containers, details, recreate-plan, update-check)
# 3) (Opcional) Recriar o container com nginx:latest via API
# 4) (Opcional) Chamar update-check novamente e validar que agora está "atual"
#
# Se você escolher "N", ele NÃO chama a API e apenas imprime os comandos curl.
# Mantém logs detalhados (debug).
# ==========================================================

# ---------- Config ----------
API_BASE="${API_BASE:-http://localhost:3000}"
CONTAINER_NAME="${CONTAINER_NAME:-poc-nginx}"
HOST_PORT="${HOST_PORT:-8080}"

# "Jeito 1": começa com uma tag bem diferente/antiga
OLD_IMAGE="${OLD_IMAGE:-nginx:1.24}"
NEW_IMAGE="${NEW_IMAGE:-nginx:latest}"

# ---------- Helpers ----------
log()  { echo -e "==> $*"; }
dbg()  { echo -e "    [debug] $*"; }
hr()   { echo "------------------------------------------------------------"; }

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "Faltando comando: $1"; exit 1; }
}

http_get() {
  local path="$1"
  dbg "GET  ${API_BASE}${path}"
  curl -sS "${API_BASE}${path}"
}

http_post_json() {
  local path="$1"
  local json="$2"
  dbg "POST ${API_BASE}${path}"
  dbg "Body: ${json}"
  curl -sS -X POST "${API_BASE}${path}" -H "Content-Type: application/json" -d "${json}"
}

print_api_commands() {
  cat <<EOF

==================== COMANDOS (API) ====================
# 1) Listar containers
curl -s "${API_BASE}/docker/containers" | jq

# 2) Detalhes do container
curl -s "${API_BASE}/docker/containers/${CONTAINER_NAME}" | jq

# 3) Plano de recreate
curl -s "${API_BASE}/docker/containers/${CONTAINER_NAME}/recreate-plan" | jq

# 4) Checar update (digest)
curl -s "${API_BASE}/docker/containers/${CONTAINER_NAME}/update-check" | jq

# 5) Recriar usando imagem nova (${NEW_IMAGE})
curl -s -X POST "${API_BASE}/docker/containers/${CONTAINER_NAME}/recreate" \\
  -H "Content-Type: application/json" \\
  -d '{"image":"${NEW_IMAGE}"}' | jq

# 6) Checar update de novo
curl -s "${API_BASE}/docker/containers/${CONTAINER_NAME}/update-check" | jq
========================================================

EOF
}

ask_yes_no() {
  local prompt="$1"
  local default="${2:-Y}" # Y/N
  local answer=""

  if [[ "${default}" == "Y" ]]; then
    read -r -p "${prompt} [Y/n]: " answer || true
    answer="${answer:-Y}"
  else
    read -r -p "${prompt} [y/N]: " answer || true
    answer="${answer:-N}"
  fi

  case "${answer}" in
    Y|y|YES|yes) return 0 ;;
    *) return 1 ;;
  esac
}

# ---------- Preflight ----------
need docker
need curl
need jq

log "Config:"
dbg "API_BASE=${API_BASE}"
dbg "CONTAINER_NAME=${CONTAINER_NAME}"
dbg "HOST_PORT=${HOST_PORT}"
dbg "OLD_IMAGE=${OLD_IMAGE}"
dbg "NEW_IMAGE=${NEW_IMAGE}"
hr

# ==========================================================
# [1] Limpeza e preparo do container com imagem antiga
# ==========================================================
log "[1/6] Limpando container antigo (se existir): ${CONTAINER_NAME}"
docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true

log "[2/6] Pull da imagem antiga: ${OLD_IMAGE}"
docker pull "${OLD_IMAGE}" >/dev/null

OLD_ID="$(docker image inspect "${OLD_IMAGE}" --format '{{.Id}}')"
dbg "Imagem antiga ${OLD_IMAGE} -> ${OLD_ID}"

log "[3/6] Subindo container ${CONTAINER_NAME} com ${OLD_IMAGE} em ${HOST_PORT}:80"
docker run -d --name "${CONTAINER_NAME}" -p "${HOST_PORT}:80" "${OLD_IMAGE}" >/dev/null
sleep 1

CONTAINER_IMAGE_LINE="$(docker inspect -f '{{.Config.Image}}  {{.Image}}' "${CONTAINER_NAME}")"
dbg "Container agora: ${CONTAINER_IMAGE_LINE}"
hr

# ==========================================================
# [2] Escolha: rodar chamadas na API ou só imprimir comandos
# ==========================================================
if ask_yes_no "Quer rodar agora os testes via API (curl) automaticamente?" "Y"; then
  log "[4/6] Chamadas da API ANTES do update (debug)"
  log "-> GET /docker/containers"
  http_get "/docker/containers" | jq || true
  hr

  log "-> GET /docker/containers/${CONTAINER_NAME}"
  http_get "/docker/containers/${CONTAINER_NAME}" | jq || true
  hr

  log "-> GET /docker/containers/${CONTAINER_NAME}/recreate-plan"
  http_get "/docker/containers/${CONTAINER_NAME}/recreate-plan" | jq || true
  hr

  log "-> GET /docker/containers/${CONTAINER_NAME}/update-check"
  http_get "/docker/containers/${CONTAINER_NAME}/update-check" | jq || true
  hr

  log "[5/6] Recriando via API com imagem NOVA: ${NEW_IMAGE}"
  RECREATE_PAYLOAD="$(jq -n --arg image "${NEW_IMAGE}" '{image:$image}')"
  http_post_json "/docker/containers/${CONTAINER_NAME}/recreate" "${RECREATE_PAYLOAD}" | jq || true
  hr

  log "Aguardando 2s para o container estabilizar..."
  sleep 2

  log "[6/6] Chamadas da API DEPOIS do recreate"
  log "-> GET /docker/containers/${CONTAINER_NAME}"
  http_get "/docker/containers/${CONTAINER_NAME}" | jq || true
  hr

  log "-> GET /docker/containers/${CONTAINER_NAME}/update-check"
  http_get "/docker/containers/${CONTAINER_NAME}/update-check" | jq || true
  hr
else
  log "OK — não vou chamar a API agora. Seguem os comandos para você rodar manualmente:"
  print_api_commands
fi

# ==========================================================
# Debug final local (docker)
# ==========================================================
log "Debug local (docker) para confirmar"
NEW_ID="$(docker image inspect "${NEW_IMAGE}" --format '{{.Id}}' 2>/dev/null || true)"
dbg "Imagem nova ${NEW_IMAGE} -> ${NEW_ID:-<nao-inspecionavel>}"

CONTAINER_IMAGE_LINE2="$(docker inspect -f '{{.Config.Image}}  {{.Image}}' "${CONTAINER_NAME}" 2>/dev/null || true)"
dbg "Container final: ${CONTAINER_IMAGE_LINE2:-<nao-inspecionavel>}"

echo
echo "==================== RESUMO ===================="
echo "Container: ${CONTAINER_NAME}"
echo "Antes: ${OLD_IMAGE} -> ${OLD_ID}"
echo "Depois: ${NEW_IMAGE} -> ${NEW_ID:-<ver acima>}"
echo
echo "Se você escolheu rodar a API, já validou o fluxo fim-a-fim."
echo "Se escolheu não, use os comandos impressos para testar manualmente."
echo "================================================"
echo
