#!/usr/bin/env bash
# Executa o job de provisionamento de um (stage, repo) e publica em
# $GITHUB_OUTPUT `pins` (KEY=secret:versao,...) e `chaves`, para `--set-secrets`.
#
# Uso: provisionar_config.sh <stage> <repo>
# Ambiente: GCP_PROJECT, REGION.
#
# O valor de nenhum segredo passa por aqui. Quem le o banco do Snaps e decifra e
# o Cloud Run Job `snaps-cfg-<stage>-<repo>` (scripts/provisionar_config.py),
# dentro do GCP, com a imagem de PRODUCAO do snaps-api. Este script so EXECUTA o
# job — nao muda imagem nem argumento, e a conta que o roda nem tem permissao
# para isso — e le o MANIFESTO, que e metadado (anotacoes de
# `cfgmanifesto_<stage>_<repo>`, legiveis com `secretmanager.viewer`).
#
# COPIA IDENTICA de snaps-api/scripts/deploy/provisionar_config.sh. Mudou la, mude aqui.
set -euo pipefail

STAGE="${1:?stage}"
REPO="${2:?repo}"
: "${GCP_PROJECT:?}" "${REGION:?}"
JOB="snaps-cfg-${STAGE}-${REPO}"

echo "provisionando ${STAGE}/${REPO} (job ${JOB})"
EXECUCAO="$(gcloud run jobs execute "$JOB" \
  --region "$REGION" --project "$GCP_PROJECT" \
  --wait --format='value(metadata.name)')"
if [ -z "$EXECUCAO" ]; then
  echo "::error::o job ${JOB} nao devolveu o nome da execucao. Nada foi publicado."
  exit 1
fi

# O manifesto so vale se for DESTA execucao. Sem a conferencia, uma execucao que
# terminasse sem escrever deixaria o deploy publicar o manifesto de um run
# anterior, em silencio.
MANIFESTO="cfgmanifesto_${STAGE}_${REPO}"
descrever() {
  gcloud secrets describe "$MANIFESTO" --project "$GCP_PROJECT" --format="value(annotations.$1)"
}
LIDA="$(descrever execucao)"
if [ "$LIDA" != "$EXECUCAO" ]; then
  echo "::error::o manifesto ${MANIFESTO} e da execucao '${LIDA}', nao desta (${EXECUCAO}). Nada foi publicado."
  exit 1
fi

PINS="$(descrever pins)"
CHAVES="$(descrever chaves)"
if [ -z "$PINS" ]; then
  echo "::error::o manifesto ${MANIFESTO} esta vazio. Nada foi publicado."
  exit 1
fi
if [[ "$PINS" == *":latest"* ]]; then
  echo "::error::o manifesto ${MANIFESTO} tem versao 'latest'; revisao precisa de versao fixada."
  exit 1
fi

echo "chaves de ${STAGE}/${REPO}: ${CHAVES}"
{
  echo "pins=${PINS}"
  echo "chaves=${CHAVES}"
} >> "$GITHUB_OUTPUT"
