/**
 * Modelo da Zona Projeto: três grupos, ~9 destinos (card 850de8e0, PRD §3.3).
 *
 * A lateral oferecia 15 destinos para cerca de 8 de uso real. Este arquivo é a
 * fonte única do reagrupamento — a barra lateral, as entradas contextuais e o
 * teste de cobertura leem daqui, para que "nenhuma rota ficou órfã" seja uma
 * afirmação verificável e não um parágrafo de PR.
 *
 * A REGRA QUE EVITA QUEBRAR O PRODUTO: reagrupar não é apagar. As abas de
 * execução que recebem Plans, QA e Retro só chegam nas Sprints 24-25 (E21).
 * Até lá, todo destino que sai da lateral continua alcançável por URL e por
 * entrada contextual. Remover a rota antes de o substituto existir é o padrão
 * do "Add Snap" morto (C17): o clique é aceito e nada acontece.
 *
 * INTEGRAÇÃO B1+B2: o Hub de Settings (card 6ea66bc6) chegou na MESMA sprint,
 * então `/edit` e `/members` deixaram de ser destino e viraram redirect. Apontar
 * a navegação para o redirect funcionaria — e envelheceria calada, um salto
 * atrás do produto. Os caminhos aqui são os definitivos; os antigos seguem
 * respondendo no router para quem guardou o link.
 */
import {
  LayoutDashboard,
  Activity,
  Bot,
  Clock,
  Brain,
  MessageSquare,
  Settings,
  GitBranch,
  ClipboardList,
  FileText,
  ShieldCheck,
  RotateCcw,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Board } from '@/services/types';

export const PROJECT_NAV_GROUPS = ['TRABALHO', 'CONHECIMENTO', 'CONFIGURAÇÃO'] as const;
export type ProjectNavGroup = (typeof PROJECT_NAV_GROUPS)[number];

export interface ProjectNavItem {
  label: string;
  icon: LucideIcon;
  path: string;
}

export interface ProjectNavSection {
  group: ProjectNavGroup;
  items: ProjectNavItem[];
}

/**
 * Roadmap, Suporte e QA e Team Kanban do PRD §3.3 não são rotas novas: são os
 * boards reais do projeto, que já chegam da API. Por isso TRABALHO é montado
 * com a lista de boards, e não com destinos fixos inventados aqui.
 */
export function buildProjectNav(projectId: string, boards: Board[]): ProjectNavSection[] {
  return [
    {
      group: 'TRABALHO',
      items: [
        { label: 'Dashboard', icon: LayoutDashboard, path: `/project/${projectId}` },
        ...boards.map((board) => ({
          label: board.name,
          icon: Activity,
          path: `/project/${projectId}/board/${board.id}`,
        })),
        { label: 'AI Executions', icon: Bot, path: `/project/${projectId}/executions` },
        { label: 'Time', icon: Clock, path: `/project/${projectId}/time` },
      ],
    },
    {
      group: 'CONHECIMENTO',
      items: [
        { label: 'Memory', icon: Brain, path: `/project/${projectId}/docs` },
        { label: 'Chat', icon: MessageSquare, path: `/project/${projectId}/chat` },
      ],
    },
    {
      group: 'CONFIGURAÇÃO',
      items: [{ label: 'Settings', icon: Settings, path: `/project/${projectId}/settings/general` }],
    },
  ];
}

export interface ContextualDestination {
  label: string;
  icon: LucideIcon;
  path: string;
  /** Por que saiu da lateral e qual destino definitivo a substitui. */
  aguarda: string;
  /** Só aparece para quem tem direito (Members depende de view_members). */
  requerVerMembros?: boolean;
}

/**
 * Destinos que saíram da barra lateral e continuam vivos por entrada
 * contextual. Nenhum deles teve a rota removida nesta sprint.
 */
export function buildContextualDestinations(projectId: string): ContextualDestination[] {
  return [
    {
      label: 'Plans',
      icon: ClipboardList,
      path: `/project/${projectId}/plans`,
      aguarda: 'vira aba da execução em E21 (Sprints 24-25)',
    },
    {
      label: 'Suporte e QA',
      icon: ShieldCheck,
      path: `/project/${projectId}/qa`,
      aguarda: 'vira aba da execução em E21 (Sprints 24-25)',
    },
    {
      label: 'Retrospective',
      icon: RotateCcw,
      path: `/project/${projectId}/retro`,
      aguarda: 'vira aba da execução em E21 (Sprints 24-25)',
    },
    {
      label: 'Timeline',
      icon: GitBranch,
      path: `/project/${projectId}/timeline`,
      aguarda: 'vira faixa do Dashboard em E22 (Sprint 30.0)',
    },
    {
      label: 'Decisions',
      icon: FileText,
      path: `/project/${projectId}/decisions`,
      aguarda: 'já alcançável como aba de Memory (ADRs)',
    },
    {
      label: 'Members',
      icon: Users,
      path: `/project/${projectId}/settings/members`,
      aguarda: 'já é aba do Hub de Settings (card 6ea66bc6, entregue nesta sprint)',
      requerVerMembros: true,
    },
  ];
}
