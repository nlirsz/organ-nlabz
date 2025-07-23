
import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface RippleGridProps {
  className?: string;
}

export function RippleGrid({ className }: RippleGridProps) {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    const generateRipples = () => {
      const newRipples = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 2,
      }));
      setRipples(newRipples);
    };

    generateRipples();
    const interval = setInterval(generateRipples, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      <div className="absolute inset-0 bg-grid-pattern opacity-30"></div>
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="absolute w-2 h-2 bg-emerald-500/20 rounded-full animate-ping"
          style={{
            left: `${ripple.x}%`,
            top: `${ripple.y}%`,
            animationDelay: `${ripple.delay}s`,
            animationDuration: '3s',
          }}
        />
      ))}
      
      <div className="absolute inset-0">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full border border-emerald-500/10 animate-pulse"
            style={{
              width: `${20 + i * 10}px`,
              height: `${20 + i * 10}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.2}s`,
              animationDuration: '4s',
            }}
          />
        ))}
      </div>
    </div>
  );
}
