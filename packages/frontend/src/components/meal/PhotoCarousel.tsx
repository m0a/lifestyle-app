import { useState, useRef, useEffect } from 'react';

interface Photo {
  id: string;
  photoUrl: string;
  analysisStatus?: string;
}

interface PhotoCarouselProps {
  photos: Photo[];
  onPhotoClick?: (photo: Photo, index: number) => void;
}

export function PhotoCarousel({ photos, onPhotoClick }: PhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const carouselRef = useRef<HTMLDivElement>(null);

  // Single photo - no carousel UI needed
  const isSinglePhoto = photos.length === 1;

  // Track image load status
  const handleImageLoad = (photoId: string) => {
    setLoadedImages((prev) => new Set(prev).add(photoId));
  };

  // Handle scroll to update current index
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel || isSinglePhoto) return;

    const handleScroll = () => {
      const scrollLeft = carousel.scrollLeft;
      const itemWidth = carousel.offsetWidth;
      const newIndex = Math.round(scrollLeft / itemWidth);
      setCurrentIndex(newIndex);
    };

    carousel.addEventListener('scroll', handleScroll);
    return () => carousel.removeEventListener('scroll', handleScroll);
  }, [isSinglePhoto]);

  // Don't render anything if no photos
  if (photos.length === 0) {
    return null;
  }

  return (
    <div className="relative" data-testid="photo-carousel">
      {/* Carousel container */}
      <div
        ref={carouselRef}
        className={`flex overflow-x-auto scrollbar-hide ${!isSinglePhoto ? 'snap-x snap-mandatory' : ''}`}
        style={{ touchAction: isSinglePhoto ? 'auto' : 'pan-x' }}
        role="region"
        aria-label="食事の写真カルーセル"
      >
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className={`relative flex-shrink-0 w-full ${!isSinglePhoto ? 'snap-center' : ''}`}
            onClick={() => onPhotoClick?.(photo, index)}
          >
            {/* Container with background for loading state */}
            <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
              {/* Loading placeholder - shows until image loads */}
              {!loadedImages.has(photo.id) && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse">
                  <svg
                    className="w-12 h-12 text-gray-300"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}

              {/* AI analysis overlay - shows on top of image while analyzing */}
              {photo.analysisStatus === 'analyzing' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                    <p className="text-sm text-white">AI分析中...</p>
                  </div>
                </div>
              )}

              {/* Photo image - T079: Responsive image optimization */}
              <img
                src={photo.photoUrl}
                alt={`食事の写真 ${index + 1}`}
                className="w-full h-full object-cover"
                loading={index === 0 ? 'eager' : 'lazy'}
                decoding="async"
                fetchPriority={index === 0 ? 'high' : 'auto'}
                onLoad={() => handleImageLoad(photo.id)}
                data-testid={`carousel-photo-${index}`}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Indicator dots - only show for multiple photos */}
      {!isSinglePhoto && photos.length > 1 && (
        <div className="flex justify-center gap-1 mt-2">
          {photos.map((_, index) => (
            <div
              key={index}
              data-testid="carousel-indicator"
              className={`w-1.5 h-1.5 rounded-full transition-colors ${index === currentIndex ? 'bg-blue-500' : 'bg-gray-300'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
