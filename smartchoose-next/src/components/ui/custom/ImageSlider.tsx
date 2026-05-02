"use client";
import { useState, useRef } from 'react';
import Image from 'next/image';
import { Icon } from './Icon';
import { ProductImage } from './ProductImage';

interface ImageSliderProps {
  images: string[];
  title: string;
}

export function ImageSlider({ images, title }: ImageSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync scroll position with active index
  const scrollToImage = (index: number) => {
    if (scrollRef.current) {
      const scrollWidth = scrollRef.current.offsetWidth;
      scrollRef.current.scrollTo({
        left: index * scrollWidth,
        behavior: 'smooth'
      });
      setActiveIndex(index);
    }
  };

  // Handle scroll events to update active index (for mobile swipe)
  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollWidth = scrollRef.current.offsetWidth;
      const newIndex = Math.round(scrollRef.current.scrollLeft / scrollWidth);
      if (newIndex !== activeIndex) {
        setActiveIndex(newIndex);
      }
    }
  };

  const nextImage = () => {
    if (activeIndex < images.length - 1) {
      scrollToImage(activeIndex + 1);
    } else {
      scrollToImage(0); // Loop back
    }
  };

  const prevImage = () => {
    if (activeIndex > 0) {
      scrollToImage(activeIndex - 1);
    } else {
      scrollToImage(images.length - 1); // Loop to end
    }
  };

  return (
    <div className="relative w-full">
      {/* Main Slider Container */}
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-white shadow-lg mb-4 group">
        {/* Scrollable Area */}
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex w-full h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {images.map((img, idx) => (
            <div key={idx} className="w-full h-full flex-shrink-0 snap-center">
              <ProductImage
                src={img}
                alt={`${title} - ${idx + 1}`}
                className="w-full h-full object-contain"
                fetchPriority={idx === 0 ? 'high' : 'auto'}
              />
            </div>
          ))}

        </div>

        {/* Navigation Arrows (Desktop Only) */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg text-slate-800 hover:text-emerald-600 hover:scale-110 transition-all z-10 opacity-0 group-hover:opacity-100 hidden sm:flex"
            >
              <Icon name="chevron-left" size={24} />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg text-slate-800 hover:text-emerald-600 hover:scale-110 transition-all z-10 opacity-0 group-hover:opacity-100 hidden sm:flex"
            >
              <Icon name="chevron-right" size={24} />
            </button>
          </>
        )}

        {/* Dot Indicators (Mobile/Tablet) */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 sm:hidden">
            {images.map((_, idx) => (
              <div 
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeIndex === idx ? 'w-4 bg-emerald-500' : 'w-1.5 bg-slate-300'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => scrollToImage(idx)}
              className={`relative w-20 h-20 rounded-xl overflow-hidden bg-white flex-shrink-0 border-2 transition-all ${
                activeIndex === idx ? 'border-emerald-500 shadow-md ring-2 ring-emerald-100' : 'border-transparent hover:border-emerald-300'
              }`}
            >
              <Image
                src={img.replace('http://', 'https://')}
                alt={`${title} - Thumbnail ${idx + 1}`}
                width={80}
                height={80}
                className="w-full h-full object-contain p-2"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

