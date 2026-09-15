import type { Sprint } from '@/services/types';
import { Zap, Plus, Edit2, Trash2 } from 'lucide-react';
import { Button, Input, Card, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui';

interface SprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  sprints: Sprint[];
  editingSprintId: string | null;
  sprintNameInput: string;
  sprintTagInput: string;
  sprintObjectiveInput: string;
  isSprintFormOpen: boolean;
  isSprintSaving: boolean;
  setSprintNameInput: (val: string) => void;
  setSprintTagInput: (val: string) => void;
  setSprintObjectiveInput: (val: string) => void;
  setIsSprintFormOpen: (val: boolean) => void;
  setEditingSprintId: (val: string | null) => void;
  handleCreateSprint: () => Promise<void>;
  handleUpdateSprint: (id: string) => Promise<void>;
  handleDeleteSprint: (id: string) => Promise<void>;
  startEditingSprint: (sprint: Sprint) => void;
}

export function SprintModal({
  isOpen,
  onClose,
  sprints,
  editingSprintId,
  sprintNameInput,
  sprintTagInput,
  sprintObjectiveInput,
  isSprintFormOpen,
  isSprintSaving,
  setSprintNameInput,
  setSprintTagInput,
  setSprintObjectiveInput,
  setIsSprintFormOpen,
  setEditingSprintId,
  handleCreateSprint,
  handleUpdateSprint,
  handleDeleteSprint,
  startEditingSprint
}: SprintModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Zap className="w-5 h-5 text-purple-400" />
            Manage Sprints
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2">
              {sprints.map(sprint => (
                <Card key={sprint.id} className="group bg-white/5 p-3">
                  {editingSprintId === sprint.id ? (
                    <div className="flex flex-col gap-3">
                      <Input
                        type="text"
                        value={sprintNameInput}
                        onChange={(e) => setSprintNameInput(e.target.value)}
                        placeholder="Sprint Name"
                        autoFocus
                      />
                      <Input
                        type="text"
                        value={sprintTagInput}
                        onChange={(e) => setSprintTagInput(e.target.value)}
                        className="font-mono"
                        placeholder="sprint-tag"
                      />
                      <textarea
                        value={sprintObjectiveInput}
                        onChange={(e) => setSprintObjectiveInput(e.target.value)}
                        className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500 text-white min-h-[60px]"
                        placeholder="Objective..."
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingSprintId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleUpdateSprint(sprint.id)}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white leading-none">{sprint.name}</span>
                          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                            sprint.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                            sprint.status === 'done' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' :
                            'bg-yellow-500/20 text-yellow-500 border-yellow-500/50'
                          }`}>
                            {sprint.status}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-gray-500">{sprint.tag}</span>
                        {sprint.objective && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{sprint.objective}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-400 hover:text-white"
                          onClick={() => startEditingSprint(sprint)}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => handleDeleteSprint(sprint.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}

              {isSprintFormOpen ? (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3">
                  <div className="flex flex-col gap-3">
                    <input
                      type="text"
                      value={sprintNameInput}
                      onChange={(e) => setSprintNameInput(e.target.value)}
                      className="bg-black/20 border border-purple-500/30 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500 text-white"
                      placeholder="Sprint Name (e.g. Sprint 1)"
                      autoFocus
                    />
                    <input
                      type="text"
                      value={sprintTagInput}
                      onChange={(e) => setSprintTagInput(e.target.value)}
                      className="bg-black/20 border border-purple-500/30 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500 text-white font-mono"
                      placeholder="Tag (e.g. sprint-1)"
                    />
                    <textarea
                      value={sprintObjectiveInput}
                      onChange={(e) => setSprintObjectiveInput(e.target.value)}
                      className="bg-black/20 border border-purple-500/30 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500 text-white min-h-[60px]"
                      placeholder="Sprint Objective..."
                    />
                    <div className="flex items-center gap-2 justify-end mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsSprintFormOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleCreateSprint}
                        disabled={!sprintNameInput.trim() || !sprintTagInput.trim() || isSprintSaving}
                      >
                        {isSprintSaving ? (
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : 'Create'}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full py-3 h-auto border-dashed text-gray-400 hover:text-purple-400 justify-center text-sm font-medium"
                  onClick={() => { setIsSprintFormOpen(true); setEditingSprintId(null); setSprintNameInput(''); setSprintTagInput(''); setSprintObjectiveInput(''); }}
                >
                  <Plus className="w-4 h-4" />
                  New Sprint
                </Button>
              )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
