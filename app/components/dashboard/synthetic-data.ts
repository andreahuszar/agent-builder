// Synthetic data generator for dashboard
// This creates realistic-looking invoice and financial data for visualization

export interface DashboardData {
  summary: {
    total_invoices: number
    total_amount: number
    date_range_days: number
  }
  status_distribution: Array<{
    status: string
    count: number
    total_amount: number
  }>
  processing_metrics: {
    pending_approval: number
    in_approval: number
    escalated: number
  }
  invoice_trends: Array<{
    date: string
    count: number
    amount: number
  }>
  vendor_metrics: Array<{
    vendor__name: string
    invoice_count: number
    total_amount: number
    avg_amount: number
  }>
  department_metrics: Array<{
    department: string
    invoice_count: number
    total_amount: number
    pending_count: number
  }>
  payment_metrics: {
    paid_invoices: number
    paid_amount: number
    outstanding_invoices: number
    outstanding_amount: number
    overdue_invoices: number
  }
  grouped_status_metrics: {
    my_cases: {
      count: number
      statuses: Array<{ status: string; count: number }>
    }
    in_progress: {
      count: number
      amount: number
      statuses: Array<{ status: string; count: number; amount: number }>
    }
    pending: {
      count: number
      amount: number
      statuses: Array<{ status: string; count: number; amount: number }>
    }
    overdue: {
      count: number
      amount: number
      days_overdue_avg: number | null
    }
    queue: {
      count: number
      amount: number
      oldest_date: string | null
    }
    completed: {
      count: number
      amount: number
      statuses: Array<{ status: string; count: number; amount: number }>
    }
    issues: {
      count: number
      amount: number
      statuses: Array<{ status: string; count: number; amount: number }>
    }
  }
  recent_activity: Array<any>
}

// Generate random number within range
const randomBetween = (min: number, max: number) => 
  Math.floor(Math.random() * (max - min + 1)) + min

// Generate random amount
const randomAmount = (min: number = 100, max: number = 50000) =>
  Math.round((Math.random() * (max - min) + min) * 100) / 100

// Generate date string
const generateDate = (daysAgo: number = 0) => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString().split('T')[0]
}

// Vendor names
const vendors = [
  'Acme Corporation',
  'Global Tech Solutions',
  'Office Supplies Inc',
  'Cloud Services Pro',
  'Marketing Agency Co',
  'Legal Services LLC',
  'Consulting Partners',
  'Software Systems Inc',
  'Hardware Suppliers',
  'Logistics Express',
  'Creative Studios',
  'Data Analytics Corp',
  'Security Services',
  'Maintenance Group',
  'Energy Solutions'
]

// Department names
const departments = [
  'Engineering',
  'Marketing',
  'Sales',
  'Operations',
  'Finance',
  'Human Resources',
  'Legal',
  'Customer Success',
  'Product',
  'IT Infrastructure'
]

// Generate invoice trends for the last N days
const generateInvoiceTrends = (days: number) => {
  const trends = []
  for (let i = days - 1; i >= 0; i--) {
    const date = generateDate(i)
    const dayOfWeek = new Date(date).getDay()
    // Lower volume on weekends
    const baseCount = dayOfWeek === 0 || dayOfWeek === 6 ? 
      randomBetween(3, 8) : randomBetween(8, 25)
    
    trends.push({
      date,
      count: baseCount,
      amount: baseCount * randomAmount(2000, 8000)
    })
  }
  return trends
}

// Generate vendor metrics
const generateVendorMetrics = () => {
  return vendors.slice(0, 10).map(vendor => {
    const count = randomBetween(5, 50)
    const totalAmount = randomAmount(10000, 500000)
    return {
      vendor__name: vendor,
      invoice_count: count,
      total_amount: totalAmount,
      avg_amount: totalAmount / count
    }
  }).sort((a, b) => b.total_amount - a.total_amount)
}

// Generate department metrics
const generateDepartmentMetrics = () => {
  return departments.map(dept => ({
    department: dept,
    invoice_count: randomBetween(10, 80),
    total_amount: randomAmount(50000, 800000),
    pending_count: randomBetween(0, 15)
  })).sort((a, b) => b.total_amount - a.total_amount)
}

// Generate status distribution
const generateStatusDistribution = () => {
  const statuses = [
    { status: 'draft', weight: 0.15 },
    { status: 'processing', weight: 0.10 },
    { status: 'review', weight: 0.08 },
    { status: 'pending_approval', weight: 0.12 },
    { status: 'in_approval', weight: 0.10 },
    { status: 'approved', weight: 0.20 },
    { status: 'paid', weight: 0.18 },
    { status: 'escalated', weight: 0.05 },
    { status: 'cancelled', weight: 0.02 }
  ]
  
  const totalInvoices = randomBetween(150, 250)
  
  return statuses.map(s => ({
    status: s.status,
    count: Math.floor(totalInvoices * s.weight),
    total_amount: randomAmount(100000, 2000000)
  }))
}

// Generate grouped status metrics
const generateGroupedStatusMetrics = () => {
  return {
    my_cases: {
      count: randomBetween(5, 15),
      statuses: [
        { status: 'review', count: randomBetween(2, 5) },
        { status: 'pending_approval', count: randomBetween(1, 5) },
        { status: 'in_approval', count: randomBetween(1, 5) }
      ]
    },
    in_progress: {
      count: randomBetween(20, 45),
      amount: randomAmount(150000, 500000),
      statuses: [
        { status: 'processing', count: randomBetween(5, 15), amount: randomAmount(50000, 150000) },
        { status: 'review', count: randomBetween(5, 15), amount: randomAmount(50000, 150000) },
        { status: 'in_approval', count: randomBetween(5, 15), amount: randomAmount(50000, 200000) }
      ]
    },
    pending: {
      count: randomBetween(15, 35),
      amount: randomAmount(200000, 600000),
      statuses: [
        { status: 'draft', count: randomBetween(5, 15), amount: randomAmount(50000, 200000) },
        { status: 'pending_approval', count: randomBetween(10, 20), amount: randomAmount(150000, 400000) }
      ]
    },
    overdue: {
      count: randomBetween(8, 20),
      amount: randomAmount(100000, 400000),
      days_overdue_avg: randomBetween(5, 30)
    },
    queue: {
      count: randomBetween(10, 25),
      amount: randomAmount(150000, 450000),
      oldest_date: generateDate(randomBetween(3, 15))
    },
    completed: {
      count: randomBetween(60, 120),
      amount: randomAmount(800000, 2000000),
      statuses: [
        { status: 'approved', count: randomBetween(30, 60), amount: randomAmount(400000, 1000000) },
        { status: 'paid', count: randomBetween(30, 60), amount: randomAmount(400000, 1000000) }
      ]
    },
    issues: {
      count: randomBetween(3, 12),
      amount: randomAmount(50000, 200000),
      statuses: [
        { status: 'escalated', count: randomBetween(2, 8), amount: randomAmount(30000, 150000) },
        { status: 'disputed', count: randomBetween(1, 4), amount: randomAmount(20000, 50000) }
      ]
    }
  }
}

// Main function to generate complete dashboard data
export const generateDashboardData = (dateRange: string = '30'): DashboardData => {
  const days = parseInt(dateRange)
  const statusDist = generateStatusDistribution()
  const totalInvoices = statusDist.reduce((sum, s) => sum + s.count, 0)
  const totalAmount = statusDist.reduce((sum, s) => sum + s.total_amount, 0)
  
  const data: DashboardData = {
    summary: {
      total_invoices: totalInvoices,
      total_amount: totalAmount,
      date_range_days: days
    },
    status_distribution: statusDist,
    processing_metrics: {
      pending_approval: randomBetween(15, 35),
      in_approval: randomBetween(10, 25),
      escalated: randomBetween(2, 8)
    },
    invoice_trends: generateInvoiceTrends(days),
    vendor_metrics: generateVendorMetrics(),
    department_metrics: generateDepartmentMetrics(),
    payment_metrics: {
      paid_invoices: randomBetween(40, 80),
      paid_amount: randomAmount(500000, 1500000),
      outstanding_invoices: randomBetween(60, 120),
      outstanding_amount: randomAmount(800000, 2000000),
      overdue_invoices: randomBetween(8, 20)
    },
    grouped_status_metrics: generateGroupedStatusMetrics(),
    recent_activity: []
  }
  
  return data
}

// ROI Initiatives data
export const roiInitiatives = [
  { 
    id: 1, 
    name: 'Negotiate 2/10 Net 30 with Top 5 Vendors', 
    description: 'One-time contract renegotiation for early payment discounts',
    impact: 175000, 
    implementationCost: 15000, 
    frequency: 'Annual',
    timeframe: '90 days setup',
    checked: true 
  },
  { 
    id: 2, 
    name: 'Auto-Approve Invoices Under $500', 
    description: 'Eliminate manual approval for low-risk recurring expenses',
    impact: 120000, 
    implementationCost: 8000, 
    frequency: 'Monthly savings',
    timeframe: '30 days setup',
    checked: true 
  },
  { 
    id: 3, 
    name: 'Weekly Payment Runs → Daily', 
    description: 'Capture more early payment discounts with daily processing',
    impact: 180000, 
    implementationCost: 12000, 
    frequency: 'Monthly savings',
    timeframe: '45 days setup',
    checked: false 
  },
  { 
    id: 4, 
    name: 'Expand Early Payment Program', 
    description: 'Offer 2% discount for payment within 10 days to all vendors',
    impact: 450000, 
    implementationCost: 5000, 
    frequency: 'Monthly savings',
    timeframe: '60 days setup',
    checked: false 
  },
  { 
    id: 5, 
    name: 'Eliminate Paper Invoice Processing', 
    description: 'Mandate electronic invoicing for vendors over $50k annual spend',
    impact: 85000, 
    implementationCost: 25000, 
    frequency: 'Monthly savings',
    timeframe: '120 days setup',
    checked: false 
  }
]