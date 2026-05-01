import { useState } from 'react';
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

  // Force HTTPS to prevent mixed-content blocked errors
  const safeSrc = src ? src.replace('http://', 'https://') : '';

  return (
    <div className={`relative overflow-hidden bg-white ${className} ${fallbackClassName}`}>
      {!error ? (
        <img
          src={safeSrc}
          alt={alt}
          width="600"
          height="600"
          loading={fetchPriority === 'high' ? 'eager' : 'lazy'}
          // @ts-ignore - fetchPriority is a modern attribute
          fetchPriority={fetchPriority}
          decoding={fetchPriority === 'high' ? 'sync' : 'async'}
          className="w-full h-full object-contain p-4"
          onError={() => setError(true)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-100">
          <Icon name="image-off" size={32} className="mb-2" />
          <span className="text-xs font-medium">Image unavailable</span>
        </div>
      )}
    </div>
  );
}

export default ProductImage;

