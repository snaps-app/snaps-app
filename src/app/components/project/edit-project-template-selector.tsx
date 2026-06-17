import { Check } from 'lucide-react';
import { motion } from 'motion/react';

const templates = [
  { id: 'free', name: 'Free Template', description: 'Start from scratch with no constraints' },
  { id: 'zettelkasten', name: 'Zettelkasten', description: 'Atomic notes with bidirectional linking' },
  { id: 'para', name: 'PARA Method', description: 'Projects, Areas, Resources, Archives' },
  { id: 'second-brain', name: 'Second Brain', description: 'Progressive summarization workflow' }
];

interface EditProjectTemplateSelectorProps {
    selectedTemplate: string;
    setSelectedTemplate: (id: string) => void;
}

export const EditProjectTemplateSelector: React.FC<EditProjectTemplateSelectorProps> = ({
    selectedTemplate,
    setSelectedTemplate,
}) => {
    return (
        <div className="grid grid-cols-2 gap-3">
            {templates.map((template, index) => (
                <motion.button
                    key={template.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 + index * 0.05 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedTemplate(template.id)}
                    className="p-4 rounded-xl text-left transition-all relative overflow-hidden"
                    style={{
                        background: selectedTemplate === template.id
                            ? 'rgba(168, 85, 247, 0.15)'
                            : 'rgba(255, 255, 255, 0.05)',
                        border: selectedTemplate === template.id
                            ? '2px solid rgba(168, 85, 247, 0.5)'
                            : '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: selectedTemplate === template.id
                            ? '0 0 20px rgba(168, 85, 247, 0.3)'
                            : 'none'
                    }}
                >
                    {selectedTemplate === template.id && (
                        <motion.div
                            className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                            style={{
                                background: 'var(--snaps-accent-purple)',
                                boxShadow: '0 0 10px rgba(168, 85, 247, 0.6)'
                            }}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                        >
                            <Check className="w-4 h-4" style={{ color: 'white' }} />
                        </motion.div>
                    )}
                    <h3
                        className="font-semibold mb-1"
                        style={{
                            color: selectedTemplate === template.id
                                ? 'var(--snaps-accent-purple)'
                                : 'var(--snaps-text-primary)',
                            fontSize: '14px'
                        }}
                    >
                        {template.name}
                    </h3>
                    <p
                        className="text-xs leading-relaxed"
                        style={{ color: 'var(--snaps-text-secondary)' }}
                    >
                        {template.description}
                    </p>
                </motion.button>
            ))}
        </div>
    );
};
