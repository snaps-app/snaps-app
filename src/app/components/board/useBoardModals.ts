import { createEpic, deleteEpic, updateEpic } from '@/services/epics';
import { createSprint, deleteSprint, updateSprint } from '@/services/sprints';
import type { Epic, Sprint } from '@/services/types';

export function useBoardModals(projectId: string | undefined, epics: Epic[], setEpics: React.Dispatch<React.SetStateAction<Epic[]>>, sprints: Sprint[], setSprints: React.Dispatch<React.SetStateAction<Sprint[]>>) {
  
  const handleCreateEpic = async (name: string, color: string) => {
    if (!projectId) return;
    try {
      const newEpic = await createEpic(projectId, { project_id: projectId, name, color } as any);
      setEpics(prev => [...prev, newEpic]);
    } catch (error) { console.error('Failed to create epic:', error); }
  };

  const handleUpdateEpic = async (id: string, name: string, color: string) => {
    try {
      const updated = await updateEpic(id, { name, color });
      setEpics(prev => prev.map(e => e.id === id ? updated : e));
    } catch (error) { console.error('Failed to update epic:', error); }
  };

  const handleDeleteEpic = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await deleteEpic(id);
      setEpics(prev => prev.filter(e => e.id !== id));
    } catch (error) { console.error('Failed to delete epic:', error); }
  };

  const handleCreateSprint = async (name: string, tag: string, objective: string) => {
    if (!projectId) return;
    try {
      const newSprint = await createSprint(projectId, { name, tag, objective });
      setSprints(prev => [...prev, newSprint]);
    } catch (error) { console.error('Failed to create sprint:', error); }
  };

  const handleUpdateSprint = async (id: string, name: string, tag: string, objective: string) => {
    try {
      const updated = await updateSprint(id, { name, tag, objective });
      setSprints(prev => prev.map(s => s.id === id ? updated : s));
    } catch (error) { console.error('Failed to update sprint:', error); }
  };

  const handleDeleteSprint = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await deleteSprint(id);
      setSprints(prev => prev.filter(s => s.id !== id));
    } catch (error) { console.error('Failed to delete sprint:', error); }
  };

  return {
    handleCreateEpic, handleUpdateEpic, handleDeleteEpic,
    handleCreateSprint, handleUpdateSprint, handleDeleteSprint
  };
}
