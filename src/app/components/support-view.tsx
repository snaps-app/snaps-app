import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { Board } from '@/services/api';
import { Loader2, AlertCircle } from 'lucide-react';
import { BoardView } from './board-view';

export function SupportView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supportBoard, setSupportBoard] = useState<Board | null>(null);

  useEffect(() => {
    async function findSupportBoard() {
      if (!projectId) return;
      
      try {
        setLoading(true);
        const boards = await api.getProjectBoards(projectId);
        const found = boards.find(b => b.board_type === 'support');
        
        if (found) {
          // Redireciona para a URL real do board
          navigate(`/project/${projectId}/board/${found.id}`, { replace: true });
        } else {
          setError('Board de Suporte não encontrado para este projeto.');
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch support board:', err);
        setError('Erro ao carregar o board de suporte.');
        setLoading(false);
      }
    }

    findSupportBoard();
  }, [projectId, navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 bg-[#050505]">
        <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
        <p className="text-zinc-400 font-medium animate-pulse">Acessando Esteira A...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-6 p-4 text-center bg-[#050505]">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Board não encontrado</h2>
          <p className="text-zinc-400 max-w-md mx-auto">{error}</p>
        </div>
        <button 
          onClick={() => navigate(`/project/${projectId}/board`)}
          className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all font-medium"
        >
          Voltar para Roadmap
        </button>
      </div>
    );
  }

  return null;
}
