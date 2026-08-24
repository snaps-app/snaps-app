import type { Snap } from '@/services/types';
import { motion } from 'motion/react';
import { Card } from '@/app/components/shared/card';
import { Tag } from '@/app/components/shared/tag';
import { Hash, Clock } from 'lucide-react';
import { formatToSaoPauloShort } from '@/lib/date-utils';

interface SnapCardProps {
  snap: Snap;
  onClick: (snap: Snap) => void;
  projectName?: string;
}

export function SnapCard({ snap, onClick, projectName }: SnapCardProps) {
  const tags = (snap.snadds?.labels || []).map((label: string) => ({ label, variant: 'blue' as const }));

  // Proveniencia visivel no card, nao so no detalhe.
  //
  // Snap importado e material de TERCEIRO virando memoria do projeto. Se a
  // origem so aparecesse ao abrir a nota, na pratica ninguem veria: a leitura
  // acontece na grade. A opiniao de um material de aula ficaria
  // indistinguivel de uma decisao de arquitetura do time -- que e exatamente o
  // risco que a marcacao existe para conter.
  const importado = snap.trust_level === 'imported';
  const externo = snap.trust_level === 'external';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <Card
        size="compact"
        className="cursor-pointer h-full"
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
        onClick={() => onClick(snap)}
      >
        <div className="flex flex-col h-full">
          {/* Only showing Title (name) instead of description (content) */}
          <h3
            className="text-sm font-semibold mb-3 flex-1"
            style={{ color: 'var(--snaps-text-primary)', lineHeight: '1.6' }}
          >
            {(importado || externo) && (
              <span
                className="mr-2 align-middle px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"
                style={{
                  background: importado ? 'rgba(168,85,247,0.2)' : 'rgba(255,107,53,0.2)',
                  color: importado ? '#A855F7' : '#FF6B35',
                }}
                title={
                  importado
                    ? 'Importado de documento externo. E referencia, nao decisao do time.'
                    : 'Origem externa nao verificada.'
                }
              >
                {importado ? 'importado' : 'externo'}
              </span>
            )}
            {snap.name || 'Untitled Snap'}
          </h3>

          <div className="flex flex-wrap gap-2 mb-3">
            {tags.map((tag, i) => (
              <Tag key={i} variant={tag.variant}>
                <Hash className="w-3 h-3" />
                {tag.label}
              </Tag>
            ))}
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
            <span
              className="text-xs flex items-center gap-1"
              style={{ color: 'var(--snaps-text-secondary)' }}
            >
              <Clock className="w-3 h-3" />
              {formatToSaoPauloShort(snap.created_at)}
            </span>
            {projectName && (
              <span
                className="text-xs"
                style={{ color: 'var(--snaps-text-secondary)' }}
              >
                {projectName}
              </span>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
