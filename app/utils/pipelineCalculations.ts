// Pipeline calculation utilities for invoice processing
export interface PipelineStage {
  label: string;
  count: number;
  color: string;
  statuses: string[];
  value?: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  vendor_name_snapshot: string;
  invoice_date: string;
  due_date: string;
  currency: string;
  total: number;
  status: string;
  match_status?: string;
  approval_status?: string;
  assigned_to?: string;
}

// Calculate invoice counts for each pipeline stage
export const calculatePipelineCounts = (invoices: Invoice[]): PipelineStage[] => {
  const stages: PipelineStage[] = [
    {
      label: 'PROCESSING',
      count: 0,
      value: 0,
      color: 'purple',
      statuses: ['pending', 'draft', 'processing', 'validating', 'submitted']
    },
    {
      label: 'EXCEPTIONS',
      count: 0,
      value: 0,
      color: 'red',
      statuses: ['requires_review', 'on_hold', 'exception', 'pending_review', 'error']
    },
    {
      label: 'APPROVAL',
      count: 0,
      value: 0,
      color: 'orange',
      statuses: ['pending_approval', 'awaiting_approval']
    },
    {
      label: 'PAYMENT READY',
      count: 0,
      value: 0,
      color: 'green',
      statuses: ['approved', 'posted', 'ready_for_payment', 'approved_ready_for_payment']
    }
  ];

  // Count invoices and sum values for each stage
  invoices.forEach(invoice => {
    const status = invoice.status?.toLowerCase() || 'pending';
    const matchStatus = invoice.match_status?.toLowerCase() || '';
    
    // Determine which stage the invoice belongs to
    let stageIndex = -1;
    
    // Check if it's an exception (has issues or specific exception statuses)
    if (stages[1].statuses.includes(status) || 
        matchStatus === 'unmatched' || 
        matchStatus === 'partial' ||
        matchStatus === 'exception' ||  // Added check for 'exception' match_status
        status === 'rejected' ||
        status === 'void') {
      stageIndex = 1; // EXCEPTIONS
    }
    // Check if it's pending approval
    else if (stages[2].statuses.includes(status)) {
      stageIndex = 2; // APPROVAL
    }
    // Check if it's payment ready
    else if (stages[3].statuses.includes(status) || status === 'paid') {
      stageIndex = 3; // PAYMENT READY
    }
    // Default to processing for all other statuses (including when no status)
    else {
      stageIndex = 0; // PROCESSING
    }
    
    // Update count and value for the appropriate stage
    if (stageIndex >= 0) {
      stages[stageIndex].count++;
      // Parse total as float to handle decimal/numeric types from database
      const totalValue = typeof invoice.total === 'string' ? parseFloat(invoice.total) : (invoice.total || 0);
      stages[stageIndex].value = (stages[stageIndex].value || 0) + totalValue;
    }
  });

  return stages;
};

// Get total pipeline value
export const getTotalPipelineValue = (stages: PipelineStage[]): number => {
  return stages.reduce((total, stage) => total + (stage.value || 0), 0);
};

// Get total invoice count in pipeline
export const getTotalPipelineCount = (stages: PipelineStage[]): number => {
  return stages.reduce((total, stage) => total + stage.count, 0);
};

// Format currency value
export const formatPipelineValue = (value: number, currency: string = 'USD'): string => {
  // Handle NaN, undefined, or null values
  if (!value || isNaN(value)) {
    return '$0';
  }
  
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `$${Math.round(value / 1000)}K`;
  } else {
    return `$${Math.round(value)}`;
  }
};

// Get stage statistics for collapsed view
export const getCollapsedStats = (stages: PipelineStage[]) => {
  const exceptions = stages.find(s => s.label === 'EXCEPTIONS')?.count || 0;
  const approvals = stages.find(s => s.label === 'APPROVAL')?.count || 0;
  const totalCount = getTotalPipelineCount(stages);
  const totalValue = getTotalPipelineValue(stages);
  
  return {
    exceptions,
    approvals,
    totalCount,
    totalValue
  };
};