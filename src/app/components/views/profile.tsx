import { useState } from 'react';
import { ArrowLeft, User, Key, HardDrive, Server, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { NeuralBackground } from '@/app/components/shared/neural-background';
import { useNavigate } from 'react-router-dom';
import { StorageTabContent } from '@/app/components/views/profile-storage-tab';
import { McpServersTabContent } from '@/app/components/views/profile-mcp-servers-tab';

type TabType = 'account' | 'ai-models' | 'storage' | 'mcp-servers';

interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function CyberpunkToggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl backdrop-blur-xl transition-all"
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}
    >
      <div className="flex-1">
        <div className="font-medium" style={{ color: 'var(--snaps-text-primary)' }}>
          {label}
        </div>
        {description && (
          <div className="text-xs mt-1" style={{ color: 'var(--snaps-text-secondary)' }}>
            {description}
          </div>
        )}
      </div>

      <motion.button
        onClick={() => onChange(!checked)}
        className="relative w-14 h-7 rounded-full transition-all"
        style={{
          background: checked
            ? 'linear-gradient(135deg, #00D4FF 0%, #0099CC 100%)'
            : 'rgba(255, 255, 255, 0.1)',
          border: checked
            ? '2px solid rgba(0, 212, 255, 0.5)'
            : '2px solid rgba(255, 255, 255, 0.2)',
          boxShadow: checked
            ? '0 0 20px rgba(0, 212, 255, 0.4), inset 0 0 10px rgba(0, 212, 255, 0.3)'
            : 'none'
        }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Light indicator */}
        {checked && (
          <motion.div
            className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
            style={{ background: '#00FFFF', boxShadow: '0 0 8px #00FFFF' }}
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}

        {/* Slider */}
        <motion.div
          className="absolute top-0.5 w-6 h-6 rounded-full"
          style={{
            background: checked ? 'white' : 'rgba(255, 255, 255, 0.5)',
            boxShadow: checked ? '0 2px 10px rgba(0, 0, 0, 0.3)' : 'none'
          }}
          animate={{ x: checked ? 26 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </motion.button>
    </div>
  );
}

function ScanLine() {
  return (
    <div className="relative h-px my-8 overflow-hidden">
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(90deg, transparent 0%, rgba(0, 212, 255, 0.5) 50%, transparent 100%)'
      }} />
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(0, 212, 255, 0.8) 50%, transparent 100%)',
          width: '50%'
        }}
        animate={{ x: ['-100%', '300%'] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}

export function Profile() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('account');
  const [settings, setSettings] = useState({
    emailNotifications: true,
    autoSave: true,
    darkMode: true,
    aiSuggestions: true
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const tabs = [
    { id: 'account' as TabType, label: 'Account', icon: User },
    { id: 'ai-models' as TabType, label: 'AI Models', icon: Key },
    { id: 'storage' as TabType, label: 'Storage', icon: HardDrive },
    { id: 'mcp-servers' as TabType, label: 'MCP Servers', icon: Server }
  ];

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText('sk-1234567890abcdef1234567890abcdef');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: 'var(--snaps-bg)' }}>
      {/* Neural Network Background */}
      <NeuralBackground />

      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate('/')}
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
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1
            className="text-4xl font-bold mb-2"
            style={{
              background: 'linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            Settings & Profile
          </h1>
          <p className="text-sm" style={{ color: 'var(--snaps-text-secondary)' }}>
            Configure your workspace and preferences
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-2 mb-8 overflow-x-auto pb-2"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium whitespace-nowrap transition-all"
                style={{
                  background: activeTab === tab.id
                    ? 'rgba(0, 212, 255, 0.15)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: activeTab === tab.id
                    ? '2px solid rgba(0, 212, 255, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  color: activeTab === tab.id
                    ? 'var(--snaps-accent-blue)'
                    : 'var(--snaps-text-secondary)',
                  boxShadow: activeTab === tab.id
                    ? '0 0 20px rgba(0, 212, 255, 0.3)'
                    : 'none'
                }}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </motion.button>
            );
          })}
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl backdrop-blur-[40px] p-8"
          style={{
            background: 'rgba(10, 10, 10, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
          }}
        >
          <AnimatePresence mode="wait">
            {/* Account Tab */}
            {activeTab === 'account' && (
              <motion.div
                key="account"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Profile Section */}
                <div className="flex items-center gap-6 mb-6">
                  <Avatar className="w-24 h-24 ring-4 ring-[var(--snaps-accent-blue)]">
                    <AvatarFallback style={{ backgroundColor: 'var(--snaps-accent-blue)', fontSize: '32px', color: 'white' }}>BB</AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--snaps-text-primary)' }}>
                      Second Brain
                    </h2>
                    <p style={{ color: 'var(--snaps-text-secondary)' }}>
                      brain@secondbrain.ai
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="mt-3 px-4 py-2 rounded-lg text-sm font-medium"
                      style={{
                        background: 'rgba(0, 212, 255, 0.1)',
                        border: '1px solid rgba(0, 212, 255, 0.3)',
                        color: 'var(--snaps-accent-blue)'
                      }}
                    >
                      Change Avatar
                    </motion.button>
                  </div>
                </div>

                <ScanLine />

                {/* Personal Info */}
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--snaps-text-primary)' }}>
                  Personal Information
                </h3>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--snaps-text-secondary)' }}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      defaultValue="John Doe"
                      className="w-full px-4 py-3 rounded-xl backdrop-blur-xl focus:outline-none transition-all"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'var(--snaps-text-primary)'
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--snaps-text-secondary)' }}>
                      Email
                    </label>
                    <input
                      type="email"
                      defaultValue="john.doe@example.com"
                      className="w-full px-4 py-3 rounded-xl backdrop-blur-xl focus:outline-none transition-all"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'var(--snaps-text-primary)'
                      }}
                    />
                  </div>
                </div>

                <ScanLine />

                {/* Preferences */}
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--snaps-text-primary)' }}>
                  Preferences
                </h3>
                <div className="space-y-3">
                  <CyberpunkToggle
                    label="Email Notifications"
                    description="Receive updates about your projects"
                    checked={settings.emailNotifications}
                    onChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
                  />
                  <CyberpunkToggle
                    label="Auto-save"
                    description="Automatically save changes every 30 seconds"
                    checked={settings.autoSave}
                    onChange={(checked) => setSettings({ ...settings, autoSave: checked })}
                  />
                  <CyberpunkToggle
                    label="Dark Mode"
                    description="Use dark theme across the application"
                    checked={settings.darkMode}
                    onChange={(checked) => setSettings({ ...settings, darkMode: checked })}
                  />
                  <CyberpunkToggle
                    label="AI Suggestions"
                    description="Get intelligent suggestions while working"
                    checked={settings.aiSuggestions}
                    onChange={(checked) => setSettings({ ...settings, aiSuggestions: checked })}
                  />
                </div>
              </motion.div>
            )}

            {/* AI Models Tab */}
            {activeTab === 'ai-models' && (
              <motion.div
                key="ai-models"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--snaps-text-primary)' }}>
                  API Keys
                </h3>

                <div className="space-y-4">
                  <div
                    className="p-4 rounded-xl backdrop-blur-xl"
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium" style={{ color: 'var(--snaps-text-primary)' }}>
                        OpenAI API Key
                      </span>
                      <span className="text-xs px-2 py-1 rounded" style={{
                        background: 'rgba(34, 197, 94, 0.2)',
                        color: 'var(--snaps-accent-green)',
                        border: '1px solid rgba(34, 197, 94, 0.3)'
                      }}>
                        Active
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3 py-2 rounded-lg font-mono text-sm" style={{
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'var(--snaps-text-secondary)'
                      }}>
                        {showApiKey ? 'sk-1234567890abcdef1234567890abcdef' : '••••••••••••••••••••••••••••••••'}
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="p-2 rounded-lg"
                        style={{
                          background: 'rgba(0, 212, 255, 0.1)',
                          border: '1px solid rgba(0, 212, 255, 0.3)'
                        }}
                      >
                        {showApiKey ? (
                          <EyeOff className="w-5 h-5" style={{ color: 'var(--snaps-accent-blue)' }} />
                        ) : (
                          <Eye className="w-5 h-5" style={{ color: 'var(--snaps-accent-blue)' }} />
                        )}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCopyApiKey}
                        className="p-2 rounded-lg"
                        style={{
                          background: copied ? 'rgba(34, 197, 94, 0.1)' : 'rgba(0, 212, 255, 0.1)',
                          border: copied ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(0, 212, 255, 0.3)'
                        }}
                      >
                        {copied ? (
                          <Check className="w-5 h-5" style={{ color: 'var(--snaps-accent-green)' }} />
                        ) : (
                          <Copy className="w-5 h-5" style={{ color: 'var(--snaps-accent-blue)' }} />
                        )}
                      </motion.button>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 rounded-xl font-medium"
                    style={{
                      background: 'rgba(0, 212, 255, 0.1)',
                      border: '1px solid rgba(0, 212, 255, 0.3)',
                      color: 'var(--snaps-accent-blue)'
                    }}
                  >
                    Add New API Key
                  </motion.button>
                </div>

                <ScanLine />

                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--snaps-text-primary)' }}>
                  Model Preferences
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--snaps-text-secondary)' }}>
                      Default Model
                    </label>
                    <select
                      className="w-full px-4 py-3 rounded-xl backdrop-blur-xl focus:outline-none transition-all"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'var(--snaps-text-primary)'
                      }}
                    >
                      <option>GPT-4 Turbo</option>
                      <option>GPT-4</option>
                      <option>GPT-3.5 Turbo</option>
                      <option>Claude 3 Opus</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Storage Tab */}
            {activeTab === 'storage' && (
              <StorageTabContent ScanLine={ScanLine} />
            )}

            {/* MCP Servers Tab */}
            {activeTab === 'mcp-servers' && (
              <McpServersTabContent ScanLine={ScanLine} />
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}