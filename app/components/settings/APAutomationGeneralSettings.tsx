'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/app/components/ui/input';
import { Checkbox } from '@/app/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';

interface APSettings {
  autoProcessing: boolean;
  ocrThreshold: number;
  duplicateDetection: boolean;
  fileFormats: {
    pdf: boolean;
    excel: boolean;
    images: boolean;
    csv: boolean;
  };
  approvalThreshold: number;
  autoApproveUnder: number;
  dualApprovalOver: number;
  approverEmails: string[];
  escalationTime: string;
  paymentTerms: string;
  earlyPaymentDiscounts: boolean;
  paymentSchedule: string;
  timezone: string;
  notifications: {
    invoiceReceived: boolean;
    approvalRequired: boolean;
    paymentProcessed: boolean;
    exceptions: boolean;
  };
  retentionPeriod: string;
}

export default function APAutomationGeneralSettings() {
  const [settings, setSettings] = useState<APSettings>({
    autoProcessing: true,
    ocrThreshold: 85,
    duplicateDetection: true,
    fileFormats: { pdf: true, excel: true, images: true, csv: true },
    approvalThreshold: 5000,
    autoApproveUnder: 1000,
    dualApprovalOver: 25000,
    approverEmails: [],
    escalationTime: '48h',
    paymentTerms: 'net30',
    earlyPaymentDiscounts: false,
    paymentSchedule: 'weekly',
    timezone: 'America/New_York',
    notifications: {
      invoiceReceived: true,
      approvalRequired: true,
      paymentProcessed: true,
      exceptions: true,
    },
    retentionPeriod: '7years',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('apAutomationSettings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings(parsed);
      } catch (e) {
        console.error('Failed to parse stored settings:', e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Auto-save settings to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('apAutomationSettings', JSON.stringify(settings));
    }
  }, [settings, isLoaded]);

  const handleSave = () => {
    setIsSaving(true);
    // Simulate save to localStorage
    localStorage.setItem('apAutomationSettings', JSON.stringify(settings));
    
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }, 500);
  };

  const updateSetting = (key: keyof APSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const updateNestedSetting = (parent: 'fileFormats' | 'notifications', key: string, value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [key]: value,
      },
    }));
  };

  const addApproverEmail = () => {
    setSettings((prev) => ({
      ...prev,
      approverEmails: [...prev.approverEmails, ''],
    }));
  };

  const updateApproverEmail = (index: number, value: string) => {
    setSettings((prev) => ({
      ...prev,
      approverEmails: prev.approverEmails.map((email, i) => (i === index ? value : email)),
    }));
  };

  const removeApproverEmail = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      approverEmails: prev.approverEmails.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="p-8 pb-24">
      <h2 className="text-2xl font-bold text-gray-950 mb-6">AP Automation Settings</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Invoice Processing Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-950 mb-4">Invoice Processing</h3>

            <div className="space-y-4">
              {/* Enable Auto-Processing */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-950">Enable Auto-Processing</label>
                  <p className="text-xs text-gray-500">Automatically process incoming invoices</p>
                </div>
                <Checkbox
                  checked={settings.autoProcessing}
                  onCheckedChange={(checked) => updateSetting('autoProcessing', checked)}
                />
              </div>

              {/* OCR Confidence Threshold */}
              <div>
                <label className="text-sm font-medium text-gray-950 mb-2 block">
                  OCR Confidence Threshold
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.ocrThreshold}
                    onChange={(e) => updateSetting('ocrThreshold', parseInt(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-sm text-gray-950">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Flag invoices below this confidence for review</p>
              </div>

              {/* Enable Duplicate Detection */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-950">Enable Duplicate Detection</label>
                  <p className="text-xs text-gray-500">Automatically detect duplicate invoices</p>
                </div>
                <Checkbox
                  checked={settings.duplicateDetection}
                  onCheckedChange={(checked) => updateSetting('duplicateDetection', checked)}
                />
              </div>

              {/* Supported File Formats */}
              <div>
                <label className="text-sm font-medium text-gray-950 mb-3 block">Supported File Formats</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={settings.fileFormats.pdf}
                      onCheckedChange={(checked) => updateNestedSetting('fileFormats', 'pdf', checked as boolean)}
                    />
                    <span className="text-sm text-gray-950">PDF</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={settings.fileFormats.excel}
                      onCheckedChange={(checked) => updateNestedSetting('fileFormats', 'excel', checked as boolean)}
                    />
                    <span className="text-sm text-gray-950">Excel (XLSX, XLS)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={settings.fileFormats.images}
                      onCheckedChange={(checked) => updateNestedSetting('fileFormats', 'images', checked as boolean)}
                    />
                    <span className="text-sm text-gray-950">Images (PNG, JPG, JPEG)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={settings.fileFormats.csv}
                      onCheckedChange={(checked) => updateNestedSetting('fileFormats', 'csv', checked as boolean)}
                    />
                    <span className="text-sm text-gray-950">CSV</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Approval Rules Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-950 mb-4">Approval Rules</h3>

            <div className="space-y-4">
              {/* Default Approval Threshold */}
              <div>
                <label className="text-sm font-medium text-gray-950 mb-2 block">
                  Default Approval Threshold
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-950">$</span>
                  <Input
                    type="number"
                    min="0"
                    value={settings.approvalThreshold}
                    onChange={(e) => updateSetting('approvalThreshold', parseInt(e.target.value))}
                    className="w-32"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Invoices above this amount require approval</p>
              </div>

              {/* Auto-approve under */}
              <div>
                <label className="text-sm font-medium text-gray-950 mb-2 block">
                  Auto-approve invoices under
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-950">$</span>
                  <Input
                    type="number"
                    min="0"
                    value={settings.autoApproveUnder}
                    onChange={(e) => updateSetting('autoApproveUnder', parseInt(e.target.value))}
                    className="w-32"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Automatically approve invoices below this amount</p>
              </div>

              {/* Dual approval over */}
              <div>
                <label className="text-sm font-medium text-gray-950 mb-2 block">
                  Require dual approval over
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-950">$</span>
                  <Input
                    type="number"
                    min="0"
                    value={settings.dualApprovalOver}
                    onChange={(e) => updateSetting('dualApprovalOver', parseInt(e.target.value))}
                    className="w-32"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">High-value invoices need two approvers</p>
              </div>

              {/* Invoice Approver Emails */}
              <div>
                <label className="text-sm font-medium text-gray-950 mb-2 block">
                  Invoice Approver Email Addresses
                </label>
                <p className="text-xs text-gray-500 mb-3">Add email addresses for invoice approval notifications</p>
                <div className="space-y-2">
                  {settings.approverEmails.map((email, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        type="email"
                        placeholder="approver@company.com"
                        value={email}
                        onChange={(e) => updateApproverEmail(index, e.target.value)}
                        className="flex-1"
                      />
                      <button
                        onClick={() => removeApproverEmail(index)}
                        className="px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addApproverEmail}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-gray-950 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    + Add Approver Email
                  </button>
                </div>
              </div>

              {/* Escalation timeframe */}
              <div>
                <label className="text-sm font-medium text-gray-950 mb-2 block">
                  Escalation timeframe
                </label>
                <Select value={settings.escalationTime} onValueChange={(value) => updateSetting('escalationTime', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">24 hours</SelectItem>
                    <SelectItem value="48h">48 hours</SelectItem>
                    <SelectItem value="72h">72 hours</SelectItem>
                    <SelectItem value="1week">1 week</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">Time before unapproved invoices escalate</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Payment Preferences Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-950 mb-4">Payment Preferences</h3>

            <div className="space-y-4">
              {/* Default Payment Terms */}
              <div>
                <label className="text-sm font-medium text-gray-950 mb-2 block">
                  Default Payment Terms
                </label>
                <Select value={settings.paymentTerms} onValueChange={(value) => updateSetting('paymentTerms', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="due_on_receipt">Due on Receipt</SelectItem>
                    <SelectItem value="net15">Net 15</SelectItem>
                    <SelectItem value="net30">Net 30</SelectItem>
                    <SelectItem value="net60">Net 60</SelectItem>
                    <SelectItem value="net90">Net 90</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Enable Early Payment Discounts */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-950">Enable Early Payment Discounts</label>
                  <p className="text-xs text-gray-500">Apply discounts for early payments</p>
                </div>
                <Checkbox
                  checked={settings.earlyPaymentDiscounts}
                  onCheckedChange={(checked) => updateSetting('earlyPaymentDiscounts', checked)}
                />
              </div>

              {/* Payment Batch Schedule */}
              <div>
                <label className="text-sm font-medium text-gray-950 mb-2 block">
                  Payment Batch Schedule
                </label>
                <Select value={settings.paymentSchedule} onValueChange={(value) => updateSetting('paymentSchedule', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">How often to process payment batches</p>
              </div>

              {/* Business Hours Timezone */}
              <div>
                <label className="text-sm font-medium text-gray-950 mb-2 block">
                  Business Hours Timezone
                </label>
                <Select value={settings.timezone} onValueChange={(value) => updateSetting('timezone', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                    <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                    <SelectItem value="Europe/London">London (GMT)</SelectItem>
                    <SelectItem value="Europe/Paris">Central European Time</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                    <SelectItem value="Asia/Singapore">Singapore (SGT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-950 mb-4">Notifications</h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-950 mb-3 block">
                  Email Notification Preferences
                </label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-950">Notify on invoice received</span>
                    <Checkbox
                      checked={settings.notifications.invoiceReceived}
                      onCheckedChange={(checked) => updateNestedSetting('notifications', 'invoiceReceived', checked as boolean)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-950">Notify on approval required</span>
                    <Checkbox
                      checked={settings.notifications.approvalRequired}
                      onCheckedChange={(checked) => updateNestedSetting('notifications', 'approvalRequired', checked as boolean)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-950">Notify on payment processed</span>
                    <Checkbox
                      checked={settings.notifications.paymentProcessed}
                      onCheckedChange={(checked) => updateNestedSetting('notifications', 'paymentProcessed', checked as boolean)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-950">Notify on exceptions</span>
                    <Checkbox
                      checked={settings.notifications.exceptions}
                      onCheckedChange={(checked) => updateNestedSetting('notifications', 'exceptions', checked as boolean)}
                    />
                  </div>
                </div>
              </div>

              {/* Document Retention Period */}
              <div>
                <label className="text-sm font-medium text-gray-950 mb-2 block">
                  Document Retention Period
                </label>
                <Select value={settings.retentionPeriod} onValueChange={(value) => updateSetting('retentionPeriod', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1year">1 year</SelectItem>
                    <SelectItem value="3years">3 years</SelectItem>
                    <SelectItem value="5years">5 years</SelectItem>
                    <SelectItem value="7years">7 years</SelectItem>
                    <SelectItem value="10years">10 years</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">How long to retain invoice documents</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Footer - Save Button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="max-w-7xl mx-auto py-4 flex items-center justify-end gap-3 px-8">
          {saveSuccess && (
            <span className="text-sm text-green-600 font-medium">
              ✓ Changes saved successfully
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed mr-6"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
