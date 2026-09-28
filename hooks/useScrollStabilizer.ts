import { useRef, useEffect, useLayoutEffect, useCallback } from 'react';

export interface ScrollStabilizerOptions {
  enabled?: boolean;
  elementRef?: React.RefObject<HTMLElement | null>;
  deps?: React.DependencyList;
}

/**
 * Custom hook to stabilize and preserve scroll offset before and after state-dependent re-renders,
 * specifically during button clicks and interactive controls across steps.
 */
export function useScrollStabilizer({
  enabled = true,
  elementRef,
  deps = []
}: ScrollStabilizerOptions = {}) {
  const scrollOffsetRef = useRef<{ scrollY: number; scrollX: number; timestamp: number; active: boolean }>({
    scrollY: 0,
    scrollX: 0,
    timestamp: 0,
    active: false,
  });

  const getScrollContainer = useCallback(() => {
    if (elementRef && elementRef.current) {
      return elementRef.current;
    }
    return null;
  }, [elementRef]);

  const captureScroll = useCallback(() => {
    if (!enabled) return;
    const container = getScrollContainer();
    if (container) {
      scrollOffsetRef.current = {
        scrollY: container.scrollTop,
        scrollX: container.scrollLeft,
        timestamp: Date.now(),
        active: true,
      };
    } else {
      scrollOffsetRef.current = {
        scrollY: window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0,
        scrollX: window.scrollX || window.pageXOffset || document.documentElement.scrollLeft || 0,
        timestamp: Date.now(),
        active: true,
      };
    }
  }, [enabled, getScrollContainer]);

  const restoreScroll = useCallback(() => {
    if (!enabled || !scrollOffsetRef.current.active) return;
    const targetY = scrollOffsetRef.current.scrollY;
    const targetX = scrollOffsetRef.current.scrollX;
    
    // Don't restore if timestamp is too old (> 2500ms)
    if (Date.now() - scrollOffsetRef.current.timestamp > 2500) {
      scrollOffsetRef.current.active = false;
      return;
    }

    const container = getScrollContainer();
    if (container) {
      if (Math.abs(container.scrollTop - targetY) > 2) {
        container.scrollTop = targetY;
        container.scrollLeft = targetX;
      }
    } else {
      const currentY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
      if (Math.abs(currentY - targetY) > 2) {
        window.scrollTo({
          top: targetY,
          left: targetX,
          behavior: 'instant' as ScrollBehavior
        });
      }
    }
  }, [enabled, getScrollContainer]);

  // Intercept button clicks before state updates run
  useEffect(() => {
    if (!enabled) return;

    const handlePointerDownOrClick = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Check if target or parent is an interactive button or control
      const isButton = target.closest('button, [role="button"], input[type="button"], input[type="submit"], .btn, .nav-link, .menu-item-btn');
      if (isButton) {
        captureScroll();
      }
    };

    window.addEventListener('mousedown', handlePointerDownOrClick, { capture: true, passive: true });
    window.addEventListener('touchstart', handlePointerDownOrClick, { capture: true, passive: true });
    window.addEventListener('click', handlePointerDownOrClick, { capture: true, passive: true });

    return () => {
      window.removeEventListener('mousedown', handlePointerDownOrClick, { capture: true });
      window.removeEventListener('touchstart', handlePointerDownOrClick, { capture: true });
      window.removeEventListener('click', handlePointerDownOrClick, { capture: true });
    };
  }, [enabled, captureScroll]);

  const preserveScroll = useCallback(<T extends (...args: any[]) => any>(fn: T): T => {
    return ((...args: Parameters<T>): ReturnType<T> => {
      captureScroll();
      const result = fn(...args);
      // Immediately trigger restoration attempt after microtask/sync state trigger
      Promise.resolve().then(() => restoreScroll());
      return result;
    }) as T;
  }, [captureScroll, restoreScroll]);

  // Synchronously restore scroll layout offset after React renders
  useLayoutEffect(() => {
    restoreScroll();
    
    // Double check on next animation frame to catch post-layout collapse/expand height shifts
    const rafId = requestAnimationFrame(() => {
      restoreScroll();
    });

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, deps);

  return {
    scrollOffsetRef,
    captureScroll,
    restoreScroll,
    preserveScroll
  };
}

