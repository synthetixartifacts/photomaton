import { useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Whether currently loading */
  loading: boolean;
  /** Function to call when scrolled near the end */
  onLoadMore: () => void;
  /** Distance from end (in pixels) to trigger load more (default: 100) */
  threshold?: number;
  /** Whether infinite scroll is enabled (default: true) */
  enabled?: boolean;
  /** Scroll direction: 'vertical' or 'horizontal' (default: 'vertical') */
  direction?: 'vertical' | 'horizontal';
}

/**
 * Hook for implementing infinite scroll behavior
 * Returns a ref to attach to the scrollable container
 */
export function useInfiniteScroll({
  hasMore,
  loading,
  onLoadMore,
  threshold = 100,
  enabled = true,
  direction = 'vertical',
}: UseInfiniteScrollOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef(onLoadMore);

  // Keep callback ref up to date
  useEffect(() => {
    loadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  const handleScroll = useCallback(() => {
    if (!enabled || loading || !hasMore) return;

    const container = containerRef.current;
    if (!container) return;

    let distanceFromEnd: number;

    if (direction === 'horizontal') {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      distanceFromEnd = scrollWidth - scrollLeft - clientWidth;
    } else {
      const { scrollTop, scrollHeight, clientHeight } = container;
      distanceFromEnd = scrollHeight - scrollTop - clientHeight;
    }

    if (distanceFromEnd < threshold) {
      loadMoreRef.current();
    }
  }, [enabled, loading, hasMore, threshold, direction]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    container.addEventListener('scroll', handleScroll, { passive: true });

    // Check on mount in case content doesn't fill the container
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll, enabled]);

  return containerRef;
}
