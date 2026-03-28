import { useState } from 'react';

interface ImageWithFallbackProps {
  src: string | null | undefined;
  alt?: string | null;
  className?: string;
  containerClassName?: string;
}

export function ImageWithFallback({
  src,
  alt,
  className = '',
  containerClassName = '',
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Don't render anything if no src or if error occurred
  if (!src || hasError) {
    return null;
  }

  const handleError = () => {
    console.warn("Failed to load question image:", src);
    setHasError(true);
  };

  const handleLoad = () => {
    setIsLoaded(true);
  };

  return (
    <div className={`w-full flex flex-col items-center gap-2 mb-4 ${containerClassName}`}>
      <div className="relative w-full flex justify-center">
        <img
          src={src}
          alt={alt || "Question diagram"}
          onError={handleError}
          onLoad={handleLoad}
          loading="lazy"
          decoding="async"
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${className}`}
          style={{ filter: 'none', backgroundColor: '#fff' }}
        />
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-pulse bg-muted rounded-lg w-full h-48"></div>
          </div>
        )}
      </div>
      {alt && (
        <p className="text-xs font-medium text-foreground/70 text-center px-4">
          {alt}
        </p>
      )}
    </div>
  );
}
