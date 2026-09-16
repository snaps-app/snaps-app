import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getProject, updateProject } from '@/services/projects';
import { Spinner } from '@/app/components/ui/spinner';
import { Button } from '@/app/components/ui/button';
import { ProjectConfigEntriesPanel } from '@/app/components/project/project-config-entries-panel';
import { EditProjectTemplateSelector } from '@/app/components/project/edit-project-template-selector';

interface ProjectSettingsGeneralProps {
    projectId: string;
    /** Papel do usuario ja resolvido pelo hub; `false` deixa a aba em leitura. */
    canWrite: boolean;
    /** Repositorios configurados na aba GitHub -- a lista de escopos do .env vem deles. */
    repoNames: string;
    onProjectNameChange?: (name: string) => void;
}

export function ProjectSettingsGeneral({
    projectId,
    canWrite,
    repoNames,
    onProjectNameChange,
}: ProjectSettingsGeneralProps) {
    const [projectName, setProjectName] = useState('');
    const [description, setDescription] = useState('');
    const [instructions, setInstructions] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState('free');

    const [isImprovingDescription, setIsImprovingDescription] = useState(false);
    const [isImprovingInstructions, setIsImprovingInstructions] = useState(false);
    const [sparks, setSparks] = useState<Array<{ id: number; x: number; y: number }>>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [savedAt, setSavedAt] = useState('');

    useEffect(() => {
        let ativo = true;
        const carregar = async () => {
            setIsLoading(true);
            try {
                const project = await getProject(projectId);
                if (!ativo) return;
                setProjectName(project.name);
                setDescription(project.description);
                setInstructions(project.instructions);
                setSelectedTemplate(project.template);
                onProjectNameChange?.(project.name);
            } catch (error) {
                console.error('Failed to load project:', error);
                if (ativo) setSaveError('Nao foi possivel carregar o projeto.');
            } finally {
                if (ativo) setIsLoading(false);
            }
        };
        carregar();
        return () => { ativo = false; };
        // `onProjectNameChange` fica de fora das dependencias: e callback do
        // pai, recriada a cada render, e entraria em laco de recarga.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    const handleImprove = (field: 'description' | 'instructions') => {
        const isDescription = field === 'description';
        const setter = isDescription ? setIsImprovingDescription : setIsImprovingInstructions;
        setter(true);

        const newSparks = Array.from({ length: 12 }, (_, i) => ({
            id: Date.now() + i,
            x: Math.random() * 100 - 50,
            y: Math.random() * 100 - 50
        }));
        setSparks(newSparks);

        // Simulate AI improvement
        setTimeout(() => {
            if (isDescription) {
                setDescription(prev => {
                    if (!prev) return 'A comprehensive knowledge management system designed to enhance thinking and creativity through structured note-taking and intelligent connections.';
                    return prev + ' Enhanced with AI suggestions for clarity and impact.';
                });
            } else {
                setInstructions(prev => {
                    if (!prev) return 'Use atomic note principles. Each note should contain one clear idea. Create bidirectional links between related concepts. Apply progressive summarization to surface key insights.';
                    return prev + ' Optimized for better AI collaboration and context retention.';
                });
            }
            setter(false);
            setSparks([]);
        }, 2000);
    };

    const handleSave = async () => {
        if (!projectName || isSaving) return;
        setSaveError('');
        setSavedAt('');
        setIsSaving(true);
        try {
            await updateProject(projectId, {
                name: projectName,
                description,
                instructions,
                template: selectedTemplate
            });
            onProjectNameChange?.(projectName);
            setSavedAt(new Date().toLocaleTimeString());
        } catch (error: any) {
            // A recusa por papel vem do backend, e e ela que aparece -- nao uma
            // mensagem generica escrita aqui. Quem nao pode escrever precisa ler
            // o motivo, nao "tente de novo" (U38).
            setSaveError(
                error?.response?.data?.detail ||
                'Nao foi possivel salvar. Confira suas permissoes e tente novamente.'
            );
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Spinner size="lg" label="Carregando projeto..." color="orange" />
            </div>
        );
    }

    const fieldStyle = {
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: 'var(--snaps-text-primary)',
        boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.2)'
    } as const;

    return (
        <div className="space-y-6">
            {!canWrite && (
                <p
                    className="text-sm rounded-xl px-4 py-3"
                    style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: 'var(--snaps-text-secondary)'
                    }}
                >
                    Seu papel neste projeto e de leitura. Os campos abaixo mostram a configuracao atual e nao podem ser alterados.
                </p>
            )}

            <div>
                <label
                    htmlFor="project-name"
                    className="block text-sm font-semibold mb-2"
                    style={{ color: 'var(--snaps-text-primary)' }}
                >
                    Project Name *
                </label>
                <input
                    id="project-name"
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    disabled={!canWrite}
                    placeholder="My Second Brain"
                    className="w-full px-6 py-4 rounded-xl text-lg backdrop-blur-xl focus:outline-none transition-all disabled:opacity-60"
                    style={fieldStyle}
                />
            </div>

            <div className="relative">
                <div className="flex items-center justify-between mb-2">
                    <label
                        htmlFor="project-description"
                        className="text-sm font-semibold"
                        style={{ color: 'var(--snaps-text-primary)' }}
                    >
                        Description
                    </label>
                    {canWrite && (
                        <motion.button
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleImprove('description')}
                            disabled={isImprovingDescription}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all relative overflow-hidden"
                            style={{
                                background: isImprovingDescription ? 'rgba(0, 212, 255, 0.2)' : 'rgba(0, 212, 255, 0.1)',
                                border: '1px solid rgba(0, 212, 255, 0.3)',
                                color: 'var(--snaps-accent-blue)'
                            }}
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            {isImprovingDescription ? 'Improving...' : 'Improve with AI'}
                            <AnimatePresence>
                                {isImprovingDescription && sparks.map((spark) => (
                                    <motion.div
                                        key={spark.id}
                                        className="absolute w-1 h-1 rounded-full"
                                        style={{ background: 'var(--snaps-accent-blue)', left: '50%', top: '50%' }}
                                        initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                                        animate={{ scale: [0, 1.5, 0], x: spark.x, y: spark.y, opacity: [1, 1, 0] }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 1, ease: 'easeOut' }}
                                    />
                                ))}
                            </AnimatePresence>
                        </motion.button>
                    )}
                </div>
                <textarea
                    id="project-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={!canWrite}
                    placeholder="Describe the purpose and goals of this project..."
                    rows={4}
                    className="w-full px-6 py-4 rounded-xl backdrop-blur-xl focus:outline-none transition-all resize-none disabled:opacity-60"
                    style={fieldStyle}
                />
            </div>

            <div className="relative">
                <div className="flex items-center justify-between mb-2">
                    <label
                        htmlFor="project-instructions"
                        className="text-sm font-semibold"
                        style={{ color: 'var(--snaps-text-primary)' }}
                    >
                        Project Instructions
                        <span className="ml-2 text-xs font-normal" style={{ color: 'var(--snaps-text-secondary)' }}>
                            (System prompt for AI)
                        </span>
                    </label>
                    {canWrite && (
                        <motion.button
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleImprove('instructions')}
                            disabled={isImprovingInstructions}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all relative overflow-hidden"
                            style={{
                                background: isImprovingInstructions ? 'rgba(168, 85, 247, 0.2)' : 'rgba(168, 85, 247, 0.1)',
                                border: '1px solid rgba(168, 85, 247, 0.3)',
                                color: 'var(--snaps-accent-purple)'
                            }}
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            {isImprovingInstructions ? 'Improving...' : 'Improve'}
                            <AnimatePresence>
                                {isImprovingInstructions && sparks.map((spark) => (
                                    <motion.div
                                        key={spark.id}
                                        className="absolute w-1 h-1 rounded-full"
                                        style={{ background: 'var(--snaps-accent-purple)', left: '50%', top: '50%' }}
                                        initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                                        animate={{ scale: [0, 1.5, 0], x: spark.x, y: spark.y, opacity: [1, 1, 0] }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 1, ease: 'easeOut' }}
                                    />
                                ))}
                            </AnimatePresence>
                        </motion.button>
                    )}
                </div>
                <textarea
                    id="project-instructions"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    disabled={!canWrite}
                    placeholder="Define how the AI should interact with your knowledge base..."
                    rows={5}
                    className="w-full px-6 py-4 rounded-xl backdrop-blur-xl focus:outline-none transition-all resize-none disabled:opacity-60"
                    style={fieldStyle}
                />
            </div>

            <div>
                <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--snaps-text-primary)' }}>
                    Choose Template
                </label>
                <div className={canWrite ? undefined : 'pointer-events-none opacity-60'}>
                    <EditProjectTemplateSelector
                        selectedTemplate={selectedTemplate}
                        setSelectedTemplate={setSelectedTemplate}
                    />
                </div>
            </div>

            {/* Configuracao do projeto (Sprint 21.5). Fica aqui, e nao numa aba
                propria: "Environments" e requisito registrado do E22 (Sprint
                30.0) e nao se antecipa o nome dele com o painel de hoje. Usa
                `repoNames` da aba GitHub para oferecer os escopos possiveis --
                por isso o hub guarda esse valor e o repassa. */}
            <ProjectConfigEntriesPanel projectId={projectId} repoNames={repoNames} />

            {saveError && <p role="alert" className="text-sm text-red-400">{saveError}</p>}
            {savedAt && !saveError && (
                <p className="text-sm" style={{ color: 'var(--snaps-text-secondary)' }}>Salvo as {savedAt}.</p>
            )}

            {canWrite && (
                <div className="pt-2">
                    <Button onClick={handleSave} disabled={!projectName || isSaving} size="lg" className="w-full">
                        {isSaving ? 'Salvando...' : 'Salvar alteracoes'}
                    </Button>
                </div>
            )}
        </div>
    );
}
