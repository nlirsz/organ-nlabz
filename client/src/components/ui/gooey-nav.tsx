
import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface GooeyNavProps {
  children: React.ReactNode;
  className?: string;
}

export function GooeyNav({ children, className }: GooeyNavProps) {
  return (
    <div 
      className={cn(
        "relative",
        className
      )}
      style={{
        filter: 'url(#gooey)',
      }}
    >
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="gooey">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feColorMatrix 
              in="blur" 
              mode="matrix" 
              values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 20 -10"
              result="gooey"
            />
            <feComposite in="SourceGraphic" in2="gooey" operator="atop"/>
          </filter>
        </defs>
      </svg>
      {children}
    </div>
  );
}
