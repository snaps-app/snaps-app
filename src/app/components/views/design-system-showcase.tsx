import { useState } from 'react';
import { Button } from '@/app/components/shared/button';
import { Input } from '@/app/components/shared/input';
import { Card } from '@/app/components/shared/card';
import { Tag } from '@/app/components/shared/tag';
import { Stepper, StepProps } from '@/app/components/shared/stepper';
import { Plus, Heart, Share2, Sparkles } from 'lucide-react';

export function DesignSystemShowcase() {
  const [inputValue, setInputValue] = useState('');
  const [stepperState, setStepperState] = useState(0);

  const steps: StepProps[] = [
    { label: 'Analyzing request', status: stepperState > 0 ? 'complete' : stepperState === 0 ? 'active' : 'pending' },
    { label: 'Processing data', status: stepperState > 1 ? 'complete' : stepperState === 1 ? 'active' : 'pending' },
    { label: 'Generating response', status: stepperState > 2 ? 'complete' : stepperState === 2 ? 'active' : 'pending' },
    { label: 'Finalizing', status: stepperState === 3 ? 'complete' : 'pending' }
  ];

  const handleStepperDemo = () => {
    setStepperState((prev) => (prev < 3 ? prev + 1 : 0));
  };

  return (
    <div className="min-h-screen bg-[var(--snaps-bg)] p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-[var(--snaps-text-h1)] font-bold text-[var(--snaps-text-primary)] mb-2">
            Snaps Design System
          </h1>
          <p className="text-[var(--snaps-text-body)] text-[var(--snaps-text-secondary)]">
            A dark mode glassmorphism component library with neon accents
          </p>
        </div>

        {/* Buttons Section */}
        <section className="mb-12">
          <h2 className="text-[var(--snaps-text-h2)] font-bold text-[var(--snaps-text-primary)] mb-6">
            Buttons
          </h2>
          <div className="flex flex-wrap gap-4 items-center">
            <Button variant="primary">Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="fab">
              <Plus className="w-5 h-5" />
            </Button>
            <Button variant="fab" style={{ background: 'var(--snaps-accent-orange)' }}>
              <Heart className="w-5 h-5" />
            </Button>
            <Button variant="fab" style={{ background: 'var(--snaps-accent-purple)' }}>
              <Share2 className="w-5 h-5" />
            </Button>
            <Button variant="primary" disabled>Disabled</Button>
          </div>
        </section>

        {/* Inputs Section */}
        <section className="mb-12">
          <h2 className="text-[var(--snaps-text-h2)] font-bold text-[var(--snaps-text-primary)] mb-6">
            Inputs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
            <Input
              label="Username"
              placeholder="Enter your username"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              placeholder="example@email.com"
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter password"
            />
            <Input
              label="With Error"
              placeholder="Invalid input"
              error="This field is required"
            />
          </div>
        </section>

        {/* Cards Section */}
        <section className="mb-12">
          <h2 className="text-[var(--snaps-text-h2)] font-bold text-[var(--snaps-text-primary)] mb-6">
            Cards
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card size="compact">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--snaps-accent-blue)]/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-[var(--snaps-accent-blue)]" />
                </div>
                <div>
                  <h3 className="text-[var(--snaps-text-h4)] text-[var(--snaps-text-primary)] mb-1">
                    Compact Card
                  </h3>
                  <p className="text-[var(--snaps-text-caption)] text-[var(--snaps-text-secondary)]">
                    Perfect for list views with glassmorphism effect
                  </p>
                </div>
              </div>
            </Card>

            <Card size="expanded">
              <h3 className="text-[var(--snaps-text-h3)] text-[var(--snaps-text-primary)] mb-3">
                Expanded Card
              </h3>
              <p className="text-[var(--snaps-text-body)] text-[var(--snaps-text-secondary)] mb-4">
                Larger cards with more padding for detailed content views. Hover to see the glow effect.
              </p>
              <div className="flex gap-2">
                <Tag variant="blue">AI</Tag>
                <Tag variant="purple">Design</Tag>
              </div>
            </Card>

            <Card size="expanded">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[var(--snaps-text-h3)] text-[var(--snaps-text-primary)]">
                  Interactive
                </h3>
                <Button variant="fab" style={{ width: '32px', height: '32px' }}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[var(--snaps-text-body)] text-[var(--snaps-text-secondary)]">
                Cards can contain any component combination
              </p>
            </Card>
          </div>
        </section>

        {/* Tags Section */}
        <section className="mb-12">
          <h2 className="text-[var(--snaps-text-h2)] font-bold text-[var(--snaps-text-primary)] mb-6">
            Tags / Labels
          </h2>
          <div className="flex flex-wrap gap-3">
            <Tag variant="blue">Electric Blue</Tag>
            <Tag variant="orange">Vibrant Orange</Tag>
            <Tag variant="purple">Deep Purple</Tag>
            <Tag variant="green">Success Green</Tag>
            <Tag variant="pink">Hot Pink</Tag>
            <Tag variant="blue">AI Powered</Tag>
            <Tag variant="orange">Popular</Tag>
            <Tag variant="purple">Premium</Tag>
          </div>
        </section>

        {/* Stepper Section */}
        <section className="mb-12">
          <h2 className="text-[var(--snaps-text-h2)] font-bold text-[var(--snaps-text-primary)] mb-6">
            Stepper (Thinking Indicator)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card size="expanded">
              <h3 className="text-[var(--snaps-text-h3)] text-[var(--snaps-text-primary)] mb-4">
                Processing Status
              </h3>
              <Stepper steps={steps} />
              <Button 
                variant="secondary" 
                className="mt-4"
                onClick={handleStepperDemo}
              >
                {stepperState === 3 ? 'Reset' : 'Next Step'}
              </Button>
            </Card>

            <Card size="expanded">
              <h3 className="text-[var(--snaps-text-h3)] text-[var(--snaps-text-primary)] mb-4">
                Example Use Case
              </h3>
              <p className="text-[var(--snaps-text-body)] text-[var(--snaps-text-secondary)] mb-4">
                The stepper component is perfect for showing AI processing steps, loading states, or multi-step workflows.
              </p>
              <Stepper
                steps={[
                  { label: 'User input received', status: 'complete' },
                  { label: 'AI model processing', status: 'active' },
                  { label: 'Response generation', status: 'pending' }
                ]}
              />
            </Card>
          </div>
        </section>

        {/* Typography Section */}
        <section className="mb-12">
          <h2 className="text-[var(--snaps-text-h2)] font-bold text-[var(--snaps-text-primary)] mb-6">
            Typography
          </h2>
          <Card size="expanded">
            <div className="space-y-4">
              <div>
                <span className="text-[var(--snaps-text-caption)] text-[var(--snaps-text-secondary)]">Heading 1 - 24px Bold</span>
                <h1 className="text-[var(--snaps-text-h1)] font-bold text-[var(--snaps-text-primary)]">
                  The quick brown fox jumps over the lazy dog
                </h1>
              </div>
              <div>
                <span className="text-[var(--snaps-text-caption)] text-[var(--snaps-text-secondary)]">Heading 2 - 20px Bold</span>
                <h2 className="text-[var(--snaps-text-h2)] font-bold text-[var(--snaps-text-primary)]">
                  The quick brown fox jumps over the lazy dog
                </h2>
              </div>
              <div>
                <span className="text-[var(--snaps-text-caption)] text-[var(--snaps-text-secondary)]">Heading 3 - 18px Bold</span>
                <h3 className="text-[var(--snaps-text-h3)] font-bold text-[var(--snaps-text-primary)]">
                  The quick brown fox jumps over the lazy dog
                </h3>
              </div>
              <div>
                <span className="text-[var(--snaps-text-caption)] text-[var(--snaps-text-secondary)]">Heading 4 - 16px Bold</span>
                <h4 className="text-[var(--snaps-text-h4)] font-bold text-[var(--snaps-text-primary)]">
                  The quick brown fox jumps over the lazy dog
                </h4>
              </div>
              <div>
                <span className="text-[var(--snaps-text-caption)] text-[var(--snaps-text-secondary)]">Body - 14px Regular</span>
                <p className="text-[var(--snaps-text-body)] text-[var(--snaps-text-primary)]">
                  The quick brown fox jumps over the lazy dog
                </p>
              </div>
              <div>
                <span className="text-[var(--snaps-text-caption)] text-[var(--snaps-text-secondary)]">Caption - 12px Regular</span>
                <p className="text-[var(--snaps-text-caption)] text-[var(--snaps-text-secondary)]">
                  The quick brown fox jumps over the lazy dog
                </p>
              </div>
            </div>
          </Card>
        </section>

        {/* Color Palette Section */}
        <section className="mb-12">
          <h2 className="text-[var(--snaps-text-h2)] font-bold text-[var(--snaps-text-primary)] mb-6">
            Color Palette
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card size="compact">
              <div className="w-full h-16 rounded-lg bg-[var(--snaps-accent-blue)] mb-3"></div>
              <p className="text-[var(--snaps-text-caption)] text-[var(--snaps-text-primary)]">Electric Blue</p>
              <p className="text-[var(--snaps-text-caption)] text-[var(--snaps-text-secondary)]">#00D4FF</p>
            </Card>
            <Card size="compact">
              <div className="w-full h-16 rounded-lg bg-[var(--snaps-accent-orange)] mb-3"></div>
              <p className="text-[var(--snaps-text-caption)] text-[var(--snaps-text-primary)]">Accent Orange</p>
              <p className="text-[var(--snaps-text-caption)] text-[var(--snaps-text-secondary)]">#FF6B35</p>
            </Card>
            <Card size="compact">
              <div className="w-full h-16 rounded-lg bg-[var(--snaps-accent-purple)] mb-3"></div>
              <p className="text-[var(--snaps-text-caption)] text-[var(--snaps-text-primary)]">Accent Purple</p>
              <p className="text-[var(--snaps-text-caption)] text-[var(--snaps-text-secondary)]">#A855F7</p>
            </Card>
            <Card size="compact">
              <div className="w-full h-16 rounded-lg bg-[var(--snaps-success)] mb-3"></div>
              <p className="text-[var(--snaps-text-caption)] text-[var(--snaps-text-primary)]">Success</p>
              <p className="text-[var(--snaps-text-caption)] text-[var(--snaps-text-secondary)]">#22C55E</p>
            </Card>
            <Card size="compact">
              <div className="w-full h-16 rounded-lg bg-[var(--snaps-error)] mb-3"></div>
              <p className="text-[var(--snaps-text-caption)] text-[var(--snaps-text-primary)]">Error</p>
              <p className="text-[var(--snaps-text-caption)] text-[var(--snaps-text-secondary)]">#EF4444</p>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
