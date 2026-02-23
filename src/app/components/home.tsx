import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './button';
import { Card } from './card';
import { NeuralBackground } from './neural-background';
// import { ActivitySparkline } from './activity-sparkline'; // Commenting out unused component for now
import { useNavigate } from 'react-router-dom';
import api, { Project } from '@/services/api';

export function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await api.getProjects();
        setProjects(data);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      }
    };
    fetchProjects();
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: 'var(--snaps-bg)' }}>
      {/* Neural Network Background */}
      <NeuralBackground />

      {/* Main Content */}
      <main className="relative z-10 max-w-[1440px] mx-auto px-4 md:px-8 py-8">
        {/* Section Title & Actions */}
        <motion.div
          className="mb-8 flex items-end justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <h2
              className="text-3xl font-bold mb-1"
              style={{ color: 'var(--snaps-text-primary)' }}
            >
              Projects
            </h2>
            <p style={{ color: 'var(--snaps-text-secondary)' }}>
              Your second brain workspace
            </p>
          </div>

          <Button
            variant="primary"
            className="gap-2"
            onClick={() => navigate('/new-project')}
          >
            <Plus className="w-5 h-5" />
            New Project
          </Button>
        </motion.div>

        {/* Project Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className="cursor-pointer group relative overflow-hidden"
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid transparent',
                  backgroundImage: 'linear-gradient(rgba(10, 10, 10, 0.8), rgba(10, 10, 10, 0.8)), linear-gradient(135deg, #00D4FF, #A855F7)',
                  backgroundOrigin: 'border-box',
                  backgroundClip: 'padding-box, border-box'
                }}
                onClick={() => navigate(`/project/${project.id}`)}
              >
                {/* Shimmer effect on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: 'linear-gradient(135deg, transparent 0%, rgba(0, 212, 255, 0.1) 50%, transparent 100%)',
                    animation: 'shimmer 2s infinite'
                  }}
                />

                <div className="relative space-y-4">
                  <div>
                    <h3
                      className="font-semibold mb-2"
                      style={{
                        color: 'var(--snaps-text-primary)',
                        fontSize: '16px'
                      }}
                    >
                      {project.name}
                    </h3>
                    <p
                      className="line-clamp-2 leading-relaxed text-sm"
                      style={{ color: 'var(--snaps-text-secondary)' }}
                    >
                      {project.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/5">
                    <span
                      className="text-xs"
                      style={{ color: 'var(--snaps-text-secondary)' }}
                    >
                      {new Date(project.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Floating Action Button (Mobile) */}
      <motion.div
        className="md:hidden fixed bottom-24 right-6 z-20"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Button
          variant="fab"
          className="shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)',
            boxShadow: '0 8px 30px rgba(0, 212, 255, 0.4), 0 0 60px rgba(168, 85, 247, 0.3)'
          }}
          aria-label="Create new project"
          onClick={() => navigate('/new-project')}
        >
          <Plus className="w-6 h-6" />
        </Button>
      </motion.div>

      {/* CSS for shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}