'use client';

import { useReportWebVitals } from 'next/web-vitals';
import { trackWebVitals } from '@/app/utils/performance';

export function WebVitals() {
  useReportWebVitals((metric) => {
    trackWebVitals(metric);
  });

  return null;
}