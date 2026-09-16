/**
 * Abas de Memory do projeto (card 850de8e0).
 *
 * `Decisions` saiu da barra lateral e passa a ser alcançável como aba dentro de
 * Memory — é a entrada contextual que garante que a tela não ficou órfã.
 *
 * Só entram as abas que já têm tela: Documentos e ADRs. O hub completo de
 * Memory (com Snaps) é E22 / Sprint 30.0; criar a aba agora seria um destino
 * que aceita o clique sem ter para onde levar (C17).
 */
import { useNavigate, useLocation } from 'react-router-dom';
import { FolderOpen, FileText } from 'lucide-react';

export function MemoryTabs({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const abas = [
    { label: 'Documents', icon: FolderOpen, path: `/project/${projectId}/docs` },
    { label: 'ADRs', icon: FileText, path: `/project/${projectId}/decisions` },
  ];

  return (
    <nav aria-label="Project memory" className="flex items-center gap-2">
      {abas.map((aba) => {
        const ativa = pathname === aba.path;

        return (
          <button
            key={aba.path}
            onClick={() => navigate(aba.path)}
            aria-current={ativa ? 'page' : undefined}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all ${
              ativa ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
            style={ativa ? undefined : { color: 'var(--snaps-text-secondary)' }}
          >
            <aba.icon className="w-4 h-4" />
            <span>{aba.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
