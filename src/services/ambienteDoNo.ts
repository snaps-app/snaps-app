/**
 * Aba Ambiente (P20): o que o nó RECEBEU de ambiente, só leitura.
 *
 * `GET /api/agent-executions/{id}/ambiente` nunca devolve valor de
 * configuração: member vê nomes e tipos; viewer, só as contagens. Escrita de
 * config pelo Cockpit é da 25.0 (P22, SNA-RD-202).
 */
import { api } from './client';

export interface RepoDoAmbiente {
    repo: string;
    base_branch: string | null;
    base_branch_declarada: boolean;
    origem_base_branch: string;
    setup_command: string | null;
    test_command: string | null;
    build_command: string | null;
    primario: boolean;
}

export interface VariavelDoAmbiente {
    chave: string;
    repo: string | null;
    tipo: string;
    mudou_no_projeto_depois: boolean;
}

export interface AmbienteDoNo {
    ambiente: { id: string; nome: string; stage: string } | null;
    motivo_vazio: string | null;
    fotografado_em: string | null;
    foto_cifrada: boolean;
    repos: RepoDoAmbiente[];
    variaveis: { total: number; mudaram_no_projeto_depois: number | null; itens: VariavelDoAmbiente[] };
    /** Nulo para viewer: são nomes de variável, como `variaveis.itens`. */
    required_env: { exigidas: string[]; faltando: string[] } | null;
    credenciais: { disponivel: boolean; motivo: string };
}

export const getAmbienteDoNo = async (executionId: string): Promise<AmbienteDoNo> => {
    const response = await api.get(`/api/agent-executions/${executionId}/ambiente`);
    return response.data;
};

export interface AlertaDeAmbiente {
    tipo: 'branch_nao_declarada' | 'valor_mudou' | 'env_faltando';
    texto: string;
}

/** Alertas da aba: branch canônica não declarada, valor que mudou depois da foto, env faltando. */
export function alertasDoAmbiente(ambiente: AmbienteDoNo): AlertaDeAmbiente[] {
    const alertas: AlertaDeAmbiente[] = ambiente.repos
        .filter((r) => !r.base_branch_declarada)
        .map((r) => ({
            tipo: 'branch_nao_declarada' as const,
            texto: `${r.repo}: branch canônica não declarada (origin/HEAD)`,
        }));
    const mudaram = ambiente.variaveis.mudaram_no_projeto_depois ?? 0;
    if (mudaram > 0) {
        alertas.push({
            tipo: 'valor_mudou',
            texto: `${mudaram} variável(is) mudou(aram) no projeto depois da foto`,
        });
    }
    const faltando = ambiente.required_env?.faltando ?? [];
    if (faltando.length > 0) {
        alertas.push({
            tipo: 'env_faltando',
            texto: `Exigidas pela fase e ausentes: ${faltando.join(', ')}`,
        });
    }
    return alertas;
}
