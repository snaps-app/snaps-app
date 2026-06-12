import { getGithubConfig, getProject, updateProject, upsertGithubConfig } from '@/services/projects';
import { useState, useEffect } from 'react';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NeuralBackground } from '@/app/components/shared/neural-background';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner } from '@/app/components/ui/spinner';
import { ProjectApiKeysPanel } from '@/app/components/project/project-api-keys-panel';
import { EditProjectGithubConfig } from '@/app/components/project/edit-project-github-config';
import { EditProjectTemplateSelector } from '@/app/components/project/edit-project-template-selector';

export function EditProject() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('free');

  const [isImprovingDescription, setIsImprovingDescription] = useState(false);
  const [isImprovingInstructions, setIsImprovingInstructions] = useState(false);
  const [sparks, setSparks] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // GitHub Config State
  const [repoOwner, setRepoOwner] = useState('');
  const [repoNames, setRepoNames] = useState('');
  const [githubPat, setGithubPat] = useState('');
  const [lastSyncAt, setLastSyncAt] = useState('');
  const [syncStatus, setSyncStatus] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return;
      setIsLoading(true);
      try {
        const project = await getProject(projectId);
        setProjectName(project.name);
        setDescription(project.description);
        setInstructions(project.instructions);
        setSelectedTemplate(project.template);

        try {
          const config = await getGithubConfig(projectId);
          setRepoOwner(config.repo_owner);
          setRepoNames(config.repo_names || '');
          setGithubPat(config.github_pat);
          if (config.last_sync_at) {
            setLastSyncAt(new Date(config.last_sync_at).toLocaleString());
          }
          setSyncStatus(config.sync_status || '');
        } catch (err) {
          console.log("GitHub config not found or error:", err);
        }
      } catch (error) {
        console.error('Failed to load project:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [projectId]);

  const handleImprove = (field: 'description' | 'instructions', targetRef: HTMLTextAreaElement | null) => {
    if (!targetRef) return;

    const isDescription = field === 'description';
    const setter = isDescription ? setIsImprovingDescription : setIsImprovingInstructions;
    setter(true);

    // Generate sparks
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

  const handleUpdate = async () => {
    if (projectId && projectName) {
      setIsUpdating(true);
      try {
        await updateProject(projectId, {
          name: projectName,
          description,
          instructions,
          template: selectedTemplate
        });

        // Upsert GitHub Config if partially/fully filled
        if (repoOwner && repoNames && githubPat) {
            await upsertGithubConfig(projectId, {
                repo_owner: repoOwner,
                repo_names: repoNames,
                github_pat: githubPat
            });
        }

        navigate(`/project/${projectId}`);
      } catch (error) {
        console.error('Failed to update project:', error);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: 'var(--snaps-bg)' }}>
      <AnimatePresence>
        {(isLoading || isUpdating) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md"
          >
            <Spinner size="lg" label={isUpdating ? "Updating project..." : "Loading project..."} color="orange" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Very Active Neural Network Background */}
      <div className="absolute inset-0">
        <NeuralBackground />
        {/* Extra overlay for "birthing" effect */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at center, rgba(168, 85, 247, 0.15), transparent 70%)'
          }}
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      </div>

      {/* Back Button - Top Left */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate(`/project/${projectId}`)}
        className="fixed top-6 left-6 z-20 w-10 h-10 rounded-lg backdrop-blur-xl flex items-center justify-center transition-all"
        style={{
          background: 'rgba(255, 107, 53, 0.1)',
          border: '1px solid rgba(255, 107, 53, 0.3)',
          boxShadow: '0 2px 10px rgba(255, 107, 53, 0.2)'
        }}
      >
        <ArrowLeft className="w-5 h-5" style={{ color: 'var(--snaps-accent-orange)' }} />
      </motion.button>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-3xl"
        >
          {/* Form Container */}
          <div
            className="rounded-3xl backdrop-blur-[40px] p-8 relative overflow-hidden"
            style={{
              background: 'rgba(10, 10, 10, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 80px rgba(168, 85, 247, 0.1)'
            }}
          >
            {/* Glow Effect */}
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                background: 'radial-gradient(circle at top, rgba(168, 85, 247, 0.2), transparent 60%)'
              }}
            />

            {/* Header */}
            <div className="relative z-10 mb-8">
              <motion.h1
                className="text-4xl font-bold mb-2"
                style={{
                  background: 'linear-gradient(135deg, #A855F7 0%, #00D4FF 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                Edit Project
              </motion.h1>
              <motion.p
                className="text-sm"
                style={{ color: 'var(--snaps-text-secondary)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Update your project's configuration and settings.
              </motion.p>
            </div>

            {/* Form Fields */}
            <div className="relative z-10 space-y-6">
              {/* Project Name */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <label
                  className="block text-sm font-semibold mb-2"
                  style={{ color: 'var(--snaps-text-primary)' }}
                >
                  Project Name *
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="My Second Brain"
                  className="w-full px-6 py-4 rounded-xl text-lg backdrop-blur-xl focus:outline-none transition-all"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'var(--snaps-text-primary)',
                    boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.2)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(168, 85, 247, 0.5)';
                    e.target.style.boxShadow = '0 0 20px rgba(168, 85, 247, 0.3), inset 0 2px 10px rgba(0, 0, 0, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    e.target.style.boxShadow = 'inset 0 2px 10px rgba(0, 0, 0, 0.2)';
                  }}
                />
              </motion.div>

              {/* Description */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="relative"
              >
                <div className="flex items-center justify-between mb-2">
                  <label
                    className="text-sm font-semibold"
                    style={{ color: 'var(--snaps-text-primary)' }}
                  >
                    Description
                  </label>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      const textarea = e.currentTarget.parentElement?.nextElementSibling as HTMLTextAreaElement;
                      handleImprove('description', textarea);
                    }}
                    disabled={isImprovingDescription}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all relative overflow-hidden"
                    style={{
                      background: isImprovingDescription
                        ? 'rgba(0, 212, 255, 0.2)'
                        : 'rgba(0, 212, 255, 0.1)',
                      border: '1px solid rgba(0, 212, 255, 0.3)',
                      color: 'var(--snaps-accent-blue)'
                    }}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isImprovingDescription ? 'Improving...' : 'Improve with AI'}

                    {/* Sparks Animation */}
                    <AnimatePresence>
                      {isImprovingDescription && sparks.map((spark) => (
                        <motion.div
                          key={spark.id}
                          className="absolute w-1 h-1 rounded-full"
                          style={{
                            background: 'var(--snaps-accent-blue)',
                            left: '50%',
                            top: '50%'
                          }}
                          initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                          animate={{
                            scale: [0, 1.5, 0],
                            x: spark.x,
                            y: spark.y,
                            opacity: [1, 1, 0]
                          }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.button>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your project's purpose and goals..."
                  rows={4}
                  className="w-full px-6 py-4 rounded-xl backdrop-blur-xl focus:outline-none transition-all resize-none"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'var(--snaps-text-primary)',
                    boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.2)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(0, 212, 255, 0.5)';
                    e.target.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.3), inset 0 2px 10px rgba(0, 0, 0, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    e.target.style.boxShadow = 'inset 0 2px 10px rgba(0, 0, 0, 0.2)';
                  }}
                />
              </motion.div>

              {/* Project Instructions */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="relative"
              >
                <div className="flex items-center justify-between mb-2">
                  <label
                    className="text-sm font-semibold"
                    style={{ color: 'var(--snaps-text-primary)' }}
                  >
                    Project Instructions
                    <span className="ml-2 text-xs font-normal" style={{ color: 'var(--snaps-text-secondary)' }}>
                      (System prompt for AI)
                    </span>
                  </label>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      const textarea = e.currentTarget.parentElement?.nextElementSibling as HTMLTextAreaElement;
                      handleImprove('instructions', textarea);
                    }}
                    disabled={isImprovingInstructions}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all relative overflow-hidden"
                    style={{
                      background: isImprovingInstructions
                        ? 'rgba(168, 85, 247, 0.2)'
                        : 'rgba(168, 85, 247, 0.1)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      color: 'var(--snaps-accent-purple)'
                    }}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isImprovingInstructions ? 'Improving...' : 'Improve'}

                    {/* Sparks Animation */}
                    <AnimatePresence>
                      {isImprovingInstructions && sparks.map((spark) => (
                        <motion.div
                          key={spark.id}
                          className="absolute w-1 h-1 rounded-full"
                          style={{
                            background: 'var(--snaps-accent-purple)',
                            left: '50%',
                            top: '50%'
                          }}
                          initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                          animate={{
                            scale: [0, 1.5, 0],
                            x: spark.x,
                            y: spark.y,
                            opacity: [1, 1, 0]
                          }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.button>
                </div>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Define how the AI should interact with your knowledge base..."
                  rows={5}
                  className="w-full px-6 py-4 rounded-xl backdrop-blur-xl focus:outline-none transition-all resize-none"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'var(--snaps-text-primary)',
                    boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.2)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(168, 85, 247, 0.5)';
                    e.target.style.boxShadow = '0 0 20px rgba(168, 85, 247, 0.3), inset 0 2px 10px rgba(0, 0, 0, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    e.target.style.boxShadow = 'inset 0 2px 10px rgba(0, 0, 0, 0.2)';
                  }}
                />
              </motion.div>

              {/* Templates */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
              >
                <label
                  className="block text-sm font-semibold mb-3"
                  style={{ color: 'var(--snaps-text-primary)' }}
                >
                  Choose Template
                </label>
                <EditProjectTemplateSelector
                    selectedTemplate={selectedTemplate}
                    setSelectedTemplate={setSelectedTemplate}
                />
              </motion.div>

              {/* GitHub Integration Section */}
              {projectId && (
                <EditProjectGithubConfig
                    projectId={projectId}
                    repoOwner={repoOwner}
                    setRepoOwner={setRepoOwner}
                    repoNames={repoNames}
                    setRepoNames={setRepoNames}
                    githubPat={githubPat}
                    setGithubPat={setGithubPat}
                    lastSyncAt={lastSyncAt}
                    setLastSyncAt={setLastSyncAt}
                    syncStatus={syncStatus}
                    setSyncStatus={setSyncStatus}
                />
              )}

              {/* API Keys Panel */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.78 }}
              >
                {projectId && <ProjectApiKeysPanel projectId={projectId} />}
              </motion.div>

              {/* Update Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="pt-4"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleUpdate}
                  disabled={!projectName || isUpdating}
                  className="w-full py-4 rounded-xl font-bold text-lg transition-all"
                  style={{
                    background: projectName
                      ? 'linear-gradient(135deg, #A855F7 0%, #7E22CE 100%)'
                      : 'rgba(255, 255, 255, 0.05)',
                    color: projectName ? 'white' : 'var(--snaps-text-secondary)',
                    boxShadow: projectName
                      ? '0 8px 32px rgba(168, 85, 247, 0.4)'
                      : 'none',
                    opacity: projectName ? 1 : 0.5,
                    cursor: projectName ? 'pointer' : 'not-allowed'
                  }}
                >
                  {isUpdating ? 'Updating...' : 'Update Project'}
                </motion.button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
