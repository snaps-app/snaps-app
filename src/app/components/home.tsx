import { useState } from 'react';
import { Plus, Menu, Brain, Search, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './button';
import { Card } from './card';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { NeuralBackground } from './neural-background';
import { ActivitySparkline } from './activity-sparkline';

import { Project } from '@/services/api';

interface HomeProps {
  projects: Project[];
  onProjectClick?: (projectId: string) => void;
  onNewProject?: () => void;
  onProfileClick?: () => void;
  onMemoryClick?: () => void;
}

export function Home({ projects, onProjectClick, onNewProject, onProfileClick, onMemoryClick }: HomeProps) {
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: 'var(--snaps-bg)' }}>
      {/* Neural Network Background */}
      <NeuralBackground />

      {/* Mobile Header */}
      <header className="md:hidden border-b border-white/10 backdrop-blur-sm sticky top-0 z-10" style={{ backgroundColor: 'rgba(10, 10, 10, 0.8)' }}>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              <Menu className="w-5 h-5" style={{ color: 'var(--snaps-text-primary)' }} />
            </button>

            <h1
              className="text-2xl font-bold tracking-tight"
              style={{
                background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              Snaps
            </h1>

            <Avatar
              className="w-9 h-9 ring-2 ring-[var(--snaps-accent-blue)] cursor-pointer"
              onClick={onProfileClick}
            >
              <AvatarFallback style={{ backgroundColor: 'var(--snaps-accent-blue)', color: 'white' }}>BB</AvatarFallback>
            </Avatar>
          </div>

          {/* Mobile Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--snaps-text-secondary)]" />
            <input
              type="text"
              placeholder="Ask your second brain..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-[var(--snaps-text-primary)] placeholder:text-[var(--snaps-text-secondary)] focus:outline-none focus:border-[var(--snaps-accent-blue)] focus:shadow-[0_0_20px_rgba(0,212,255,0.3)] transition-all"
            />
          </div>

          {/* Mobile Quick Actions */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <Button variant="primary" className="w-full justify-center gap-2">
              <Plus className="w-5 h-5" />
              New Project
            </Button>
            <Button variant="secondary" className="w-full justify-center gap-2">
              <Brain className="w-5 h-5" />
              Memory
            </Button>
          </div>
        </div>
      </header>

      {/* Desktop Hero Section */}
      <div className="hidden md:block relative z-10">
        <div className="max-w-[1440px] mx-auto px-8 pt-8">
          {/* Top Row: Logo and Avatar */}
          <div className="flex items-center justify-between mb-8">
            <motion.h1
              className="text-5xl font-bold tracking-tight"
              style={{
                background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 50%, #FF0080 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textShadow: '0 0 40px rgba(0, 212, 255, 0.3)'
              }}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Snaps
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              onClick={onProfileClick}
            >
              <Avatar className="w-12 h-12 ring-2 ring-[var(--snaps-accent-blue)] cursor-pointer hover:ring-[var(--snaps-accent-purple)] transition-all">
                <AvatarFallback style={{ backgroundColor: 'var(--snaps-accent-blue)', color: 'white' }}>BB</AvatarFallback>
              </Avatar>
            </motion.div>
          </div>

          {/* Action Buttons Row */}
          <motion.div
            className="flex items-center gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <motion.div
              className="flex-1"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                variant="primary"
                className="w-full gap-3 px-8 py-5 text-lg font-semibold rounded-2xl justify-center"
                style={{
                  background: 'linear-gradient(135deg, #00D4FF 0%, #0099CC 100%)',
                  boxShadow: '0 8px 32px rgba(0, 212, 255, 0.5), 0 0 60px rgba(0, 212, 255, 0.3)',
                  border: '1px solid rgba(0, 212, 255, 0.3)'
                }}
                onClick={onNewProject}
              >
                <Plus className="w-6 h-6" />
                New Project
              </Button>
            </motion.div>

            <motion.div
              className="flex-1"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                variant="secondary"
                className="w-full gap-3 px-8 py-5 text-lg font-semibold rounded-2xl backdrop-blur-xl justify-center"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(168, 85, 247, 0.5)',
                  boxShadow: '0 8px 32px rgba(168, 85, 247, 0.3), inset 0 0 60px rgba(168, 85, 247, 0.1)'
                }}
                onClick={onMemoryClick}
              >
                <Brain className="w-6 h-6" />
                Access Global Memory
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <main className="relative z-10 max-w-[1440px] mx-auto px-4 md:px-8 pt-12 pb-24">
        {/* Section Title */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <h2
            className="text-2xl md:text-3xl font-bold mb-2"
            style={{ color: 'var(--snaps-text-primary)' }}
          >
            Projects
          </h2>
          <p style={{ color: 'var(--snaps-text-secondary)' }}>
            Your second brain workspace
          </p>
        </motion.div>

        {/* Project Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.7 + index * 0.1 }}
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
                onClick={() => onProjectClick?.(project.id)}
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

                  {/* Activity Sparkline Placeholder */}
                  {/* <div className="flex items-center gap-3">
                    <ActivitySparkline data={project.activity || []} />
                    <span 
                      className="text-xs"
                      style={{ color: 'var(--snaps-accent-green)' }}
                    >
                      Active
                    </span>
                  </div> */}

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
        className="md:hidden fixed bottom-6 right-6 z-20"
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
          onClick={onNewProject}
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