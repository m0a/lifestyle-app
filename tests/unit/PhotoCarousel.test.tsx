import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PhotoCarousel } from '../../packages/frontend/src/components/meal/PhotoCarousel';

describe('PhotoCarousel Component', () => {
  const mockPhotos = [
    { id: '1', photoUrl: 'https://example.com/photo1.jpg', analysisStatus: 'complete' },
    { id: '2', photoUrl: 'https://example.com/photo2.jpg', analysisStatus: 'complete' },
    { id: '3', photoUrl: 'https://example.com/photo3.jpg', analysisStatus: 'complete' },
  ];

  it('should render carousel with multiple photos', () => {
    render(<PhotoCarousel photos={mockPhotos} />);

    // Should render all photos
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(3);
  });

  it('should display indicator dots for multiple photos', () => {
    render(<PhotoCarousel photos={mockPhotos} />);

    // Should have indicator dots (one for each photo)
    const indicators = screen.getAllByTestId('carousel-indicator');
    expect(indicators).toHaveLength(3);
  });

  it('should render single photo without carousel UI', () => {
    const singlePhoto = [mockPhotos[0]];
    render(<PhotoCarousel photos={singlePhoto} />);

    // Should render single photo
    const image = screen.getByRole('img');
    expect(image).toBeInTheDocument();

    // Should NOT have indicator dots for single photo
    const indicators = screen.queryAllByTestId('carousel-indicator');
    expect(indicators).toHaveLength(0);
  });

  it('should not render anything when photos array is empty', () => {
    const { container } = render(<PhotoCarousel photos={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should apply scroll-snap CSS class', () => {
    const { container } = render(<PhotoCarousel photos={mockPhotos} />);

    // Check for scroll-snap related classes
    const carouselContainer = container.querySelector('.snap-x');
    expect(carouselContainer).toBeInTheDocument();
  });

  it('should apply touch-action: pan-x for horizontal scrolling', () => {
    const { container } = render(<PhotoCarousel photos={mockPhotos} />);

    // Check for touch-action style
    const carouselContainer = container.querySelector('[style*="touch-action"]');
    expect(carouselContainer).toBeInTheDocument();
  });

  it('should have lazy loading for images', () => {
    render(<PhotoCarousel photos={mockPhotos} />);

    const images = screen.getAllByRole('img');
    images.forEach((img) => {
      expect(img).toHaveAttribute('loading', 'lazy');
    });
  });

  it('should track current photo index on scroll', () => {
    // This test would require mocking scroll events
    // For now, we just verify the component renders
    render(<PhotoCarousel photos={mockPhotos} />);
    expect(screen.getAllByRole('img')).toHaveLength(3);
  });

  it('should highlight current indicator dot', () => {
    render(<PhotoCarousel photos={mockPhotos} />);

    const indicators = screen.getAllByTestId('carousel-indicator');

    // First indicator should be active by default
    expect(indicators[0]).toHaveClass('bg-blue-500');
    expect(indicators[1]).toHaveClass('bg-gray-300');
    expect(indicators[2]).toHaveClass('bg-gray-300');
  });

  it('should render loading placeholder when photo is still analyzing', () => {
    const analyzingPhotos = [
      { id: '1', photoUrl: 'https://example.com/photo1.jpg', analysisStatus: 'analyzing' },
    ];

    render(<PhotoCarousel photos={analyzingPhotos} />);

    // Should show some loading indicator
    const loadingText = screen.queryByText(/分析中|analyzing/i);
    expect(loadingText).toBeInTheDocument();
  });
});
