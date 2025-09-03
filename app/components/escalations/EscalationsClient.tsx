'use client';

import { useState } from 'react';
import { AlertTriangle, Clock, Eye, MessageSquare, User, Search, Filter, Sparkles, X } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/app/components/ui/dialog';

interface SLARule {
  id: string;
  name: string;
  naturalLanguageRule: string;
  priority: 'High Priority' | 'Medium Priority' | 'Low Priority';
  status: 'Active' | 'Inactive';
  aiProcessed: boolean;
  created: string;
}

interface EscalatedInvoice {
  id: string;
  invoiceNumber: string;
  vendorName: string;
  escalationReason: string;
  escalationAge: string;
  slaBreach: boolean;
  totalAmount: string;
  invoiceDate: string;
  assignedTo: {
    name: string;
    initials: string;
    color: string;
    department: string;
  } | null;
  lastActionTaken: string;
  nextActionRequired: string;
  escalationStatus: 'Pending' | 'In Progress' | 'Resolved';
  priority: 'High' | 'Medium' | 'Low';
  escalationDate: string;
  slaRule: SLARule;
  poNumber: string | null;
  grNumber: string | null;
  hasGoodsReceipt: boolean;
}

// Mock SLA rules
const mockSLARules: SLARule[] = [
  {
    id: '1',
    name: 'High Value Vendor Processing',
    naturalLanguageRule: 'If an invoice from Tech Solutions Inc., Electronics Warehouse, or Furniture Depot is over $25,000 and hasn\'t been posted within 3 days, escalate it as high priority',
    priority: 'High Priority',
    status: 'Active',
    aiProcessed: true,
    created: '2025-06-19'
  },
  {
    id: '2',
    name: 'Critical Vendor Approval Timeout',
    naturalLanguageRule: 'Escalate any invoice from critical vendors (WOODPECKER SCHOOL & OFFICE SUPPLIES, Office Supplies Co.) that\'s been stuck in approval for more than 2 days, regardless of amount',
    priority: 'Medium Priority',
    status: 'Active',
    aiProcessed: true,
    created: '2025-06-19'
  },
  {
    id: '3',
    name: 'Standard Processing Timeout',
    naturalLanguageRule: 'If any invoice has been in processing for more than 5 days without resolution, escalate as medium priority',
    priority: 'Medium Priority',
    status: 'Active',
    aiProcessed: true,
    created: '2025-06-19'
  }
];

// Mock escalated invoices data
const mockEscalatedInvoices: EscalatedInvoice[] = [
  {
    id: '1',
    invoiceNumber: 'INV-2024-001',
    vendorName: 'WOODPECKER SCHOOL & OFFICE SUPPLIES',
    escalationReason: 'Critical Vendor Approval Timeout',
    escalationAge: '3 days',
    slaBreach: true,
    totalAmount: '€4,086.10',
    invoiceDate: '2024-01-15',
    assignedTo: {
      name: 'Sarah Chen',
      initials: 'SC',
      color: 'bg-violet-500',
      department: 'IT'
    },
    lastActionTaken: 'Sent for re-approval',
    nextActionRequired: 'Review Exception',
    escalationStatus: 'In Progress',
    priority: 'High',
    escalationDate: '2024-01-18',
    slaRule: mockSLARules[1],
    poNumber: 'PO-2024-001',
    grNumber: 'GR-2024-001',
    hasGoodsReceipt: true
  },
  {
    id: '2',
    invoiceNumber: 'INV-2024-045',
    vendorName: 'Tech Solutions Inc.',
    escalationReason: 'High Value Vendor Processing',
    escalationAge: '5 days',
    slaBreach: true,
    totalAmount: '$45,250.00',
    invoiceDate: '2024-01-12',
    assignedTo: {
      name: 'David Kim',
      initials: 'DK',
      color: 'bg-amber-500',
      department: 'Operations'
    },
    lastActionTaken: 'Escalated to CFO',
    nextActionRequired: 'CFO Approval Required',
    escalationStatus: 'Pending',
    priority: 'High',
    escalationDate: '2024-01-15',
    slaRule: mockSLARules[0],
    poNumber: null,
    grNumber: null,
    hasGoodsReceipt: false
  },
  {
    id: '3',
    invoiceNumber: 'INV-2024-032',
    vendorName: 'Electronics Warehouse',
    escalationReason: 'High Value Vendor Processing',
    escalationAge: '2 days',
    slaBreach: false,
    totalAmount: '$28,750.00',
    invoiceDate: '2024-01-20',
    assignedTo: {
      name: 'Anna Rodriguez',
      initials: 'AR',
      color: 'bg-green-500',
      department: 'Sales'
    },
    lastActionTaken: 'Contacted vendor for clarification',
    nextActionRequired: 'Reassign to Procurement',
    escalationStatus: 'In Progress',
    priority: 'Medium',
    escalationDate: '2024-01-22',
    slaRule: mockSLARules[0],
    poNumber: 'PO-2024-032',
    grNumber: null,
    hasGoodsReceipt: false
  },
  {
    id: '4',
    invoiceNumber: 'INV-2024-067',
    vendorName: 'Global Logistics Solutions',
    escalationReason: 'Standard Processing Timeout',
    escalationAge: '6 days',
    slaBreach: true,
    totalAmount: '$12,850.00',
    invoiceDate: '2024-01-14',
    assignedTo: {
      name: 'Lisa Park',
      initials: 'LP',
      color: 'bg-purple-500',
      department: 'Finance'
    },
    lastActionTaken: 'Requested additional documentation',
    nextActionRequired: 'Document Review Required',
    escalationStatus: 'Pending',
    priority: 'Medium',
    escalationDate: '2024-01-20',
    slaRule: mockSLARules[2],
    poNumber: 'PO-2024-067',
    grNumber: 'GR-2024-067',
    hasGoodsReceipt: true
  }
];

export function EscalationsClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedRule, setSelectedRule] = useState<SLARule | null>(null);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);

  const handleRuleClick = (rule: SLARule) => {
    setSelectedRule(rule);
    setIsRuleModalOpen(true);
  };

  const filteredInvoices = mockEscalatedInvoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.escalationReason.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || invoice.escalationStatus === statusFilter;
    const matchesPriority = priorityFilter === 'all' || invoice.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="w-full p-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-950">Escalations</h1>
            <p className="text-sm text-gray-950">Manage and resolve escalated invoices requiring immediate attention</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {mockEscalatedInvoices.filter(inv => inv.slaBreach).length} SLA Breaches
            </Badge>
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
              <Clock className="h-3 w-3 mr-1" />
              {mockEscalatedInvoices.filter(inv => inv.priority === 'High').length} High Priority
            </Badge>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input 
            type="search" 
            placeholder="Search escalations..." 
            className="pl-8 h-9 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-40 h-9 text-sm">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-hidden bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th scope="col" className="px-6 py-3.5 text-left text-sm font-semibold text-gray-800">
                  Invoice #
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  Vendor
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  SLA Reason
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  Priority
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  Age
                </th>
                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-800">
                  Amount
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  Date
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  PO/GR
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  Assigned To
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  Last Action
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  Next Action
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  Status
                </th>
                <th scope="col" className="relative px-3 py-3.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                    <button className="text-blue-600 hover:underline">
                      {invoice.invoiceNumber}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-950">
                    {invoice.vendorName}
                  </td>
                  <td className="px-3 py-4 text-sm">
                    <button 
                      onClick={() => handleRuleClick(invoice.slaRule)}
                      className="text-blue-600 hover:underline text-left"
                    >
                      {invoice.escalationReason}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <Badge 
                      className={
                        invoice.priority === 'High' 
                          ? "bg-red-100 text-red-800 border-0" 
                          : invoice.priority === 'Medium'
                          ? "bg-orange-100 text-orange-800 border-0"
                          : "bg-gray-100 text-gray-800 border-0"
                      }
                    >
                      {invoice.priority}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <span className={invoice.slaBreach ? 'text-red-600 font-medium' : 'text-gray-950'}>
                      {invoice.escalationAge}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-right font-medium text-gray-950">
                    {invoice.totalAmount}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-950">
                    {new Date(invoice.invoiceDate).toLocaleDateString('en-US')}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <div className="flex gap-1">
                      {invoice.poNumber && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                          PO
                        </Badge>
                      )}
                      {invoice.hasGoodsReceipt && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                          GR
                        </Badge>
                      )}
                      {!invoice.poNumber && !invoice.hasGoodsReceipt && (
                        <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-300 text-xs">
                          Non-PO
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-4 text-sm">
                    {invoice.assignedTo ? (
                      <div className="flex items-center">
                        <div className={`h-7 w-7 rounded-full ${invoice.assignedTo.color} flex items-center justify-center mr-2`}>
                          <span className="text-xs font-medium text-white">
                            {invoice.assignedTo.initials}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-950">{invoice.assignedTo.name}</div>
                          <div className="text-xs text-gray-500">{invoice.assignedTo.department}</div>
                        </div>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-gray-50 text-gray-500 border-gray-300">
                        Unassigned
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-600">
                    {invoice.lastActionTaken}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                      {invoice.nextActionRequired}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <Badge 
                      className={
                        invoice.escalationStatus === 'Pending' 
                          ? "bg-yellow-100 text-yellow-800 border-0" 
                          : invoice.escalationStatus === 'In Progress'
                          ? "bg-blue-100 text-blue-800 border-0"
                          : "bg-green-100 text-green-800 border-0"
                      }
                    >
                      {invoice.escalationStatus}
                    </Badge>
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          <span>View Details</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          <span>Add Comment</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <User className="mr-2 h-4 w-4" />
                          <span>Reassign</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredInvoices.length === 0 && (
          <div className="text-center py-12">
            <AlertTriangle className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-sm font-medium text-gray-950 mb-2">No escalated invoices found</h3>
            <p className="text-sm text-gray-500">
              {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'All invoices are processing normally.'}
            </p>
          </div>
        )}
      </div>

      {/* Rule Details Modal */}
      <Dialog open={isRuleModalOpen} onOpenChange={setIsRuleModalOpen}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                SLA Rule Details
              </DialogTitle>
              <p className="text-gray-600 mt-1">AI-powered escalation rule configuration</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsRuleModalOpen(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {selectedRule && (
            <div className="mt-6 space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                    AI Processed
                  </Badge>
                  <Badge className={
                    selectedRule.priority === 'High Priority' 
                      ? 'bg-red-100 text-red-700 border-red-200'
                      : selectedRule.priority === 'Medium Priority'
                      ? 'bg-orange-100 text-orange-700 border-orange-200'
                      : 'bg-gray-100 text-gray-700 border-gray-200'
                  }>
                    {selectedRule.priority}
                  </Badge>
                  <Badge className={
                    selectedRule.status === 'Active' 
                      ? 'bg-green-100 text-green-700 border-green-200'
                      : 'bg-gray-100 text-gray-700 border-gray-200'
                  }>
                    {selectedRule.status}
                  </Badge>
                </div>
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  {selectedRule.name}
                </h3>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Rule Description</h4>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg border">
                  {selectedRule.naturalLanguageRule}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Created Date</h4>
                  <p className="text-gray-600">
                    {new Date(selectedRule.created).toLocaleDateString('en-US')}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Rule Type</h4>
                  <p className="text-gray-600 flex items-center gap-1">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    AI-Powered Natural Language
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}