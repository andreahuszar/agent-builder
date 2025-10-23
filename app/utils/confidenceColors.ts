/**
 * Confidence-based color scheme utility
 * Returns consistent colors for confidence levels across the app
 */

export interface ConfidenceColors {
  highlight: string;      // Background color for document highlights
  pill: {
    bg: string;          // Background for pill badges
    text: string;        // Text color for pill badges
    border: string;      // Border color for pill badges
  };
  outline: string;       // Ring color for focus outlines
}

/**
 * Get color scheme based on confidence percentage
 * @param confidence - Confidence value between 0 and 1
 * @returns Color scheme object
 */
export function getConfidenceColors(confidence: number): ConfidenceColors {
  const confidencePercent = confidence * 100;

  if (confidencePercent >= 90) {
    // High confidence - Purple (matches ticket badge style)
    return {
      highlight: 'bg-purple-300',
      pill: {
        bg: 'bg-purple-100',
        text: 'text-purple-900',
        border: '',
      },
      outline: 'ring-purple-500',
    };
  } else if (confidencePercent >= 60) {
    // Medium confidence - Orange (matches ticket badge style)
    return {
      highlight: 'bg-orange-300',
      pill: {
        bg: 'bg-orange-100',
        text: 'text-orange-900',
        border: '',
      },
      outline: 'ring-orange-500',
    };
  } else {
    // Low confidence - Red (matches ticket badge style)
    return {
      highlight: 'bg-red-300',
      pill: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: '',
      },
      outline: 'ring-red-500',
    };
  }
}

/**
 * Get confidence level label
 * @param confidence - Confidence value between 0 and 1
 * @returns Human-readable confidence level
 */
export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  const confidencePercent = confidence * 100;

  if (confidencePercent >= 90) return 'high';
  if (confidencePercent >= 60) return 'medium';
  return 'low';
}
