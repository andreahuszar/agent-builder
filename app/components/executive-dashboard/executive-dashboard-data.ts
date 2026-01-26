// Executive Dashboard Data Generator
// Generates plausible enterprise-scale metrics for executive audiences

export interface ExecutiveDashboardData {
  kpis: {
    activeAgents: number
    invoicesImpacted: number
    totalLinesEvaluated: number
    humanWorkPercentage: number
    agentWorkPercentage: number
    agentRuntimeHours: number
    fteSavings: number
    dollarAmountProcessed: number
    capacityAddedHours: number
  }
  agentActivityByStage: Array<{
    stage: string
    count: number
    percentage: number
    invoicesProcessed: number
  }>
  humanVsAgentWork: Array<{
    date: string
    humanWork: number
    agentWork: number
    totalWork: number
  }>
  fteSavingsOverTime: Array<{
    date: string
    fteSavings: number
    beforeImplementation: number
    afterImplementation: number
  }>
  invoiceProcessingVolume: Array<{
    date: string
    amount: number
    invoiceCount: number
  }>
  cycleTimeImprovement: Array<{
    stage: string
    beforeDays: number
    afterDays: number
    improvementPercent: number
  }>
}

const WORKFLOW_STAGES = [
  { id: 'ingestion', name: 'Ingestion' },
  { id: 'data-capture', name: 'Data Capture' },
  { id: 'verification', name: 'Verification' },
  { id: 'matching', name: 'Matching' },
  { id: 'approval', name: 'Approval' },
  { id: 'posting', name: 'Posting' },
]

// Generate random number within range
const randomBetween = (min: number, max: number) => 
  Math.floor(Math.random() * (max - min + 1)) + min

// Generate random amount
const randomAmount = (min: number, max: number) =>
  Math.round((Math.random() * (max - min) + min) * 100) / 100

// Generate date string
const generateDate = (daysAgo: number = 0) => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString().split('T')[0]
}

// Generate date range array
const generateDateRange = (days: number) => {
  const dates: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    dates.push(generateDate(i))
  }
  return dates
}

export function generateExecutiveDashboardData(dateRangeDays: number = 30, activeAgentsCount?: number, totalLinesEvaluated?: number): ExecutiveDashboardData {
  // Base metrics - enterprise scale
  const activeAgents = activeAgentsCount !== undefined ? activeAgentsCount : randomBetween(75, 150)
  const totalInvoices = randomBetween(8500, 15000)
  const linesEvaluated = totalLinesEvaluated !== undefined ? totalLinesEvaluated : randomBetween(50000, 250000)
  
  // Utilization metrics (60-80% automation target)
  const automationRate = randomBetween(65, 78) / 100
  const agentWorkPercentage = Math.round(automationRate * 100)
  const humanWorkPercentage = 100 - agentWorkPercentage
  
  // Agent runtime - cumulative hours
  const agentRuntimeHours = randomBetween(12000, 25000)
  
  // FTE Savings calculation
  // Before: 12-15 days average, After: 5-7 days average
  const avgCycleTimeBefore = randomBetween(12, 15)
  const avgCycleTimeAfter = randomBetween(5, 7)
  const timeSavedPerInvoice = avgCycleTimeBefore - avgCycleTimeAfter
  const workingDaysPerYear = 250
  const hoursPerDay = 8
  const invoicesPerMonth = totalInvoices
  const hoursSavedPerMonth = (timeSavedPerInvoice * invoicesPerMonth * hoursPerDay) / avgCycleTimeBefore
  const fteSavings = Math.round((hoursSavedPerMonth / (workingDaysPerYear * hoursPerDay / 12)) * 100) / 100
  // Clamp to realistic range
  const finalFteSavings = Math.max(2.0, Math.min(5.5, fteSavings))
  
  // Dollar amount processed
  const dollarAmountProcessed = randomAmount(25000000, 85000000) // $25M - $85M
  
  // Capacity added (agent runtime hours)
  const capacityAddedHours = agentRuntimeHours
  
  // Agent activity by stage
  const stagePercentages = WORKFLOW_STAGES.map(() => randomBetween(8, 25))
  const totalPercentage = stagePercentages.reduce((sum, p) => sum + p, 0)
  
  const stageActivity = WORKFLOW_STAGES.map((stage, index) => {
    const normalizedPercentage = Math.round((stagePercentages[index] / totalPercentage) * 100)
    const invoicesProcessed = Math.round((normalizedPercentage / 100) * totalInvoices)
    return {
      stage: stage.name,
      count: Math.round((normalizedPercentage / 100) * activeAgents),
      percentage: normalizedPercentage,
      invoicesProcessed,
    }
  })
  
  // Human vs Agent work over time
  const dates = generateDateRange(dateRangeDays)
  const humanVsAgentWork = dates.map(date => {
    const baseWork = randomBetween(80, 150)
    const agentWork = Math.round(baseWork * automationRate)
    const humanWork = baseWork - agentWork
    return {
      date,
      humanWork,
      agentWork,
      totalWork: baseWork,
    }
  })
  
  // FTE Savings over time (showing improvement)
  const fteSavingsOverTime = dates.map((date, index) => {
    // Gradual improvement over time
    const progress = index / dates.length
    const currentFte = 0.5 + (finalFteSavings - 0.5) * progress
    return {
      date,
      fteSavings: Math.round(currentFte * 100) / 100,
      beforeImplementation: avgCycleTimeBefore,
      afterImplementation: avgCycleTimeAfter - (progress * 1.5), // Shows improvement
    }
  })
  
  // Invoice processing volume
  const invoiceProcessingVolume = dates.map(date => {
    const baseAmount = randomAmount(500000, 3500000)
    const invoiceCount = randomBetween(200, 600)
    return {
      date,
      amount: baseAmount,
      invoiceCount,
    }
  })
  
  // Cycle time improvement by stage
  const cycleTimeImprovement = WORKFLOW_STAGES.map(stage => {
    const beforeDays = randomBetween(2, 4)
    const afterDays = randomBetween(0.5, 1.5)
    const improvement = ((beforeDays - afterDays) / beforeDays) * 100
    return {
      stage: stage.name,
      beforeDays: Math.round(beforeDays * 10) / 10,
      afterDays: Math.round(afterDays * 10) / 10,
      improvementPercent: Math.round(improvement * 10) / 10,
    }
  })
  
  return {
    kpis: {
      activeAgents,
      invoicesImpacted: totalInvoices,
      totalLinesEvaluated: linesEvaluated,
      humanWorkPercentage,
      agentWorkPercentage,
      agentRuntimeHours,
      fteSavings: finalFteSavings,
      dollarAmountProcessed,
      capacityAddedHours,
    },
    agentActivityByStage: stageActivity,
    humanVsAgentWork,
    fteSavingsOverTime,
    invoiceProcessingVolume,
    cycleTimeImprovement,
  }
}
