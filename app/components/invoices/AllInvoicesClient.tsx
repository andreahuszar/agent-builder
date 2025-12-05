'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  ChevronDown,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { EnhancedInvoiceTable } from './EnhancedInvoiceTable';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '@/app/components/ui/dropdown-menu';
import { Checkbox } from '@/app/components/ui/checkbox';
import {
  getAllMockInvoices,
} from '@/app/services/mockInvoiceService';
import { enrichInvoiceWithDemoData } from '@/app/services/invoiceDataService';

interface Invoice {
  id: string;
  invoice_number: string;
  vendor_name_snapshot: string;
  vendor_id?: string;
  vendor_tax_id_snapshot?: string;
  vendor_address_snapshot?: string;
  customer_no?: string;
  division?: string;
  invoice_date: string;
  due_date: string;
  currency: string;
  total: number;
  status?: string;
  match_status?: string;
  vendor_requires_po?: boolean | null;
  vendor_is_verified?: boolean;
  approval_status?: string;
  po_numbers_cached?: string[];
  gr_numbers?: string[];
  payment_method?: string | null;
  payment_bank_details?: any;
  tax_rate_percent?: number | null;
  lines?: any[];
  invoice_lines?: any[];
  requisitioner?: string;
  source?: 'db' | 'mock';
  issues?: string[];
}

// Exception categories for organized display
const EXCEPTION_CATEGORIES = {
  'Missing Field': {
    label: 'Missing Field',
    isCategory: true,
    items: [
      'Missing Invoice Number',
      'Missing Vendor',
      'Missing Date',
      'Missing Currency',
      'Missing Amount',
      'Missing Vendor ID',
      'Missing Vendor Tax ID',
      'Missing Vendor Address',
      'Missing Payment Method',
      'Missing Bank Account',
      'Missing Tax Code',
      'Missing Line Items',
    ]
  },
  'Missing PO': {
    label: 'Missing PO',
    isCategory: false,
  },
  'Line Items Mismatch': {
    label: 'Line Items Mismatch',
    isCategory: true,
    items: [
      'Line Mismatch',
      'Quantity Variance',
      'Price Tolerance',
    ]
  },
  'Header Level': {
    label: 'Header Level',
    isCategory: true,
    items: [
      'PO/Invoice Mismatch',
      'Tax Discrepancy',
      'Currency Issue',
    ]
  },
  'Validation': {
    label: 'Validation',
    isCategory: true,
    items: [
      'Duplicate Suspected',
      'Payment Terms',
      'Vendor Issues',
      'Missing Documentation',
      'Bank Account Issue',
      'Vendor Not Verified',
    ]
  }
};

export default function AllInvoicesClient() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set());
  const [selectedExceptions, setSelectedExceptions] = useState<Set<string>>(new Set());
  const [vendorFilterOpen, setVendorFilterOpen] = useState(false);
  const [exceptionFilterOpen, setExceptionFilterOpen] = useState(false);
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');
  const [exceptionSearchQuery, setExceptionSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());

  // Load invoices on mount
  useEffect(() => {
    refreshInvoices();
  }, []);

  const refreshInvoices = useCallback(async () => {
    // Fetch all invoices from API (which already includes mock data)
    try {
      const response = await fetch('/api/invoices');
      if (response.ok) {
        const data = await response.json();
        const allInvoices = (data.invoices || []).map((inv: any) => ({
          ...inv,
          docType: inv.docType || 'Invoice'
        }));
        console.log(`Total invoices loaded: ${allInvoices.length}`);
        setInvoices(allInvoices);
      }
    } catch (error) {
      console.error('Failed to refresh invoices:', error);
      // Fallback to mock-only if API fails
      const mockInvoices = getAllMockInvoices().map(invoice => ({
        ...invoice,
        source: 'mock' as const,
        docType: invoice.docType || 'Invoice'
      }));
      setInvoices(mockInvoices);
    }
  }, []);

  // Get unique vendors
  const uniqueVendors = useMemo(() => {
    const vendors = new Set<string>();
    invoices.forEach(inv => {
      if (inv.vendor_name_snapshot) {
        vendors.add(inv.vendor_name_snapshot);
      }
    });
    return Array.from(vendors).sort();
  }, [invoices]);

  // Filter vendors by search
  const filteredVendors = useMemo(() => {
    if (!vendorSearchQuery.trim()) return uniqueVendors;
    const query = vendorSearchQuery.toLowerCase();
    return uniqueVendors.filter(vendor => vendor.toLowerCase().includes(query));
  }, [uniqueVendors, vendorSearchQuery]);

  // Build unified exception list with categories
  const unifiedExceptions = useMemo(() => {
    const exceptionItems: Array<{ type: 'category' | 'item', label: string, categoryKey?: string, count?: number }> = [];

    Object.entries(EXCEPTION_CATEGORIES).forEach(([key, config]) => {
      if (config.isCategory && 'items' in config) {
        exceptionItems.push({ type: 'category', label: config.label, categoryKey: key });
        config.items.forEach((item: string) => {
          exceptionItems.push({ type: 'item', label: item, categoryKey: key });
        });
      } else {
        exceptionItems.push({ type: 'item', label: config.label, categoryKey: undefined });
      }
    });

    return exceptionItems.map(item => item.label);
  }, []);

  // Filter exceptions by search
  const filteredExceptions = useMemo(() => {
    const exceptionItems: Array<{ type: 'category' | 'item', label: string, categoryKey?: string }> = [];

    Object.entries(EXCEPTION_CATEGORIES).forEach(([key, config]) => {
      if (config.isCategory && 'items' in config) {
        const matchingItems = config.items.filter((item: string) =>
          !exceptionSearchQuery.trim() || item.toLowerCase().includes(exceptionSearchQuery.toLowerCase())
        );

        if (matchingItems.length > 0 || !exceptionSearchQuery.trim() ||
            config.label.toLowerCase().includes(exceptionSearchQuery.toLowerCase())) {
          exceptionItems.push({ type: 'category', label: config.label, categoryKey: key });
          (exceptionSearchQuery.trim() ? matchingItems : config.items).forEach((item: string) => {
            exceptionItems.push({ type: 'item', label: item, categoryKey: key });
          });
        }
      } else if (!exceptionSearchQuery.trim() || config.label.toLowerCase().includes(exceptionSearchQuery.toLowerCase())) {
        exceptionItems.push({ type: 'item', label: config.label, categoryKey: undefined });
      }
    });

    return exceptionItems;
  }, [exceptionSearchQuery]);

  // Apply all filters
  useEffect(() => {
    let filtered = [...invoices];
    console.log(`[AllInvoices] Starting with ${invoices.length} invoices`);

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(invoice => {
        if (invoice.invoice_number?.toLowerCase().includes(query)) return true;
        if (invoice.vendor_name_snapshot?.toLowerCase().includes(query)) return true;
        if (invoice.po_numbers_cached?.some(po => po.toLowerCase().includes(query))) return true;
        if (invoice.total?.toString().includes(query)) return true;
        return false;
      });
    }

    // Vendor filter
    if (selectedVendors.size > 0) {
      filtered = filtered.filter(invoice => selectedVendors.has(invoice.vendor_name_snapshot));
    }

    // Exception filter
    if (selectedExceptions.size > 0) {
      filtered = filtered.filter(invoice => {
        let matchesFilter = false;

        // Check if parent "Missing Field" category is selected
        if (selectedExceptions.has('Missing Field')) {
          const hasMissingFields = (
            !invoice.invoice_number ||
            !invoice.vendor_name_snapshot ||
            !invoice.invoice_date ||
            !invoice.currency ||
            !(Number(invoice.total || 0) > 0) ||
            !invoice.vendor_id
          );
          if (hasMissingFields) matchesFilter = true;
        }

        // Check for specific missing field sub-filters
        if (selectedExceptions.has('Missing Invoice Number') && !invoice.invoice_number) matchesFilter = true;
        if (selectedExceptions.has('Missing Vendor') && !invoice.vendor_name_snapshot) matchesFilter = true;
        if (selectedExceptions.has('Missing Date') && !invoice.invoice_date) matchesFilter = true;
        if (selectedExceptions.has('Missing Currency') && !invoice.currency) matchesFilter = true;
        if (selectedExceptions.has('Missing Amount') && !(Number(invoice.total || 0) > 0)) matchesFilter = true;
        if (selectedExceptions.has('Missing Vendor ID') && !invoice.vendor_id) matchesFilter = true;
        if (selectedExceptions.has('Missing Vendor Tax ID') && !invoice.vendor_tax_id_snapshot) matchesFilter = true;
        if (selectedExceptions.has('Missing Vendor Address') && !invoice.vendor_address_snapshot) matchesFilter = true;
        if (selectedExceptions.has('Missing Payment Method') && !invoice.payment_method) matchesFilter = true;
        if (selectedExceptions.has('Missing Bank Account') && !invoice.payment_bank_details) matchesFilter = true;
        if (selectedExceptions.has('Missing Tax Code') && invoice.tax_rate_percent == null) matchesFilter = true;
        const hasLines = (invoice.lines && invoice.lines.length > 0) || (invoice.invoice_lines && invoice.invoice_lines.length > 0);
        if (selectedExceptions.has('Missing Line Items') && !hasLines) matchesFilter = true;

        // Check if "Missing PO" is selected
        if (selectedExceptions.has('Missing PO')) {
          const isMissingPO = invoice.vendor_requires_po && (!invoice.po_numbers_cached || invoice.po_numbers_cached.length === 0);
          if (isMissingPO) matchesFilter = true;
        }

        // Check other validation exceptions from invoice.issues array
        if (invoice.issues && invoice.issues.some(issue => selectedExceptions.has(issue))) {
          matchesFilter = true;
        }

        return matchesFilter;
      });
    }

    console.log(`[AllInvoices] After filtering: ${filtered.length} invoices`);
    setFilteredInvoices(filtered);
  }, [searchQuery, invoices, selectedVendors, selectedExceptions]);

  // Vendor filter handlers
  const handleVendorToggle = (vendor: string) => {
    setSelectedVendors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(vendor)) {
        newSet.delete(vendor);
      } else {
        newSet.add(vendor);
      }
      return newSet;
    });
  };

  const handleSelectAllVendors = () => {
    if (selectedVendors.size === uniqueVendors.length) {
      setSelectedVendors(new Set());
    } else {
      setSelectedVendors(new Set(uniqueVendors));
    }
  };

  const clearVendorFilter = () => {
    setSelectedVendors(new Set());
  };

  const getVendorFilterText = () => {
    if (selectedVendors.size === 0) return 'All Vendors';
    if (selectedVendors.size === 1) return Array.from(selectedVendors)[0];
    return `${selectedVendors.size} Vendors`;
  };

  // Exception filter handlers
  const handleExceptionToggle = (exception: string) => {
    setSelectedExceptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(exception)) {
        newSet.delete(exception);
      } else {
        newSet.add(exception);
      }
      return newSet;
    });
  };

  const handleSelectAllExceptions = () => {
    if (selectedExceptions.size === unifiedExceptions.length) {
      setSelectedExceptions(new Set());
    } else {
      setSelectedExceptions(new Set(unifiedExceptions));
    }
  };

  const clearExceptionFilter = () => {
    setSelectedExceptions(new Set());
  };

  const toggleCategoryCollapse = (categoryKey: string) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryKey)) {
        newSet.delete(categoryKey);
      } else {
        newSet.add(categoryKey);
      }
      return newSet;
    });
  };

  const isCategoryFullySelected = (categoryKey: string) => {
    const config = EXCEPTION_CATEGORIES[categoryKey as keyof typeof EXCEPTION_CATEGORIES];
    if (!config || !('items' in config)) return false;
    return config.items.every((item: string) => selectedExceptions.has(item));
  };

  const isCategoryPartiallySelected = (categoryKey: string) => {
    const config = EXCEPTION_CATEGORIES[categoryKey as keyof typeof EXCEPTION_CATEGORIES];
    if (!config || !('items' in config)) return false;
    const selectedCount = config.items.filter((item: string) => selectedExceptions.has(item)).length;
    return selectedCount > 0 && selectedCount < config.items.length;
  };

  const handleCategoryToggle = (categoryKey: string) => {
    const config = EXCEPTION_CATEGORIES[categoryKey as keyof typeof EXCEPTION_CATEGORIES];
    if (!config || !('items' in config)) return;

    const isFullySelected = isCategoryFullySelected(categoryKey);
    setSelectedExceptions(prev => {
      const newSet = new Set(prev);
      if (isFullySelected) {
        config.items.forEach((item: string) => newSet.delete(item));
      } else {
        config.items.forEach((item: string) => newSet.add(item));
      }
      return newSet;
    });
  };

  const extractExceptionName = (formattedLabel: string): string => {
    return formattedLabel.replace(/\s*\(\d+\)$/, '');
  };

  // Selection handlers
  const handleToggleSelection = (invoiceId: string) => {
    setSelectedInvoices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(invoiceId)) {
        newSet.delete(invoiceId);
      } else {
        newSet.add(invoiceId);
      }
      return newSet;
    });
  };

  const handleToggleAll = () => {
    if (selectedInvoices.size === filteredInvoices.length && filteredInvoices.length > 0) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(filteredInvoices.map(inv => inv.id)));
    }
  };

  return (
    <div className="w-full h-full flex flex-col px-4 py-4 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-950">All Invoices</h1>
      </div>

      {/* Search bar and Columns & Filters button */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="relative w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-600" />
              <input
                type="search"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-2.5 py-1.5 w-full border border-gray-300 rounded-md text-xs placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <button className="px-2.5 py-1.5 bg-white border border-purple-600 text-purple-600 text-xs font-medium rounded-md hover:bg-purple-50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2">
              <Filter className="h-3 w-3 inline mr-1" />
              Columns & Filters
            </button>
          </div>

          {/* Quick filter pills */}
          <div className="flex items-center gap-1.5">
            {/* Clear All link */}
            {(selectedVendors.size > 0 || selectedExceptions.size > 0) && (
              <>
                <button
                  onClick={() => {
                    setSelectedVendors(new Set());
                    setSelectedExceptions(new Set());
                  }}
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                >
                  Clear All
                </button>
                <div className="h-5 w-px bg-gray-100" />
              </>
            )}

            {/* Vendor Filter */}
            <DropdownMenu open={vendorFilterOpen} onOpenChange={setVendorFilterOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border relative overflow-hidden",
                    selectedVendors.size > 0
                      ? "bg-purple-100 text-purple-700 border-purple-400"
                      : "bg-white text-gray-700 border-gray-400 hover:bg-gray-50 hover:border-gray-500"
                  )}
                  style={{
                    minWidth: '120px',
                    maxWidth: '200px'
                  }}
                >
                  {selectedVendors.size === 1 && (
                    <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
                  )}
                  <span className="truncate flex-1 text-left">{getVendorFilterText()}</span>
                  <ChevronDown className="h-3 w-3 ml-1 flex-shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-72 max-h-96 overflow-y-auto" align="start">
                <div className="px-3 py-2 border-b">
                  <div className="flex items-center gap-2 px-2 py-1.5 border rounded-md bg-gray-50">
                    <Search className="h-3 w-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search vendors..."
                      value={vendorSearchQuery}
                      onChange={(e) => setVendorSearchQuery(e.target.value)}
                      className="flex-1 outline-none text-sm bg-transparent"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
                <div className="py-2">
                  <DropdownMenuCheckboxItem
                    checked={selectedVendors.size === uniqueVendors.length}
                    onCheckedChange={handleSelectAllVendors}
                    onSelect={(e) => e.preventDefault()}
                  >
                    <span className="font-medium">All Vendors</span>
                    <span className="ml-auto text-xs text-gray-500">
                      {uniqueVendors.length}
                    </span>
                  </DropdownMenuCheckboxItem>
                </div>
                <DropdownMenuSeparator />
                <div className="py-2">
                  {filteredVendors.length > 0 ? (
                    filteredVendors.map(vendor => (
                      <DropdownMenuCheckboxItem
                        key={vendor}
                        checked={selectedVendors.has(vendor)}
                        onCheckedChange={() => handleVendorToggle(vendor)}
                        onSelect={(e) => e.preventDefault()}
                      >
                        <span className="truncate">{vendor}</span>
                      </DropdownMenuCheckboxItem>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">No vendors found</div>
                  )}
                </div>
                {selectedVendors.size > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="px-3 py-2">
                      <button
                        onClick={clearVendorFilter}
                        className="w-full text-left text-sm text-purple-600 hover:text-purple-700 font-medium"
                      >
                        Clear selection
                      </button>
                    </div>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Exception Filter */}
            <DropdownMenu open={exceptionFilterOpen} onOpenChange={setExceptionFilterOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border relative overflow-hidden",
                    selectedExceptions.size > 0
                      ? "bg-purple-100 text-purple-700 border-purple-400"
                      : "bg-white text-gray-700 border-gray-400 hover:bg-gray-50 hover:border-gray-500"
                  )}
                  style={{
                    minWidth: '120px',
                    maxWidth: '200px'
                  }}
                >
                  {selectedExceptions.size === 1 && (
                    <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
                  )}
                  <span className="truncate flex-1 text-left">
                    {selectedExceptions.size === 0 ? 'All Exceptions' :
                     selectedExceptions.size === 1 ? Array.from(selectedExceptions)[0] :
                     `${selectedExceptions.size} Exceptions`}
                  </span>
                  <ChevronDown className="h-3 w-3 ml-1 flex-shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-72 max-h-96 overflow-y-auto" align="start">
                <div className="px-3 py-2 border-b">
                  <div className="flex items-center gap-2 px-2 py-1.5 border rounded-md bg-gray-50">
                    <Search className="h-3 w-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search exceptions..."
                      value={exceptionSearchQuery}
                      onChange={(e) => setExceptionSearchQuery(e.target.value)}
                      className="flex-1 outline-none text-sm bg-transparent"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
                <div className="py-2">
                  <DropdownMenuCheckboxItem
                    checked={selectedExceptions.size === unifiedExceptions.length}
                    onCheckedChange={handleSelectAllExceptions}
                    onSelect={(e) => e.preventDefault()}
                  >
                    <span className="font-medium">All Exceptions</span>
                    <span className="ml-auto text-xs text-gray-500">
                      {unifiedExceptions.length}
                    </span>
                  </DropdownMenuCheckboxItem>
                </div>
                <DropdownMenuSeparator />
                <div className="py-2">
                  {filteredExceptions.length > 0 ? (
                    filteredExceptions.map((item, index) => {
                      if (item.type === 'category') {
                        const isCollapsed = collapsedCategories.has(item.categoryKey || '');
                        const isFullySelected = isCategoryFullySelected(item.categoryKey || '');
                        const isPartiallySelected = isCategoryPartiallySelected(item.categoryKey || '');

                        return (
                          <div key={`category-${item.categoryKey}-${index}`}>
                            <div className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-gray-50 rounded-md mx-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCategoryCollapse(item.categoryKey || '');
                                }}
                                className="p-0.5 hover:bg-gray-100 rounded"
                              >
                                {isCollapsed ? (
                                  <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                                )}
                              </button>
                              <Checkbox
                                checked={isFullySelected}
                                indeterminate={isPartiallySelected}
                                onCheckedChange={() => handleCategoryToggle(item.categoryKey || '')}
                                onClick={(e) => e.stopPropagation()}
                                className="h-4 w-4"
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCategoryCollapse(item.categoryKey || '');
                                }}
                                className="flex-1 text-left text-sm font-semibold text-gray-900 hover:text-gray-950"
                              >
                                {item.label}
                              </button>
                            </div>
                          </div>
                        );
                      } else {
                        const isCollapsed = collapsedCategories.has(item.categoryKey || '');
                        if (isCollapsed) return null;

                        const plainException = extractExceptionName(item.label);
                        return (
                          <div key={`item-${item.label}-${index}`} className="flex items-center gap-1.5 py-1 hover:bg-gray-50 rounded-md mx-1 pl-11">
                            <Checkbox
                              checked={selectedExceptions.has(plainException)}
                              onCheckedChange={() => handleExceptionToggle(plainException)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4"
                            />
                            <label
                              onClick={() => handleExceptionToggle(plainException)}
                              className="flex-1 text-xs text-gray-800 cursor-pointer"
                            >
                              {item.label}
                            </label>
                          </div>
                        );
                      }
                    })
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">No exceptions found</div>
                  )}
                </div>
                {selectedExceptions.size > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="px-3 py-2">
                      <button
                        onClick={clearExceptionFilter}
                        className="w-full text-left text-sm text-purple-600 hover:text-purple-700 font-medium"
                      >
                        Clear selection
                      </button>
                    </div>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="flex-1 min-h-0">
        <EnhancedInvoiceTable
          invoices={filteredInvoices}
          selectedInvoices={selectedInvoices}
          onToggleSelection={handleToggleSelection}
          onToggleAll={handleToggleAll}
          activeTab="all"
          onDelete={() => {}}
        />
      </div>
    </div>
  );
}
