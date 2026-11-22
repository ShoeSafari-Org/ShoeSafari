"use client";
import Image, { ImageProps } from "next/image";
import { useEffect, useState } from "react";

interface OptimizedImageProps extends Omit<ImageProps, "onError"> {
  fallbackSrc?: string;
  showSkeleton?: boolean;
  containerClassName?: string;
}

export default function OptimizedImage({ src, alt, fallbackSrc = "/images/notfoundimage.png", showSkeleton = true, className = "", containerClassName = "", ...props }: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [imageSrc, setImageSrc] = useState(src || fallbackSrc);
  const [hasErrored, setHasErrored] = useState(false);
  useEffect(() => { setImageSrc(src || fallbackSrc); setHasErrored(false); setIsLoading(true); }, [src, fallbackSrc]);
  return (
    <div className={`relative overflow-hidden ${containerClassName || className}`}>
      {showSkeleton && isLoading && <div className="absolute inset-0 bg-gray-200 animate-pulse" aria-hidden="true" />}
      <Image src={imageSrc} alt={alt} className={`transition-opacity duration-300 ${isLoading ? "opacity-0" : "opacity-100"} ${className}`} onLoad={() => setIsLoading(false)} onError={() => { setIsLoading(false); if (!hasErrored && imageSrc !== fallbackSrc) { setHasErrored(true); setImageSrc(fallbackSrc); } }} loading="lazy" {...props} />
    </div>
  );
}

const PRODUCT_IMAGE_VARIANTS = {
  small: { width: 150, height: 150, quality: 65, sizes: "150px" },
  medium: { width: 300, height: 300, quality: 75, sizes: "(max-width: 768px) 50vw, 300px" },
  large: { width: 500, height: 500, quality: 85, sizes: "(max-width: 768px) 100vw, 500px" },
} as const;

export function ProductImage({ src, alt, size = "medium", className = "", containerClassName = "" }: { src: string; alt: string; size?: keyof typeof PRODUCT_IMAGE_VARIANTS; className?: string; containerClassName?: string }) {
  const variant = PRODUCT_IMAGE_VARIANTS[size];
  return <OptimizedImage src={src} alt={alt} width={variant.width} height={variant.height} quality={variant.quality} containerClassName={`aspect-square w-full overflow-hidden rounded-lg ${containerClassName}`} className={`h-full w-full object-cover ${className}`} sizes={variant.sizes} />;
}

export function Avatar({ src, alt, size = 40, className = "" }: { src?: string | null; alt: string; size?: number; className?: string }) {
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(alt)}&size=${size * 2}&background=dc2626&color=fff`;
  return <OptimizedImage src={src || fallback} alt={alt} width={size} height={size} className={`rounded-full object-cover ${className}`} fallbackSrc={fallback} />;
}

export function HeroImage({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  return <div className={`relative w-full h-[60vh] min-h-[400px] ${className}`}><Image src={src} alt={alt} fill priority className="object-cover" sizes="100vw" /></div>;
}
