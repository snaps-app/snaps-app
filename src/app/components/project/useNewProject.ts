import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProject } from '@/services/projects';

export const templates = [
  { id: 'free', name: 'Free Template', description: 'Start from scratch with no constraints' },
  { id: 'zettelkasten', name: 'Zettelkasten', description: 'Atomic notes with bidirectional linking' },
  { id: 'para', name: 'PARA Method', description: 'Projects, Areas, Resources, Archives' },
  { id: 'second-brain', name: 'Second Brain', description: 'Progressive summarization workflow' }
];

export function useNewProject() {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('free');
  const [isImprovingDescription, setIsImprovingDescription] = useState(false);
  const [isImprovingInstructions, setIsImprovingInstructions] = useState(false);
  const [sparks, setSparks] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [isCreating, setIsCreating] = useState(false);

  const handleImprove = (field: 'description' | 'instructions', targetRef: HTMLTextAreaElement | null) => {
    if (!targetRef) return;

    const isDescription = field === 'description';
    const setter = isDescription ? setIsImprovingDescription : setIsImprovingInstructions;
    setter(true);

    const newSparks = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100 - 50,
      y: Math.random() * 100 - 50
    }));
    setSparks(newSparks);

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

  const handleCreate = async () => {
    if (!projectName) return;
    setIsCreating(true);
    try {
      const newProject = await createProject({
        name: projectName,
        description,
        instructions,
        template: selectedTemplate
      });
      navigate(`/project/${newProject.id}`);
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return {
    navigate,
    projectName,
    setProjectName,
    description,
    setDescription,
    instructions,
    setInstructions,
    selectedTemplate,
    setSelectedTemplate,
    isImprovingDescription,
    isImprovingInstructions,
    sparks,
    isCreating,
    handleImprove,
    handleCreate
  };
}
