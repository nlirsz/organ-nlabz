
import React from 'react';
import { cn } from '@/lib/utils';

interface ProfileCardProps {
  children: React.ReactNode;
  className?: string;
}

export function ProfileCard({ children, className }: ProfileCardProps) {
  return (
    <div 
      className={cn(
        "relative group",
        "bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md",
        "border border-white/20 rounded-2xl",
        "hover:border-emerald-400/40 transition-all duration-500",
        "hover:shadow-2xl hover:shadow-emerald-500/20",
        "transform hover:scale-[1.02] transition-transform duration-300",
        "overflow-hidden",
        className
      )}
    >
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Animated border */}
      <div className="absolute inset-0 rounded-2xl">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-green-500/20 to-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse" />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Floating particles effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-emerald-400/60 rounded-full animate-bounce"
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + (i % 3) * 20}%`,
              animationDelay: `${i * 0.2}s`,
              animationDuration: '2s',
            }}
          />
        ))}
      </div>
    </div>
  );
}
