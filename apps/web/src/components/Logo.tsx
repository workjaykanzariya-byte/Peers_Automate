import React from 'react';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  subtitle?: string | boolean;
  className?: string;
  is3d?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  subtitle = false,
  className = '',
  is3d = true,
}) => {
  const sizeMap = {
    xs: { icon: 'w-6 h-6', text: 'text-sm', sub: 'text-[9px]' },
    sm: { icon: 'w-8 h-8', text: 'text-base', sub: 'text-[10px]' },
    md: { icon: 'w-9 h-9', text: 'text-lg', sub: 'text-[11px]' },
    lg: { icon: 'w-12 h-12', text: 'text-2xl', sub: 'text-xs' },
    xl: { icon: 'w-16 h-16', text: 'text-3xl', sub: 'text-sm' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* 3D Infinity P-A Emblem */}
      <div className={`relative ${currentSize.icon} shrink-0 group`}>
        {/* Ambient royal blue back-glow */}
        <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-sky-400 opacity-40 blur-xs group-hover:opacity-75 transition duration-300" />
        
        {/* 3D Image Logo */}
        <img
          src="/logo-3d.png"
          alt="Peers Automate Logo"
          className="relative w-full h-full object-cover rounded-xl shadow-md border border-blue-500/30 group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            // Graceful fallback to SVG if image not available
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`font-black tracking-tight text-slate-900 dark:text-white ${currentSize.text}`}>
              PEERS
            </span>
            <span
              className={`font-black tracking-tight bg-gradient-to-r from-blue-600 via-indigo-400 to-sky-400 bg-clip-text text-transparent ${currentSize.text}`}
            >
              AUTOMATE
            </span>
          </div>
          {subtitle && (
            <span className={`font-medium tracking-wide text-slate-500 dark:text-slate-400 mt-0.5 ${currentSize.sub}`}>
              {typeof subtitle === 'string' ? subtitle : 'Enterprise Communication & AI Automations'}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Logo;
