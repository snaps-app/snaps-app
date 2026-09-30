"""Monta o `.vercel/.env.<alvo>.local` a partir do manifesto do project_config.

Roda no workflow de deploy, depois de `vercel pull` e antes de `vercel build`.
O arquivo que o `pull` escreveu e SUBSTITUIDO, nao completado: o que a Vercel
ainda tiver como env var nao entra no build. A fonte e o project_config do
projeto Snaps (repo `snaps-app`), provisionado no Secret Manager.

Ambiente: `STAGE`, `PINS` (KEY=secret:versao,...), `GCP_PROJECT`.

As `VITE_*` entram no bundle em tempo de build, entao sao publicas por natureza
— e so por isso o runner le o valor delas. Chave sem prefixo `VITE_` e ignorada
(o Vite nao a poria no bundle) e nomeada no log, para ninguem achar que chegou.
"""
import os
import subprocess
import sys

OBRIGATORIAS = ("VITE_API_URL", "VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "VITE_AGENT_URL")


def escapar(valor: str) -> str:
    return (valor.replace("\\", "\\\\").replace('"', '\\"')
                 .replace("\n", "\\n").replace("\r", "\\r"))


def main() -> int:
    stage = os.environ["STAGE"]
    alvo = "production" if stage == "production" else "preview"
    arquivo = f".vercel/.env.{alvo}.local"

    linhas = []
    for par in os.environ["PINS"].split(","):
        chave, ref = par.split("=", 1)
        if not chave.startswith("VITE_"):
            print(f"::warning::{chave} esta no project_config do snaps-app mas nao "
                  f"comeca com VITE_; o build nao a usa.")
            continue
        secret, versao = ref.rsplit(":", 1)
        valor = subprocess.run(
            ["gcloud", "secrets", "versions", "access", versao, "--secret", secret,
             "--project", os.environ["GCP_PROJECT"]],
            check=True, capture_output=True, text=True).stdout
        linhas.append(f'{chave}="{escapar(valor)}"')

    with open(arquivo, "w", encoding="utf-8") as f:
        f.write("\n".join(linhas) + "\n")

    presentes = {linha.split("=", 1)[0] for linha in linhas}
    print(f"build de {alvo} com: {' '.join(sorted(presentes))}")
    faltando = [v for v in OBRIGATORIAS if v not in presentes]
    if faltando:
        print(f"::error::o project_config do snaps-app (stage {stage}) nao tem "
              f"{', '.join(faltando)}. Nada foi publicado.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
