import { useState, useEffect, useCallback } from 'react';

interface UseScrollPaginationOptions {
  pageSize?: number;
  thresholdPx?: number;
}

export function useScrollPagination<T>(
  items: T[],
  options: UseScrollPaginationOptions = {}
) {
  const { pageSize = 8, thresholdPx = 200 } = options;
  const [visibleCount, setVisibleCount] = useState<number>(pageSize);

  // Reset visibleCount whenever the source list length or filter changes
  useEffect(() => {
    setVisibleCount(pageSize);
  }, [items.length, pageSize]);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + pageSize, items.length));
  }, [items.length, pageSize]);

  // Window scroll event listener for auto-pagination on screen scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (visibleCount >= items.length) return;

      const scrollPosition = window.innerHeight + window.scrollY;
      const bottomThreshold = document.documentElement.scrollHeight - thresholdPx;

      if (scrollPosition >= bottomThreshold) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [visibleCount, items.length, thresholdPx, loadMore]);

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(totalPages, Math.ceil(visibleCount / pageSize));

  return {
    visibleItems,
    visibleCount,
    totalCount: items.length,
    hasMore,
    loadMore,
    currentPage,
    totalPages,
  };
}

