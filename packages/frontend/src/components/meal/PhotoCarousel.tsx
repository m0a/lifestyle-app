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
  const carouselRef = useRef<HTMLDivElement>(null);

  // Don't render anything if no photos
  if (photos.length === 0) {
    return null;
  }

  // Single photo - no carousel UI needed
  const isSinglePhoto = photos.length === 1;

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
            {/* Loading placeholder for analyzing photos */}
            {photo.analysisStatus === 'analyzing' && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">AI分析中...</p>
                </div>
              </div>
            )}

            {/* Photo image */}
            <img
              src={photo.photoUrl}
              alt={`食事の写真 ${index + 1}`}
              className="w-full h-48 object-cover rounded-lg"
              loading="lazy"
              data-testid={`carousel-photo-${index}`}
            />
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
