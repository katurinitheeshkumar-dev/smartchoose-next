import { useMemo } from 'react';
import { getPlatformByName } from '@/lib/utils';

interface PlatformIconProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
}

export function PlatformIcon({ name, size = 'md', className = '', showText = false }: PlatformIconProps) {
  const platform = useMemo(() => getPlatformByName(name), [name]);
  
  const sizeClasses = {
    sm: 'w-5 h-5 text-[10px]',
    md: 'w-8 h-8 text-[12px]',
    lg: 'w-10 h-10 text-[14px]'
  };

  // Generate a consistent color based on the name if it's a generic store
  const bgColor = useMemo(() => {
    if (platform.iconFile && platform.iconFile !== 'generic.svg') return 'transparent';
    
    // Simple hash to pick a color
    const colors = [
      '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', 
      '#EF4444', '#06B6D4', '#6366F1', '#D946EF', '#22C55E'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }, [name, platform.iconFile]);

  // If we have a specific icon file, show it
  if (platform.iconFile && platform.iconFile !== 'generic.svg') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div 
          className={`${sizeClasses[size]} rounded-lg flex items-center justify-center shadow-sm shrink-0 overflow-hidden`}
          style={{ backgroundColor: platform.color }}
        >
          <img 
            src={`/assets/platform-icons/${platform.iconFile}`} 
            alt={name} 
            className="w-full h-full object-cover" 
          />
        </div>
        {showText && <span className="font-bold text-slate-800">{platform.name}</span>}
      </div>
    );
  }

  // Fallback: First letter avatar
  const firstLetter = name.charAt(0).toUpperCase() || 'S';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div 
        className={`${sizeClasses[size]} rounded-lg flex items-center justify-center font-bold text-white shadow-sm shrink-0`}
        style={{ backgroundColor: bgColor }}
      >
        {firstLetter}
      </div>
      {showText && <span className="font-bold text-slate-800">{name}</span>}
    </div>
  );
}
