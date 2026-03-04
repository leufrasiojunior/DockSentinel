#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPTS_SOURCE="$PROJECT_ROOT/scripts"

cleanup_dirs=()
cleanup_files=()
cleanup() {
  for dir in "${cleanup_dirs[@]:-}"; do
    rm -rf "$dir"
  done
  for file in "${cleanup_files[@]:-}"; do
    rm -f "$file"
  done
}
trap cleanup EXIT

create_temp_repo() {
  local version="${1:-0.2.0-beta.1}"
  local repo_dir
  repo_dir="$(mktemp -d /tmp/ds-release-tests-XXXXXX)"
  cleanup_dirs+=("$repo_dir")

  cp -r "$SCRIPTS_SOURCE" "$repo_dir/scripts"

  cat >"$repo_dir/package.json" <<JSON
{
  "name": "tmp-release-test",
  "private": true,
  "version": "$version"
}
JSON

  cat >"$repo_dir/package-lock.json" <<JSON
{
  "name": "tmp-release-test",
  "version": "$version",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "tmp-release-test",
      "version": "$version"
    }
  }
}
JSON

  (
    cd "$repo_dir"
    git init >/dev/null 2>&1
    git config user.email test@example.com
    git config user.name "Test User"
    git add .
    git commit -m "init" >/dev/null 2>&1
  )

  echo "$repo_dir"
}

assert_contains() {
  local file="$1"
  local pattern="$2"
  if ! grep -Eiq "$pattern" "$file"; then
    echo "Falha: não encontrou padrão '$pattern' em $file"
    echo "--- saída ---"
    cat "$file"
    echo "-------------"
    exit 1
  fi
}

assert_eq() {
  local actual="$1"
  local expected="$2"
  local message="$3"
  if [[ "$actual" != "$expected" ]]; then
    echo "Falha: $message"
    echo "Esperado: '$expected'"
    echo "Atual:    '$actual'"
    exit 1
  fi
}

run_capture() {
  local output_file="$1"
  shift
  set +e
  "$@" >"$output_file" 2>&1
  local status=$?
  set -e
  echo "$status"
}

new_log_file() {
  local file
  file="$(mktemp /tmp/ds-release-log-XXXXXX.log)"
  cleanup_files+=("$file")
  echo "$file"
}

echo "Running integration: publish sem args abre wizard e finaliza dry-run"
repo="$(create_temp_repo "0.5.0-beta.2")"
out="$(new_log_file)"
before_pkg="$(cat "$repo/package.json")"
status="$(
  cd "$repo" && run_capture "$out" bash -lc "printf '1\n' | DS_ALLOW_NON_TTY_PROMPTS=1 node scripts/publish.mjs --dry-run --yes"
)"
assert_eq "$status" "0" "wizard dry-run deveria finalizar com sucesso"
assert_contains "$out" "Selecione o canal de publicação"
assert_contains "$out" "Dry-run concluído"
after_pkg="$(cat "$repo/package.json")"
assert_eq "$after_pkg" "$before_pkg" "package.json não pode mudar em dry-run"

echo "Running integration: --non-interactive sem argumentos falha"
repo="$(create_temp_repo "0.2.0-beta.1")"
out="$(new_log_file)"
status="$(
  cd "$repo" && run_capture "$out" node scripts/publish.mjs --non-interactive --yes
)"
assert_eq "$status" "1" "--non-interactive sem args deveria falhar"
assert_contains "$out" "informe o canal explicitamente"

echo "Running integration: --dry-run não altera arquivos/git"
repo="$(create_temp_repo "0.3.0-alpha.1")"
out="$(new_log_file)"
before_pkg="$(cat "$repo/package.json")"
before_count="$(cd "$repo" && git rev-list --count HEAD)"
status="$(
  cd "$repo" && run_capture "$out" node scripts/publish.mjs alpha v0.3.0-alpha.2 --dry-run --yes --non-interactive
)"
assert_eq "$status" "0" "dry-run com argumentos completos deveria funcionar"
assert_contains "$out" "dry-run"
after_pkg="$(cat "$repo/package.json")"
assert_eq "$after_pkg" "$before_pkg" "package.json foi alterado em dry-run"
git_status="$(cd "$repo" && git status --porcelain)"
assert_eq "$git_status" "" "git status deveria permanecer limpo"
after_count="$(cd "$repo" && git rev-list --count HEAD)"
assert_eq "$after_count" "$before_count" "não deveria criar commit em dry-run"
tags="$(cd "$repo" && git tag --list v0.3.0-alpha.2)"
assert_eq "$tags" "" "não deveria criar tag em dry-run"

echo "Running integration: tag manual inválida falha"
repo="$(create_temp_repo "0.4.0-alpha.1")"
out="$(new_log_file)"
status="$(
  cd "$repo" && run_capture "$out" node scripts/publish.mjs alpha v0.4.0-beta.1 --non-interactive --yes
)"
assert_eq "$status" "1" "tag incompatível com canal deveria falhar"
assert_contains "$out" "Canal não bate com a tag"

echo "Running integration: release bloqueia repositório sujo"
repo="$(create_temp_repo "0.8.0-beta.1")"
out="$(new_log_file)"
printf "dirty\n" >"$repo/dirty.txt"
status="$(
  cd "$repo" && run_capture "$out" node scripts/publish.mjs alpha v0.8.0-alpha.1 --dry-run --non-interactive --yes
)"
assert_eq "$status" "1" "repositório sujo deveria bloquear release"
assert_contains "$out" "git não está limpo"

echo "Integration tests passed."
