import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { NeuralBackground } from '@/app/components/shared/neural-background';
import { SourceDocumentPanel } from '@/app/components/documents/source-document-panel';

/**
 * A rota de um material. So o enquadramento -- o painel faz o trabalho.
 *
 * Existe porque a lista e a esteira de importacao ja navegavam para
 * `/project/:projectId/documents/:docId` antes de a rota existir, e clicar num
 * material dava tela em branco.
 */
export function SourceDocumentView() {
  const { projectId, docId } = useParams<{ projectId: string; docId: string }>();
  const navigate = useNavigate();

  const voltar = () => navigate(`/project/${projectId}/docs`);

  if (!projectId || !docId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ color: 'var(--snaps-text-secondary)' }}>
        Endereço de material incompleto.
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: 'var(--snaps-bg)' }}>
      <NeuralBackground />
      <div className="relative z-10 min-h-screen p-6 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="max-w-4xl mx-auto"
        >
          <SourceDocumentPanel projectId={projectId} docId={docId} onVoltar={voltar} />
        </motion.div>
      </div>
    </div>
  );
}
