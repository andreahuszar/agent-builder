'use client';

import { useState } from 'react';
import { Package, Search, Plus, MoreHorizontal, Eye, Edit2, Trash2 } from 'lucide-react';
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

interface GoodsReceipt {
  id: string;
  grNumber: string;
  poNumber: string;
  vendorName: string;
  vendorCode: string;
  receiptDate: string;
  deliveryDate: string;
  totalAmount: number;
  currency: string;
  itemCount: number;
  status: 'pending' | 'partial' | 'complete' | 'cancelled';
  warehouse: string;
  receivedBy: string;
  invoiceNumber?: string;
  notes?: string;
}

// Mock data for goods receipts
const mockGoodsReceipts: GoodsReceipt[] = [
  {
    id: '1',
    grNumber: 'GR-2024-001',
    poNumber: 'PO-2024-001',
    vendorName: 'WOODPECKER SCHOOL & OFFICE SUPPLIES',
    vendorCode: 'V-001',
    receiptDate: '2024-01-10',
    deliveryDate: '2024-01-09',
    totalAmount: 4086.10,
    currency: 'EUR',
    itemCount: 15,
    status: 'complete',
    warehouse: 'Main Warehouse',
    receivedBy: 'John Smith',
    invoiceNumber: 'INV-2024-001',
    notes: 'All items received in good condition'
  },
  {
    id: '2',
    grNumber: 'GR-2024-032',
    poNumber: 'PO-2024-032',
    vendorName: 'Electronics Warehouse',
    vendorCode: 'V-045',
    receiptDate: '2024-01-18',
    deliveryDate: '2024-01-18',
    totalAmount: 28750.00,
    currency: 'USD',
    itemCount: 8,
    status: 'partial',
    warehouse: 'Distribution Center',
    receivedBy: 'Mary Johnson',
    notes: '2 items pending delivery'
  },
  {
    id: '3',
    grNumber: 'GR-2024-067',
    poNumber: 'PO-2024-067',
    vendorName: 'Global Logistics Solutions',
    vendorCode: 'V-112',
    receiptDate: '2024-01-20',
    deliveryDate: '2024-01-19',
    totalAmount: 12850.00,
    currency: 'USD',
    itemCount: 25,
    status: 'complete',
    warehouse: 'Main Warehouse',
    receivedBy: 'Robert Chen',
    invoiceNumber: 'INV-2024-067'
  },
  {
    id: '4',
    grNumber: 'GR-2024-089',
    poNumber: 'PO-2024-089',
    vendorName: 'Office Supplies Co.',
    vendorCode: 'V-023',
    receiptDate: '2024-01-22',
    deliveryDate: '2024-01-21',
    totalAmount: 5432.50,
    currency: 'GBP',
    itemCount: 30,
    status: 'pending',
    warehouse: 'Secondary Storage',
    receivedBy: 'Alice Brown',
    notes: 'Awaiting quality inspection'
  },
  {
    id: '5',
    grNumber: 'GR-2024-102',
    poNumber: 'PO-2024-102',
    vendorName: 'Tech Solutions Inc.',
    vendorCode: 'V-087',
    receiptDate: '2024-01-23',
    deliveryDate: '2024-01-23',
    totalAmount: 45250.00,
    currency: 'USD',
    itemCount: 5,
    status: 'complete',
    warehouse: 'IT Warehouse',
    receivedBy: 'David Kim',
    invoiceNumber: 'INV-2024-045'
  },
  {
    id: '6',
    grNumber: 'GR-2024-115',
    poNumber: 'PO-2024-115',
    vendorName: 'Furniture Depot',
    vendorCode: 'V-156',
    receiptDate: '2024-01-24',
    deliveryDate: '2024-01-24',
    totalAmount: 18900.00,
    currency: 'CAD',
    itemCount: 12,
    status: 'cancelled',
    warehouse: 'Main Warehouse',
    receivedBy: 'Sarah Wilson',
    notes: 'Order cancelled due to damaged items'
  }
];

export function GoodsReceiptsClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [goodsReceipts] = useState<GoodsReceipt[]>(mockGoodsReceipts);

  const filteredReceipts = goodsReceipts.filter(receipt => {
    const matchesSearch = 
      receipt.grNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.warehouse.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || receipt.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number, currency: string) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formatter.format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'pending': { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      'partial': { color: 'bg-blue-100 text-blue-800', label: 'Partial' },
      'complete': { color: 'bg-green-100 text-green-800', label: 'Complete' },
      'cancelled': { color: 'bg-red-100 text-red-800', label: 'Cancelled' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="w-full p-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-950">Goods Receipts</h1>
            <p className="text-sm text-gray-950">Track and manage goods received from purchase orders</p>
          </div>
          <button
            className="inline-flex items-center px-2 py-1.5 bg-purple-900 text-white text-sm rounded-md hover:bg-purple-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Receipt
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Receipts</p>
              <p className="text-2xl font-bold text-gray-950">{goodsReceipts.length}</p>
            </div>
            <Package className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-950">
                {goodsReceipts.filter(gr => gr.status === 'pending').length}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
              <span className="text-yellow-600 text-sm font-bold">!</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Partial</p>
              <p className="text-2xl font-bold text-gray-950">
                {goodsReceipts.filter(gr => gr.status === 'partial').length}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 text-sm font-bold">P</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Complete</p>
              <p className="text-2xl font-bold text-gray-950">
                {goodsReceipts.filter(gr => gr.status === 'complete').length}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-green-600 text-sm font-bold">✓</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input 
            type="search" 
            placeholder="Search receipts..." 
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
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="complete">Complete</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
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
                  Status
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  GR Number
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  PO Number
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  Vendor
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  Receipt Date
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  Delivery Date
                </th>
                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-800">
                  Total Amount
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  Items
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  Warehouse
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  Received By
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-800">
                  Invoice
                </th>
                <th scope="col" className="relative px-3 py-3.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredReceipts.map((receipt) => (
                <tr key={receipt.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    {getStatusBadge(receipt.status)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm font-medium">
                    <button className="text-blue-600 hover:underline">
                      {receipt.grNumber}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <button className="text-blue-600 hover:underline">
                      {receipt.poNumber}
                    </button>
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-950">
                    <div>
                      <div className="font-medium">{receipt.vendorName}</div>
                      <div className="text-xs text-gray-500">{receipt.vendorCode}</div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-950">
                    {new Date(receipt.receiptDate).toLocaleDateString('en-US')}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-950">
                    {new Date(receipt.deliveryDate).toLocaleDateString('en-US')}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-right font-medium text-gray-950">
                    {formatCurrency(receipt.totalAmount, receipt.currency)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-950">
                    {receipt.itemCount} items
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-950">
                    {receipt.warehouse}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-950">
                    {receipt.receivedBy}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    {receipt.invoiceNumber ? (
                      <button className="text-blue-600 hover:underline text-xs">
                        {receipt.invoiceNumber}
                      </button>
                    ) : (
                      <span className="text-gray-400 text-xs">No invoice</span>
                    )}
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          <span>View</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit2 className="mr-2 h-4 w-4" />
                          <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredReceipts.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-sm font-medium text-gray-950 mb-2">No goods receipts found</h3>
            <p className="text-sm text-gray-500">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Create your first goods receipt to get started.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}