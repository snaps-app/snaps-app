#!/usr/bin/env bash
# Verifica o deployment exato com a autenticacao existente da Vercel.
set -euo pipefail
: "${URL:?URL do deployment obrigatoria}"
: "${VERCEL_TOKEN:?Autenticacao da Vercel obrigatoria}"
ALVO=$([ "$STAGE" = production ] && echo production || echo preview)
API="$(sed -n 's/^VITE_API_URL="\(.*\)"$/\1/p' ".vercel/.env.${ALVO}.local")"
[ -n "$API" ] || { echo "::error::VITE_API_URL ausente."; exit 1; }
CHECK_DIR="$(mktemp -d)"
trap 'rm -rf -- "$CHECK_DIR"' EXIT
request() {
  npx --yes vercel@63.1.0 curl "$1" --token="$VERCEL_TOKEN" -- \
    --silent --show-error --output "$2" --write-out "%{http_code}" --max-time 30
}
for ATTEMPT in 1 2 3 4 5 6; do
  COD="$(request "$URL" "$CHECK_DIR/index.html" || true)"
  if [ "$COD" = "200" ]; then
    mapfile -t ASSETS < <(grep -oE '/assets/[^"]+\.js' "$CHECK_DIR/index.html" | sort -u)
    for JS in "${ASSETS[@]}"; do
      ASSET_COD="$(request "${URL}${JS}" "$CHECK_DIR/bundle.js" || true)"
      if [ "$ASSET_COD" = "200" ] && grep -qF -- "$API" "$CHECK_DIR/bundle.js"; then
        echo "O bundle do deployment aponta para a API do ambiente."
        exit 0
      fi
    done
  fi
  echo "::notice::Verificacao $ATTEMPT/6 ainda sem bundle valido (HTTP ${COD:-indisponivel})."
  [ "$ATTEMPT" = "6" ] || sleep 10
done
echo "::error::Deployment indisponivel ou bundle sem a VITE_API_URL do project_config."
exit 1
