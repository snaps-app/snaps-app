import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Github, Key, Settings as SettingsIcon, SlidersHorizontal, Users } from 'lucide-react';
import { getGithubConfig, upsertGithubConfig } from '@/services/projects';
import { useProjectRole } from '@/contexts/project-role-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Button } from '@/app/components/ui/button';
import { Spinner } from '@/app/components/ui/spinner';
import { ProjectSettingsGeneral } from '@/app/components/project/project-settings-general';
import { EditProjectGithubConfig } from '@/app/components/project/edit-project-github-config';
import { ProjectApiKeysPanel } from '@/app/components/project/project-api-keys-panel';
import { MembersView } from '@/app/components/views/members-view';

/**
 * Hub de Settings do projeto (B3).
 *
 * As quatro abas sao as que JA tem conteudo. Environments, Axon do Projeto,
 * Automacao e Limites e Rotinas de IA sao requisitos registrados do E22
 * (Sprint 30.0) e NAO aparecem aqui nem como aba vazia: aba que abre e nao tem
 * nada e a mesma familia do botao morto (C17/E19). O encaixe para elas e esta
 * estrutura de codigo, nao um rotulo visivel.
 */
export const SETTINGS_TABS = ['general', 'members', 'github', 'api-keys'] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];

const TAB_LABEL: Record<SettingsTab, string> = {
    general: 'Geral',
    members: 'Membros',
    github: 'GitHub',
    'api-keys': 'API Keys',
};

const TAB_ICON = {
    general: SlidersHorizontal,
    members: Users,
    github: Github,
    'api-keys': Key,
} as const;

export function ProjectSettings() {
    const { projectId, tab } = useParams<{ projectId: string; tab?: string }>();
    const navigate = useNavigate();
    const { can, loading: roleLoading } = useProjectRole();

    const canWrite = can('write');
    const canViewMembers = can('view_members');

    const abasVisiveis: SettingsTab[] = SETTINGS_TABS.filter(
        (t) => t !== 'members' || canViewMembers
    );

    const abaPedida = (SETTINGS_TABS as readonly string[]).includes(tab ?? '')
        ? (tab as SettingsTab)
        : 'general';
    // Uma aba que o papel nao alcanca nao vira tela em branco nem erro: cai na
    // Geral, que todo mundo com acesso ao projeto pode ler.
    const abaAtiva: SettingsTab = abasVisiveis.includes(abaPedida) ? abaPedida : 'general';

    const [projectName, setProjectName] = useState('');

    // Config do GitHub mora no hub, nao na aba.
    //
    // O Radix desmonta o painel inativo, entao estado guardado la dentro
    // sumiria a cada troca de aba -- e `repoNames` e lido tambem pela aba Geral,
    // que oferece os escopos do .env a partir dele. Uma so carga, no hub.
    const [repoOwner, setRepoOwner] = useState('');
    const [repoNames, setRepoNames] = useState('');
    const [githubPat, setGithubPat] = useState('');
    const [hasSavedConfig, setHasSavedConfig] = useState(false);
    const [savedGithubRepo, setSavedGithubRepo] = useState({ owner: '', names: '' });
    const [lastSyncAt, setLastSyncAt] = useState('');
    const [syncStatus, setSyncStatus] = useState('');
    const [githubError, setGithubError] = useState('');
    const [githubSavedAt, setGithubSavedAt] = useState('');
    const [isSavingGithub, setIsSavingGithub] = useState(false);

    useEffect(() => {
        if (!projectId) return;
        let ativo = true;
        const carregar = async () => {
            try {
                const config = await getGithubConfig(projectId);
                if (!ativo) return;
                setRepoOwner(config.repo_owner);
                setRepoNames(config.repo_names || '');
                setHasSavedConfig(true);
                setSavedGithubRepo({ owner: config.repo_owner, names: config.repo_names || '' });
                if (config.last_sync_at) setLastSyncAt(new Date(config.last_sync_at).toLocaleString());
                setSyncStatus(config.sync_status || '');
            } catch {
                // Projeto sem GitHub configurado e o caso normal, nao um erro.
                if (ativo) setHasSavedConfig(false);
            }
        };
        carregar();
        return () => { ativo = false; };
    }, [projectId]);

    const hasUnsavedConfigChanges =
        repoOwner !== savedGithubRepo.owner || repoNames !== savedGithubRepo.names;

    const handleSaveGithub = async () => {
        if (!projectId || isSavingGithub) return;
        setGithubError('');
        setGithubSavedAt('');
        if (!repoOwner || !repoNames || !githubPat) {
            setGithubError(
                'Para salvar alteracoes do GitHub, informe os repositorios e o PAT. O token salvo nunca e exibido.'
            );
            return;
        }
        setIsSavingGithub(true);
        try {
            await upsertGithubConfig(projectId, {
                repo_owner: repoOwner,
                repo_names: repoNames,
                github_pat: githubPat,
            });
            setGithubPat('');
            setHasSavedConfig(true);
            setSavedGithubRepo({ owner: repoOwner, names: repoNames });
            setGithubSavedAt(new Date().toLocaleTimeString());
        } catch (error: any) {
            setGithubError(
                error?.response?.data?.detail ||
                'Nao foi possivel salvar. Confira suas permissoes e tente novamente.'
            );
        } finally {
            setIsSavingGithub(false);
        }
    };

    if (!projectId) return null;

    if (roleLoading) {
        return (
            <div className="flex items-center justify-center py-24 min-h-[500px]">
                <Spinner size="lg" label="Carregando permissoes..." color="orange" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <motion.div initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-6">
                <button
                    onClick={() => navigate(`/project/${projectId}`)}
                    className="flex items-center gap-2 text-sm mb-4 transition-colors hover:text-white"
                    style={{ color: 'var(--snaps-text-secondary)' }}
                >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar ao projeto
                </button>

                <div className="flex items-center gap-3">
                    <div
                        className="p-2 rounded-xl"
                        style={{
                            background: 'rgba(168, 85, 247, 0.12)',
                            border: '1px solid rgba(168, 85, 247, 0.3)',
                        }}
                    >
                        <SettingsIcon className="w-6 h-6" style={{ color: 'var(--snaps-accent-purple)' }} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-white">Settings</h1>
                        <p className="text-sm" style={{ color: 'var(--snaps-text-secondary)' }}>
                            {projectName || 'Configuracao do projeto'}
                        </p>
                    </div>
                </div>
            </motion.div>

            <Tabs
                value={abaAtiva}
                onValueChange={(valor) => navigate(`/project/${projectId}/settings/${valor}`)}
            >
                <TabsList>
                    {abasVisiveis.map((t) => {
                        const Icon = TAB_ICON[t];
                        return (
                            <TabsTrigger key={t} value={t}>
                                <Icon className="w-4 h-4" />
                                {TAB_LABEL[t]}
                            </TabsTrigger>
                        );
                    })}
                </TabsList>

                <TabsContent value="general">
                    <ProjectSettingsGeneral
                        projectId={projectId}
                        canWrite={canWrite}
                        repoNames={repoNames}
                        onProjectNameChange={setProjectName}
                    />
                </TabsContent>

                {canViewMembers && (
                    <TabsContent value="members">
                        <MembersView embedded />
                    </TabsContent>
                )}

                <TabsContent value="github">
                    {!canWrite && (
                        <p
                            className="text-sm rounded-xl px-4 py-3 mb-4"
                            style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                color: 'var(--snaps-text-secondary)',
                            }}
                        >
                            Seu papel neste projeto e de leitura. A integracao aparece como esta configurada e nao pode ser alterada.
                        </p>
                    )}
                    <div className={canWrite ? undefined : 'pointer-events-none opacity-60'}>
                        <EditProjectGithubConfig
                            projectId={projectId}
                            repoOwner={repoOwner}
                            setRepoOwner={setRepoOwner}
                            repoNames={repoNames}
                            setRepoNames={setRepoNames}
                            githubPat={githubPat}
                            setGithubPat={setGithubPat}
                            hasSavedConfig={hasSavedConfig}
                            hasUnsavedConfigChanges={hasUnsavedConfigChanges}
                            setHasSavedConfig={(saved) => {
                                setHasSavedConfig(saved);
                                if (saved) setSavedGithubRepo({ owner: repoOwner, names: repoNames });
                            }}
                            lastSyncAt={lastSyncAt}
                            syncStatus={syncStatus}
                            setSyncStatus={setSyncStatus}
                        />
                    </div>
                    {githubError && <p role="alert" className="text-sm text-red-400 mt-4">{githubError}</p>}
                    {githubSavedAt && !githubError && (
                        <p className="text-sm mt-4" style={{ color: 'var(--snaps-text-secondary)' }}>
                            Configuracao salva as {githubSavedAt}.
                        </p>
                    )}
                    {canWrite && (
                        // Botao proprio porque o "Update Project" da tela antiga
                        // salvava projeto e GitHub no mesmo clique. Separadas as
                        // abas, cada uma salva o que mostra.
                        <div className="pt-4">
                            <Button onClick={handleSaveGithub} disabled={isSavingGithub} size="lg" className="w-full">
                                {isSavingGithub ? 'Salvando...' : 'Salvar configuracao do GitHub'}
                            </Button>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="api-keys">
                    <ProjectApiKeysPanel projectId={projectId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
