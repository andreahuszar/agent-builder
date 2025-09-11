'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Plus } from 'lucide-react';
import { VendorsTable } from '../components/vendors/VendorsTable';
import { VendorDialog } from '../components/vendors/VendorDialog';
import { VendorDetailsDialog } from '../components/vendors/VendorDetailsDialog';

export interface Vendor {
  id: string;
  name: string;
  tax_id: string | null;
  country_code: string | null;
  default_currency: string | null;
  requires_po: boolean;
  is_verified: boolean;
  active: boolean;
  is_blocked_for_payment: boolean;
  preferred_payment_method: string | null;
  created_at: string;
  updated_at: string;
  payment_terms: {
    name: string;
    net_days: number;
  } | null;
  default_bank_account: {
    bank_name: string;
    account_number_masked: string;
    iban: string | null;
    swift_bic: string | null;
  } | null;
  invoice_count: number;
}

export default function VendorsClient() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [vendorToEdit, setVendorToEdit] = useState<Vendor | undefined>();
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set());
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [vendorToView, setVendorToView] = useState<Vendor | null>(null);
  const [deletingVendorId, setDeletingVendorId] = useState<string | null>(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    status: 'all',
    verified: 'all',
    requiresPO: 'all',
    paymentStatus: 'all',
  });

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    country: true,
    tax_id: true,
    status: true,
    requires_po: true,
    payment_status: true,
    payment_method: true,
    invoices: true,
    currency: true,
    created: true,
    actions: true,
  });

  // Fetch vendors
  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.verified !== 'all') params.append('verified', filters.verified);
      if (filters.requiresPO !== 'all') params.append('requires_po', filters.requiresPO);
      if (filters.paymentStatus !== 'all') params.append('payment_status', filters.paymentStatus);

      const response = await fetch(`/api/vendors?${params}`);
      if (response.ok) {
        const data = await response.json();
        setVendors(data.vendors || []);
        setFilteredVendors(data.vendors || []);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filters]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Handle vendor creation
  const handleVendorCreated = (newVendor: Vendor) => {
    setVendors([newVendor, ...vendors]);
    setFilteredVendors([newVendor, ...filteredVendors]);
    setVendorDialogOpen(false);
  };

  // Handle vendor update
  const handleVendorUpdated = (updatedVendor: Vendor) => {
    setVendors(vendors.map(v => v.id === updatedVendor.id ? updatedVendor : v));
    setFilteredVendors(filteredVendors.map(v => v.id === updatedVendor.id ? updatedVendor : v));
    setVendorDialogOpen(false);
    // Also update in details dialog if it's the same vendor
    if (vendorToView && vendorToView.id === updatedVendor.id) {
      setVendorToView(updatedVendor);
    }
  };

  // Handle view details
  const handleViewDetails = (vendor: Vendor) => {
    setVendorToView(vendor);
    setDetailsDialogOpen(true);
  };

  // Handle vendor edit
  const handleEditVendor = (vendor: Vendor) => {
    setVendorToEdit(vendor);
    setDialogMode('edit');
    setVendorDialogOpen(true);
  };

  // Handle vendor delete
  const handleDeleteVendor = async (vendorId: string) => {
    // Prevent multiple clicks
    if (deletingVendorId) return;
    
    const vendorToDelete = vendors.find(v => v.id === vendorId);
    if (!vendorToDelete) return;
    
    if (!confirm(`Are you sure you want to delete vendor "${vendorToDelete.name}"?`)) {
      return;
    }

    setDeletingVendorId(vendorId);

    try {
      const response = await fetch(`/api/vendors/${vendorId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setVendors(vendors.filter(v => v.id !== vendorId));
        setFilteredVendors(filteredVendors.filter(v => v.id !== vendorId));
        // Show success message (you could add a toast notification here)
        console.log(`Successfully deleted vendor: ${vendorToDelete.name}`);
      } else {
        // Show specific error message
        let errorMessage = data.error || 'Failed to delete vendor';
        
        if (errorMessage.includes('existing invoices')) {
          // Get the vendor to show invoice count
          const vendor = vendors.find(v => v.id === vendorId);
          errorMessage = `Cannot delete "${vendorToDelete.name}" because it has ${vendor?.invoice_count || 'existing'} invoice(s). Please delete or reassign the invoices first.`;
        }
        
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Error deleting vendor:', error);
      alert(`Failed to delete vendor: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeletingVendorId(null);
    }
  };

  // Handle opening create dialog
  const handleOpenCreateDialog = () => {
    setVendorToEdit(undefined);
    setDialogMode('create');
    setVendorDialogOpen(true);
  };

  // Handle selection
  const handleSelectAll = () => {
    if (selectedVendors.size === filteredVendors.length) {
      setSelectedVendors(new Set());
    } else {
      setSelectedVendors(new Set(filteredVendors.map(v => v.id)));
    }
  };

  const handleSelectVendor = (vendorId: string) => {
    const newSelection = new Set(selectedVendors);
    if (newSelection.has(vendorId)) {
      newSelection.delete(vendorId);
    } else {
      newSelection.add(vendorId);
    }
    setSelectedVendors(newSelection);
  };

  return (
    <div className="w-full p-4 sm:px-6 lg:px-8">
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-950">Vendors</h1>
      </div>

      {/* Controls */}
      <div className="mb-6 flex gap-3">
        {/* Search */}
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchQuery}
            onChange={handleSearch}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        {/* Columns & Filters */}
        <button
          onClick={() => {}}
          className="flex items-center gap-2 rounded-lg border border-purple-600 bg-white px-4 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50 transition-colors"
        >
          <Filter className="h-4 w-4" />
          Columns & Filters
        </button>

        {/* Spacer to push Add Vendor to the right */}
        <div className="flex-1"></div>

        {/* Add Vendor */}
        <button
          onClick={handleOpenCreateDialog}
          className="flex items-center gap-2 rounded-lg bg-purple-900 px-4 py-2 text-sm font-medium text-white hover:bg-purple-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Vendor
        </button>
      </div>


      {/* Vendors Table */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-gray-500">Loading vendors...</div>
        </div>
      ) : (
        <VendorsTable
          vendors={filteredVendors}
          selectedVendors={selectedVendors}
          visibleColumns={visibleColumns}
          onSelectAll={handleSelectAll}
          onSelectVendor={handleSelectVendor}
          onEdit={handleEditVendor}
          onDelete={handleDeleteVendor}
          onViewDetails={handleViewDetails}
          deletingVendorId={deletingVendorId}
        />
      )}

      {/* Vendor Dialog */}
      <VendorDialog
        open={vendorDialogOpen}
        onClose={() => setVendorDialogOpen(false)}
        onVendorCreated={handleVendorCreated}
        onVendorUpdated={handleVendorUpdated}
        mode={dialogMode}
        vendorToEdit={vendorToEdit}
      />

      {/* Vendor Details Dialog */}
      <VendorDetailsDialog
        open={detailsDialogOpen}
        onClose={() => {
          setDetailsDialogOpen(false);
          setVendorToView(null);
        }}
        vendor={vendorToView}
        onVendorUpdated={handleVendorUpdated}
      />
    </div>
  );
}