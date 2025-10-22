'use client';

import { useState } from 'react';

interface ComplexityCategory {
  name: string;
  value: number;
  count: number;
  percentage: number;
  color: string;
  avgIssues: number;
  estimatedDays: number;
  commonIssues: string[];
}

interface BlockedInvoiceAnalysisProps {
  invoices: any[];
  onCategoryClick?: (category: string) => void;
}

// Possible issue types that can affect invoices
const ISSUE_TYPES = [
  'PO/Invoice Mismatch',
  'Missing GR',
  'Quantity Variance',
  'Missing Approval',
  'Duplicate Suspected',
  'Vendor Issues',
  'Price Tolerance',
  'Line Mismatch',
  'Tax Discrepancy',
  'Currency Issue',
  'Payment Terms',
  'Missing Documentation'
];

export default function BlockedInvoiceAnalysis({ invoices, onCategoryClick }: BlockedInvoiceAnalysisProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Simulate multiple issues per invoice
  const simulateInvoiceIssues = (invoice: any): string[] => {
    // Use invoice ID as seed for consistent random generation
    const seed = invoice.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const random = (min: number, max: number) => {
      const x = Math.sin(seed) * 10000;
      return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
    };

    // Determine number of issues (1-8 with weighted distribution)
    const weights = [30, 25, 20, 10, 8, 4, 2, 1]; // More likely to have fewer issues
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let randomWeight = random(0, totalWeight);
    let issueCount = 1;

    for (let i = 0; i < weights.length; i++) {
      randomWeight -= weights[i];
      if (randomWeight <= 0) {
        issueCount = i + 1;
        break;
      }
    }

    // Select random issues
    const issues: string[] = [];
    const availableIssues = [...ISSUE_TYPES];

    for (let i = 0; i < Math.min(issueCount, availableIssues.length); i++) {
      const index = random(0, availableIssues.length - 1);
      issues.push(availableIssues[index]);
      availableIssues.splice(index, 1);
    }

    return issues;
  };

  // Calculate complexity categories from invoice data
  const calculateComplexityCategories = (): ComplexityCategory[] => {
    // Filter only blocked invoices
    const blockedInvoices = invoices.filter(inv =>
      inv.status === 'requires_review' || inv.status === 'needs_review'
    );

    if (blockedInvoices.length === 0) {
      // Return empty data structure
      return [
        { name: 'Quick Wins', value: 0, count: 0, percentage: 0, color: '#84cc16', avgIssues: 0, estimatedDays: 0, commonIssues: [] },
        { name: 'Simple', value: 0, count: 0, percentage: 0, color: '#f59e0b', avgIssues: 0, estimatedDays: 0, commonIssues: [] },
        { name: 'Medium', value: 0, count: 0, percentage: 0, color: '#f97316', avgIssues: 0, estimatedDays: 0, commonIssues: [] },
        { name: 'Complex', value: 0, count: 0, percentage: 0, color: '#dc2626', avgIssues: 0, estimatedDays: 0, commonIssues: [] }
      ];
    }

    // Group invoices by complexity
    const complexityGroups: Record<string, {
      invoices: any[];
      issues: string[][];
      color: string;
      estimatedDays: number;
    }> = {
      'Quick Wins': { invoices: [], issues: [], color: '#84cc16', estimatedDays: 1 },
      'Simple': { invoices: [], issues: [], color: '#f59e0b', estimatedDays: 2 },
      'Medium': { invoices: [], issues: [], color: '#f97316', estimatedDays: 4 },
      'Complex': { invoices: [], issues: [], color: '#dc2626', estimatedDays: 7 }
    };

    // Categorize each invoice based on issue count
    blockedInvoices.forEach(invoice => {
      const issues = simulateInvoiceIssues(invoice);
      const issueCount = issues.length;

      let category: string;
      if (issueCount === 1) {
        category = 'Quick Wins';
      } else if (issueCount === 2) {
        category = 'Simple';
      } else if (issueCount >= 3 && issueCount <= 5) {
        category = 'Medium';
      } else {
        category = 'Complex';
      }

      complexityGroups[category].invoices.push(invoice);
      complexityGroups[category].issues.push(issues);
    });

    // Calculate statistics for each group
    const totalBlocked = blockedInvoices.length;

    return Object.entries(complexityGroups).map(([name, group]) => {
      const value = group.invoices.reduce((sum, inv) => sum + inv.total, 0);
      const count = group.invoices.length;
      const percentage = totalBlocked > 0 ? Math.round((count / totalBlocked) * 100) : 0;

      // Calculate average issues
      const avgIssues = count > 0
        ? group.issues.reduce((sum, issues) => sum + issues.length, 0) / count
        : 0;

      // Find most common issues in this group
      const issueFrequency: Record<string, number> = {};
      group.issues.flat().forEach(issue => {
        issueFrequency[issue] = (issueFrequency[issue] || 0) + 1;
      });

      const commonIssues = Object.entries(issueFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([issue]) => issue);

      return {
        name,
        value,
        count,
        percentage,
        color: group.color,
        avgIssues: Math.round(avgIssues * 10) / 10,
        estimatedDays: group.estimatedDays,
        commonIssues
      };
    });
  };

  const complexityCategories = calculateComplexityCategories();
  const totalBlockedValue = complexityCategories.reduce((sum, cat) => sum + cat.value, 0);
  const maxValue = Math.max(...complexityCategories.map(cat => cat.value)) * 1.2 || 100000; // Add 20% padding for visual

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-950">Complexity Breakdown</h3>
        <div className="text-right">
          <p className="text-xs text-gray-600">Total Blocked</p>
          <p className="text-sm font-bold text-gray-950">£{totalBlockedValue.toLocaleString()}</p>
        </div>
      </div>

      {/* Complexity Category Bar Chart */}
      <div className="space-y-3">
        {complexityCategories.map((category, index) => (
          <div
            key={index}
            className="group cursor-pointer relative"
            onClick={() => onCategoryClick?.(category.name)}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div className="flex items-center gap-3">
              <div className="w-24 text-xs font-medium text-gray-700 text-right">
                {category.name}
              </div>
              <div className="flex-1 relative">
                <div className="w-full bg-gray-50 rounded-md h-7 overflow-hidden">
                  <div
                    className="h-full rounded-md transition-all duration-300 group-hover:opacity-80 flex items-center justify-between px-2 relative"
                    style={{
                      width: category.value > 0 ? `${Math.max(5, (category.value / maxValue) * 100)}%` : '0%',
                      backgroundColor: category.color
                    }}
                  >
                    {category.value > 0 && (
                      <span className="text-xs font-medium text-white">
                        £{(category.value / 1000).toFixed(0)}k
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="w-12 text-xs text-gray-600 text-right group-hover:text-gray-900 transition-colors">
                {category.count} inv
              </div>
            </div>

            {/* Tooltip */}
            {hoveredIndex === index && category.count > 0 && (
              <div className="absolute z-10 left-24 top-8 bg-white border border-gray-200 rounded-lg shadow-xl px-3 py-2 text-xs min-w-[280px] pointer-events-none">
                <div className="font-semibold text-gray-950 mb-2 flex items-center gap-2">
                  <span>{category.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: category.color }}>
                    {category.avgIssues === 1 ? '1 issue' :
                     category.name === 'Simple' ? '2 issues' :
                     category.name === 'Medium' ? '3-5 issues' :
                     '>5 issues'}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Value:</span>
                    <span className="font-semibold text-gray-950">£{category.value.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Invoice Count:</span>
                    <span className="font-medium text-gray-950">{category.count}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Issues:</span>
                    <span className="font-medium text-gray-950">{category.avgIssues}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">% of Blocked:</span>
                    <span className="font-medium text-gray-950">{category.percentage}%</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Est. Resolution:</span>
                    <span className="font-medium text-gray-950">
                      {category.estimatedDays} {category.estimatedDays === 1 ? 'day' : 'days'}
                    </span>
                  </div>

                  {category.commonIssues.length > 0 && (
                    <div className="pt-1 border-t">
                      <span className="text-gray-600">Common Issues:</span>
                      <div className="mt-1 space-y-0.5">
                        {category.commonIssues.map((issue, i) => (
                          <div key={i} className="text-[10px] text-gray-700">• {issue}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-1 border-t">
                    <span className="text-gray-600">Action: </span>
                    <span className="font-semibold text-purple-600">
                      {category.name === 'Quick Wins' ? 'Resolve immediately' :
                       category.name === 'Simple' ? 'Schedule for review' :
                       category.name === 'Medium' ? 'Assign to specialist' :
                       'Escalate to management'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Show message if no blocked invoices */}
      {complexityCategories.every(cat => cat.count === 0) && (
        <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
          <p className="text-sm text-green-700 font-medium">No blocked invoices</p>
          <p className="text-xs text-green-600 mt-1">All invoices are processing normally</p>
        </div>
      )}
    </div>
  );
}