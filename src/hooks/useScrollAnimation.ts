import { useEffect, useRef, useState } from 'react';

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export const useScrollAnimation = (options: UseScrollAnimationOptions = {}) => {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    triggerOnce = false
  } = options;

  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const triggerAnimation = () => {
      if (hasAnimatedRef.current && triggerOnce) return;
      
      // Force animation retrigger by temporarily removing and re-adding class
      element.classList.remove('animate-on-scroll');
      // Force reflow
      void element.offsetWidth;
      // Re-add class to trigger animation
      requestAnimationFrame(() => {
        element.classList.add('animate-on-scroll');
        hasAnimatedRef.current = true;
      });
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          triggerAnimation();
          setIsVisible(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          // Reset visibility when element leaves viewport to allow retriggering
          element.classList.remove('animate-on-scroll');
          setIsVisible(false);
          hasAnimatedRef.current = false;
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    observer.observe(element);

    // Check if element is already in view on mount (for elements that load above the fold)
    const checkInitialVisibility = () => {
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
      
      const isInView = (
        rect.top < viewportHeight + 100 && // Add some margin
        rect.bottom > -100 &&
        rect.left < viewportWidth + 100 &&
        rect.right > -100
      );

      if (isInView && !hasAnimatedRef.current) {
        // Use a small delay to ensure DOM is ready
        setTimeout(() => {
          triggerAnimation();
          setIsVisible(true);
        }, 100);
      }
    };

    // Check after a delay to ensure layout is complete
    const timeoutId = setTimeout(checkInitialVisibility, 100);

    return () => {
      clearTimeout(timeoutId);
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [threshold, rootMargin, triggerOnce]);

  return { elementRef, isVisible };
};

