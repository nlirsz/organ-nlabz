
import React from 'react';
import { cn } from '@/lib/utils';

interface MagicBentoProps {
  children: React.ReactNode;
  className?: string;
}

export function MagicBento({ children, className }: MagicBentoProps) {
  return (
    <div 
      className={cn(
        "relative group overflow-hidden rounded-2xl",
        "bg-gradient-to-br from-slate-900/80 to-gray-900/80",
        "border border-gray-700/50 backdrop-blur-sm",
        "hover:border-emerald-500/30 transition-all duration-500",
        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-emerald-500/5 before:to-green-500/5 before:opacity-0 before:transition-opacity before:duration-500",
        "hover:before:opacity-100",
        "after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-emerald-500/10 after:to-transparent after:translate-x-[-100%] after:transition-transform after:duration-1000",
        "hover:after:translate-x-[100%]",
        className
      )}
    >
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Shimmer effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
      </div>
      
      {/* Glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-lg -z-10" />
    </div>
  );
}
