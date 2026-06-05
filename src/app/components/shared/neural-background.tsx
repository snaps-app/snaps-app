import { useEffect, useRef } from 'react';

interface NeuralBackgroundProps {
  density?: 'low' | 'medium' | 'high';
}

export function NeuralBackground({ density = 'medium' }: NeuralBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Ensure valid dimensions
      if (width <= 0 || height <= 0) return;
      
      canvas.width = width;
      canvas.height = height;
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    // Node count based on density
    const nodeCountMap = {
      low: 15,
      medium: 25,
      high: 40
    };

    const nodeCount = nodeCountMap[density];
    
    const nodes = Array.from({ length: nodeCount }, (_, i) => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3
    }));
    
    // Mouse position for parallax
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Animation loop
    let animationFrameId: number;
    
    const animate = () => {
      // Check if canvas has valid dimensions
      if (!canvas.width || !canvas.height || canvas.width <= 0 || canvas.height <= 0) {
        animationFrameId = requestAnimationFrame(animate);
        return;
      }

      ctx.fillStyle = 'rgba(10, 10, 10, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw nodes
      nodes.forEach((node, i) => {
        // Move nodes
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off edges
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        // Parallax effect (subtle)
        const parallaxX = (mouseX / canvas.width - 0.5) * 10;
        const parallaxY = (mouseY / canvas.height - 0.5) * 10;

        // Draw connections
        nodes.forEach((otherNode, j) => {
          if (i === j) return;
          
          const dx = node.x - otherNode.x;
          const dy = node.y - otherNode.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            const opacity = (1 - distance / 150) * 0.15;
            
            const x1 = node.x + parallaxX;
            const y1 = node.y + parallaxY;
            const x2 = otherNode.x + parallaxX;
            const y2 = otherNode.y + parallaxY;
            
            // Validate coordinates before creating gradient
            if (isFinite(x1) && isFinite(y1) && isFinite(x2) && isFinite(y2)) {
              const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
              gradient.addColorStop(0, `rgba(0, 212, 255, ${opacity})`);
              gradient.addColorStop(1, `rgba(168, 85, 247, ${opacity})`);
              
              ctx.strokeStyle = gradient;
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
            }
          }
        });

        // Draw node
        const nodeX = node.x + parallaxX;
        const nodeY = node.y + parallaxY;
        
        // Validate coordinates before creating gradient
        if (isFinite(nodeX) && isFinite(nodeY)) {
          const gradient = ctx.createRadialGradient(nodeX, nodeY, 0, nodeX, nodeY, 4);
          gradient.addColorStop(0, 'rgba(0, 212, 255, 0.6)');
          gradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.3)');
          gradient.addColorStop(1, 'rgba(0, 212, 255, 0)');
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(nodeX, nodeY, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [density]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ opacity: 0.4 }}
    />
  );
}