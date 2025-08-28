/**
 * Performance monitoring utilities
 */

declare global {
  interface Window {
    gtag?: (command: string, eventName: string, parameters: Record<string, unknown>) => void;
  }
}

/**
 * Measure component render time
 */
export const measureRenderTime = (componentName: string) => {
  if (typeof window === 'undefined') return;
  
  const startMark = `${componentName}-render-start`;
  const endMark = `${componentName}-render-end`;
  
  performance.mark(startMark);
  
  return () => {
    performance.mark(endMark);
    performance.measure(`${componentName}-render`, startMark, endMark);
    
    const measure = performance.getEntriesByName(`${componentName}-render`)[0];
    
    if (measure && measure.duration > 16.67) { // More than one frame (60fps)
      console.warn(`Slow render detected in ${componentName}: ${measure.duration.toFixed(2)}ms`);
    }
    
    // Clean up
    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
    performance.clearMeasures(`${componentName}-render`);
  };
};

/**
 * Track Web Vitals
 */
interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

export const trackWebVitals = (metric: WebVitalsMetric) => {
  const { name, value, rating } = metric;
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vital] ${name}:`, {
      value: value.toFixed(2),
      rating,
    });
  }
  
  // Send to analytics in production
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', name, {
      value: Math.round(value),
      metric_rating: rating,
      non_interaction: true,
    });
  }
};

/**
 * Debounce function for performance optimization
 */
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function for performance optimization
 */
export const throttle = <T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Lazy load images with Intersection Observer
 */
export const lazyLoadImages = () => {
  if (typeof window === 'undefined') return;
  
  const images = document.querySelectorAll('img[data-lazy]');
  
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        const src = img.dataset.lazy;
        
        if (src) {
          img.src = src;
          img.removeAttribute('data-lazy');
          observer.unobserve(img);
        }
      }
    });
  });
  
  images.forEach(img => imageObserver.observe(img));
  
  return () => {
    images.forEach(img => imageObserver.unobserve(img));
  };
};

/**
 * Prefetch critical resources
 */
export const prefetchResources = (urls: string[]) => {
  if (typeof window === 'undefined') return;
  
  urls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  });
};

/**
 * Monitor long tasks
 */
export const monitorLongTasks = (callback: (duration: number) => void) => {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;
  
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.duration > 50) { // Tasks longer than 50ms
        callback(entry.duration);
      }
    }
  });
  
  observer.observe({ entryTypes: ['longtask'] });
  
  return () => observer.disconnect();
};