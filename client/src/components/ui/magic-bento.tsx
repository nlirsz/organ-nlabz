
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
        "bg-gradient-to-br from-slate-900/95 to-gray-900/95",
        "border border-gray-800/50 backdrop-blur-sm",
        "hover:border-emerald-500/50 transition-all duration-700",
        "before:absolute before:inset-0 before:rounded-2xl",
        "before:bg-gradient-to-br before:from-emerald-500/10 before:via-green-500/5 before:to-emerald-600/10",
        "before:opacity-0 before:transition-opacity before:duration-700",
        "hover:before:opacity-100",
        "after:absolute after:inset-0 after:rounded-2xl",
        "after:bg-gradient-to-r after:from-transparent after:via-emerald-400/20 after:to-transparent",
        "after:translate-x-[-100%] after:transition-transform after:duration-1000 after:ease-out",
        "hover:after:translate-x-[100%]",
        className
      )}
    >
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Enhanced shimmer effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1200 ease-out" />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-green-400/20 to-transparent translate-x-full group-hover:-translate-x-full transition-transform duration-1200 ease-out delay-200" />
      </div>
      
      {/* Enhanced glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/30 via-green-500/20 to-emerald-500/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-lg -z-10" />
      
      {/* Pulsing border effect */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-400/20 via-green-400/30 to-emerald-400/20 animate-pulse" />
      </div>
      
      {/* Floating particles effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-emerald-400/60 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-green-400/60 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-0.5 h-0.5 bg-emerald-300/60 rounded-full animate-ping" style={{ animationDelay: '1.5s' }} />
      </div>
    </div>
  );
}
