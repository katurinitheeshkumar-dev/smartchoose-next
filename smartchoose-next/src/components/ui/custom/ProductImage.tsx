import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Icon } from './Icon';

interface ProductImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  fetchPriority?: 'high' | 'low' | 'auto';
}

export function ProductImage({ src, alt, className = '', fallbackClassName = '', fetchPriority = 'auto' }: ProductImageProps) {
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Reset error when src changes
  useEffect(() => {
    setError(false);
    setIsLoading(true);
  }, [src]);

  // Force HTTPS to prevent mixed-content blocked errors
  const safeSrc = (src && typeof src === 'string') ? src.replace('http://', 'https://') : (typeof src === 'string' ? '' : '');
  const isPriority = fetchPriority === 'high';

  if (!safeSrc || error) {
    return (
      <div className={`flex flex-col items-center justify-center text-slate-400 bg-slate-50 border border-slate-100 ${className} ${fallbackClassName}`}>
        <Icon name="image-off" size={32} className="mb-2 opacity-50" />
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">No Image</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-white ${className}`}>
      {isLoading && !error && (
        <div className="absolute inset-0 bg-slate-100 animate-pulse z-10" />
      )}
      <Image
        src={safeSrc}
        alt={alt}
        width={600}
        height={600}
        priority={isPriority}
        quality={85}
        className={`w-full h-full object-contain p-4 transition-all duration-500 ${isLoading ? 'scale-105 blur-sm' : 'scale-100 blur-0'}`}
        onLoadingComplete={() => setIsLoading(false)}
        onError={() => setError(true)}
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
      />
    </div>
  );
}

export default ProductImage;


