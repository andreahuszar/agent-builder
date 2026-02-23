'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bot, TrendingUp, TrendingDown, Clock, DollarSign, Zap, 
  CheckCircle, XCircle, Users, AlertTriangle, RefreshCw,
  BarChart3, Brain, Target, Award, Activity
} from 'lucide-react';
import { 
  generateAIMetrics, 
  getAgentsByStage, 
  getTouchlessRateTrend, 
  getProcessingVolume,
  getCostSavingsBreakdown,
  getAgentPerformanceRankings,
  AgentMetrics 
} from '@/app/services/aiMetricsService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function AIInsightsDashboard() {
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setRefreshing(true);
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    const data = generateAIMetrics();
    setMetrics(data);
    setLoading(false);
    setRefreshing(false);
  };

  if (loading || !metrics) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading AI insights...</p>
        </div>
      </div>
    );
  }

  const agentsByStage = getAgentsByStage();
  const touchlessRateTrend = getTouchlessRateTrend();
  const processingVolume = getProcessingVolume();
  const costSavings = getCostSavingsBreakdown();
  const agentPerformance = getAgentPerformanceRankings();

  const touchlessImprovement = metrics.touchlessRate - metrics.touchlessRateWithoutAgents;
  const costSavingsPercent = ((metrics.avgCostPerInvoiceWithoutAgents - metrics.avgCostPerInvoice) / metrics.avgCostPerInvoiceWithoutAgents) * 100;
  const timeSavingsPercent = ((metrics.avgProcessingTimeWithoutAgentsMinutes - metrics.avgProcessingTimeMinutes) / metrics.avgProcessingTimeWithoutAgentsMinutes) * 100;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-950 flex items-center gap-3">
              <Brain className="h-8 w-8 text-purple-600" />
              AI Productivity Dashboard
            </h1>
            <p className="text-gray-500 mt-2">
              Monitor agent performance, automation metrics, and cost savings in real-time
            </p>
          </div>
          <button
            onClick={loadMetrics}
            disabled={refreshing}
            className="px-4 py-2 bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Active Agents */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Total Active Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-gray-950">{metrics.totalActiveAgents}</p>
                <p className="text-xs text-gray-500 mt-1">{metrics.unusedAgentCount} inactive</p>
              </div>
              <Bot className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        {/* Touchless Rate */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Touchless Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-gray-950">{metrics.touchlessRate.toFixed(1)}%</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <p className="text-xs text-green-600 font-medium">
                    +{touchlessImprovement.toFixed(1)}pp vs baseline
                  </p>
                </div>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        {/* Hours Saved */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Hours Saved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-gray-950">{metrics.hoursSaved.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">{metrics.fteSaved.toFixed(1)} FTE saved</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        {/* Cost Savings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Avg Cost Per Invoice</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-gray-950">${metrics.avgCostPerInvoice.toFixed(2)}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingDown className="h-3 w-3 text-green-600" />
                  <p className="text-xs text-green-600 font-medium">
                    -{costSavingsPercent.toFixed(0)}% vs ${metrics.avgCostPerInvoiceWithoutAgents.toFixed(2)}
                  </p>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-gray-500 mb-1">Invoices Touched</p>
            <p className="text-2xl font-bold text-gray-950">{metrics.invoicesTouchedByAgents.toLocaleString()}</p>
            <p className="text-xs text-purple-600 font-medium mt-1">
              {metrics.invoicesTouchedByAgentsPercent.toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-gray-500 mb-1">Avg Processing Time</p>
            <p className="text-2xl font-bold text-gray-950">{metrics.avgProcessingTimeMinutes.toFixed(1)}m</p>
            <p className="text-xs text-green-600 font-medium mt-1">
              -{timeSavingsPercent.toFixed(0)}% faster
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-gray-500 mb-1">Agent Error Rate</p>
            <p className="text-2xl font-bold text-gray-950">{metrics.agentErrorRate}</p>
            <p className="text-xs text-gray-500 mt-1">per 1,000 invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-gray-500 mb-1">Exception Rate</p>
            <p className="text-2xl font-bold text-gray-950">{metrics.exceptionRate.toFixed(1)}%</p>
            <p className="text-xs text-gray-500 mt-1">of total invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-gray-500 mb-1">Exceptions Fixed</p>
            <p className="text-2xl font-bold text-gray-950">{metrics.exceptionsFixedByAgents.toLocaleString()}</p>
            <p className="text-xs text-purple-600 font-medium mt-1">
              {((metrics.exceptionsFixedByAgents / (metrics.exceptionsFixedByAgents + metrics.exceptionsFixedByHumans)) * 100).toFixed(0)}% by AI
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-gray-500 mb-1">Interventions Avoided</p>
            <p className="text-2xl font-bold text-gray-950">{metrics.humanInterventionsAvoided.toLocaleString()}</p>
            <p className="text-xs text-green-600 font-medium mt-1">
              human reviews saved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Touchless Rate Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-950">Touchless Rate Trend</CardTitle>
            <CardDescription>Last 12 months - with vs without AI agents</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={touchlessRateTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  stroke="#d1d5db"
                />
                <YAxis 
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  stroke="#d1d5db"
                  domain={[0, 100]}
                  label={{ value: 'Touchless Rate (%)', angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 12 } }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '12px' }}
                  iconType="line"
                />
                <Line 
                  type="monotone" 
                  dataKey="withAgents" 
                  name="With AI Agents"
                  stroke="#7c3aed" 
                  strokeWidth={3}
                  dot={{ fill: '#7c3aed', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="withoutAgents" 
                  name="Without AI (Baseline)"
                  stroke="#9ca3af" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#9ca3af', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Processing Volume Stacked Bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-950">Invoice Processing Volume</CardTitle>
            <CardDescription>Last 6 months - by automation level</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={processingVolume}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  stroke="#d1d5db"
                />
                <YAxis 
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  stroke="#d1d5db"
                  label={{ value: 'Invoice Count', angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 12 } }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => value.toLocaleString()}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '12px' }}
                />
                <Bar dataKey="fullyAutomated" name="Fully Automated" stackId="a" fill="#10b981" />
                <Bar dataKey="aiAssisted" name="AI-Assisted" stackId="a" fill="#7c3aed" />
                <Bar dataKey="humanAssisted" name="Human-Assisted" stackId="a" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Agent Breakdown by Stage */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-950">Agents by Workflow Stage</CardTitle>
          <CardDescription>Active agents organized by invoice processing stage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {agentsByStage.map((stage) => (
              <div key={stage.stage}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-950">{stage.stage}</h3>
                  <span className="text-xs text-gray-500">{stage.count} agent{stage.count !== 1 ? 's' : ''}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {stage.agents.map((agent) => (
                    <div
                      key={agent.name}
                      className={`p-3 rounded-lg border ${
                        agent.active 
                          ? 'bg-purple-50 border-purple-200' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-950">{agent.name}</p>
                          {agent.active && (
                            <div className="flex items-center gap-1 mt-1">
                              <CheckCircle className="h-3 w-3 text-green-600" />
                              <span className="text-xs text-green-600 font-medium">
                                {agent.performanceScore}% accuracy
                              </span>
                            </div>
                          )}
                          {!agent.active && (
                            <div className="flex items-center gap-1 mt-1">
                              <XCircle className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-500">Inactive</span>
                            </div>
                          )}
                        </div>
                        <Zap className={`h-4 w-4 ${agent.active ? 'text-purple-600' : 'text-gray-400'}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cost Savings Breakdown */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-950">Annual Cost Savings Breakdown</CardTitle>
          <CardDescription>Financial impact of AI automation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs text-gray-500 mb-1">Labor Cost Savings</p>
              <p className="text-2xl font-bold text-gray-950">${(costSavings.laborCostSavings / 1000).toFixed(0)}K</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-gray-500 mb-1">Error Reduction</p>
              <p className="text-2xl font-bold text-gray-950">${(costSavings.errorReductionSavings / 1000).toFixed(0)}K</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-xs text-gray-500 mb-1">Payment Discounts</p>
              <p className="text-2xl font-bold text-gray-950">${(costSavings.fasterPaymentDiscounts / 1000).toFixed(0)}K</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-xs text-gray-500 mb-1">Exception Handling</p>
              <p className="text-2xl font-bold text-gray-950">${(costSavings.exceptionHandlingReduction / 1000).toFixed(0)}K</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-purple-100 to-green-100 rounded-lg border-2 border-purple-300">
              <p className="text-xs text-gray-500 mb-1">Total Annual Savings</p>
              <p className="text-2xl font-bold text-gray-950">${(costSavings.totalAnnualSavings / 1000).toFixed(0)}K</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Performance Rankings */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-950">Agent Performance Rankings</CardTitle>
          <CardDescription>Top performing agents by accuracy and impact</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {agentPerformance.map((agent, index) => (
              <div
                key={agent.name}
                className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-950">{agent.name}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-gray-500">
                      {agent.invoicesProcessed.toLocaleString()} invoices
                    </span>
                    <span className="text-xs text-gray-500">
                      {agent.timeSavedHours.toLocaleString()}h saved
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-950">{agent.accuracy}%</p>
                    <p className="text-xs text-gray-500">accuracy</p>
                  </div>
                  {agent.accuracy >= 99 && <Award className="h-5 w-5 text-yellow-500" />}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Exception Handling Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-950">Exception Resolution</CardTitle>
            <CardDescription>How exceptions are being resolved</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-950">Exceptions Fixed by Agents</span>
                  <span className="text-sm font-bold text-purple-600">{metrics.exceptionsFixedByAgents.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all"
                    style={{ 
                      width: `${(metrics.exceptionsFixedByAgents / (metrics.exceptionsFixedByAgents + metrics.exceptionsFixedByHumans)) * 100}%` 
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-950">Exceptions Fixed by Humans</span>
                  <span className="text-sm font-bold text-orange-600">{metrics.exceptionsFixedByHumans.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-orange-600 h-2 rounded-full transition-all"
                    style={{ 
                      width: `${(metrics.exceptionsFixedByHumans / (metrics.exceptionsFixedByAgents + metrics.exceptionsFixedByHumans)) * 100}%` 
                    }}
                  />
                </div>
              </div>
              <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-semibold text-gray-950">
                      {((metrics.exceptionsFixedByAgents / (metrics.exceptionsFixedByAgents + metrics.exceptionsFixedByHumans)) * 100).toFixed(1)}% 
                      <span className="font-normal text-gray-500"> agent resolution rate</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-950">Productivity Impact</CardTitle>
            <CardDescription>Key performance improvements from AI</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Touchless Rate Improvement</p>
                    <p className="text-lg font-bold text-gray-950">+{touchlessImprovement.toFixed(1)}pp</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Processing Time Reduction</p>
                    <p className="text-lg font-bold text-gray-950">-{timeSavingsPercent.toFixed(0)}%</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Cost Per Invoice Reduction</p>
                    <p className="text-lg font-bold text-gray-950">-{costSavingsPercent.toFixed(0)}%</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">FTE Capacity Freed</p>
                    <p className="text-lg font-bold text-gray-950">{metrics.fteSaved.toFixed(1)} FTE</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
