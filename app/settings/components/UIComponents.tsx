'use client';

import { useState, useEffect } from 'react';
import { Mail, Database } from 'lucide-react';
import { Instruction } from '../types';

// Stat Card Component
export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

// Hexagon Icon Component - SVG-based with gradient and shadow
export function HexagonIcon({ type }: { type: Instruction['type'] }) {
  const colorMap = {
    automation: {
      gradient: ['#4ade80', '#16a34a'], // green-400 → green-600
      shadow: 'rgba(74, 222, 128, 0.3)',
    },
    exception: {
      gradient: ['#fb923c', '#ea580c'], // orange-400 → orange-600
      shadow: 'rgba(251, 146, 60, 0.3)',
    },
    routing: {
      gradient: ['#c084fc', '#9333ea'], // purple-400 → purple-600
      shadow: 'rgba(192, 132, 252, 0.3)',
    },
    validation: {
      gradient: ['#60a5fa', '#2563eb'], // blue-400 → blue-600
      shadow: 'rgba(96, 165, 250, 0.3)',
    },
  };

  const colors = colorMap[type];
  const gradientId = `hex-gradient-${type}`;

  // SVG hexagon path
  const hexPath = "M 36.027 11.2 Q 39.491 13.2 39.491 17.2 L 39.491 30.8 Q 39.491 34.8 36.027 36.8 L 24.249 43.6 Q 20.785 45.6 17.321 43.6 L 5.543 36.8 Q 2.078 34.8 2.078 30.8 L 2.078 17.2 Q 2.078 13.2 5.543 11.2 L 17.321 4.4 Q 20.785 2.4 24.249 4.4 Z";

  // Icon paths for each type (white stroke icons)
  const iconPaths: Record<string, React.ReactNode> = {
    automation: (
      // CircleCheckBig icon
      <>
        <path d="M21.801 10A10 10 0 1 1 17 3.335" />
        <path d="m9 11 3 3L22 4" />
      </>
    ),
    exception: (
      // AlertCircle icon
      <>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </>
    ),
    routing: (
      // Users icon
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    validation: (
      // Shield icon
      <>
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      </>
    ),
  };

  return (
    <div
      className="relative flex-shrink-0 transition-all duration-200 hover:scale-105"
      style={{
        width: '32px',
        height: '37px',
        filter: `drop-shadow(${colors.shadow} 0px 3px 4px)`,
      }}
    >
      <svg
        width="32"
        height="37"
        viewBox="0 0 41.569 48"
        className="transition-all duration-200"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.gradient[0]} />
            <stop offset="100%" stopColor={colors.gradient[1]} />
          </linearGradient>
        </defs>
        <path
          d={hexPath}
          fill={`url(#${gradientId})`}
          className="transition-all duration-200"
        />
        <foreignObject x="10" y="13" width="22" height="22">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {iconPaths[type]}
          </svg>
        </foreignObject>
      </svg>
    </div>
  );
}

// Confidence Bar Component
export function ConfidenceBar({ value }: { value: number }) {
  const getBarColor = (val: number) => {
    if (val >= 80) return 'bg-green-500';
    if (val >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${getBarColor(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-700">{value}%</span>
    </div>
  );
}

// Type Pill Component
export function TypePill({ type }: { type: Instruction['type'] }) {
  const styles = {
    automation: 'bg-gray-100 text-gray-700 border border-gray-300',
    exception: 'bg-gray-100 text-gray-700 border border-gray-300',
    routing: 'bg-gray-100 text-gray-700 border border-gray-300',
    validation: 'bg-gray-100 text-gray-700 border border-gray-300',
  };

  // Capitalize first letter
  const label = type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${styles[type]}`}>
      {label}
    </span>
  );
}

// Integration Pill Component
export function IntegrationPill({ name }: { name: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    EMAIL: <Mail className="w-2.5 h-2.5 mr-0.5" />,
    ERP: <Database className="w-2.5 h-2.5 mr-0.5" />,
  };

  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
      {iconMap[name]}
      {name}
    </span>
  );
}

// Status Pill Component
export function StatusPill({ status }: { status: Instruction['status'] }) {
  const styles = {
    Active: 'bg-green-100 text-green-700 border border-green-300',
    Draft: 'bg-gray-100 text-gray-600 border border-gray-300',
    Paused: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

// Activity Status Dot Component
export function ActivityDot({ status }: { status: 'success' | 'warning' | 'error' }) {
  const colors = {
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
  };

  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status]}`} />;
}

// Animated Text Component - word by word animation
export function AnimatedText({ text, speed = 50 }: { text: string; speed?: number }) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayedText('');
    setIsComplete(false);

    const words = text.split(' ');
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < words.length) {
        setDisplayedText(words.slice(0, currentIndex + 1).join(' '));
        currentIndex++;
      } else {
        clearInterval(interval);
        setIsComplete(true);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span>
      {displayedText}
      {!isComplete && <span className="animate-pulse">|</span>}
    </span>
  );
}
