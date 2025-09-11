'use client';

import { useState, useEffect } from 'react';
import { Trash2, Edit2, Plus, Check, X } from 'lucide-react';

interface BankAccount {
  id: string;
  bank_name: string;
  account_number_masked: string;
  account_name?: string | null;
  account_number?: string | null;
  iban?: string | null;
  swift_bic?: string | null;
  sort_code?: string | null;
  routing_number?: string | null;
  is_default: boolean;
}

interface BankAccountFormProps {
  vendorId: string;
  onClose?: () => void;
}

export function BankAccountForm({ vendorId, onClose }: BankAccountFormProps) {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [formData, setFormData] = useState({
    bank_name: '',
    account_number_masked: '',
    account_name: '',
    account_number: '',
    iban: '',
    swift_bic: '',
    sort_code: '',
    routing_number: '',
    is_default: false,
  });

  // Fetch bank accounts
  const fetchBankAccounts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/vendors/${vendorId}/bank-accounts`);
      if (response.ok) {
        const data = await response.json();
        setBankAccounts(data.bankAccounts || []);
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBankAccounts();
  }, [vendorId]);

  // Handle form changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  // Start editing an account
  const startEdit = (account: BankAccount) => {
    setEditingId(account.id);
    setFormData({
      bank_name: account.bank_name,
      account_number_masked: account.account_number_masked,
      account_name: account.account_name || '',
      account_number: account.account_number || '',
      iban: account.iban || '',
      swift_bic: account.swift_bic || '',
      sort_code: account.sort_code || '',
      routing_number: account.routing_number || '',
      is_default: account.is_default,
    });
    setAddingNew(false);
  };

  // Start adding new account
  const startAddNew = () => {
    setAddingNew(true);
    setEditingId(null);
    setFormData({
      bank_name: '',
      account_number_masked: '',
      account_name: '',
      account_number: '',
      iban: '',
      swift_bic: '',
      sort_code: '',
      routing_number: '',
      is_default: bankAccounts.length === 0,
    });
  };

  // Cancel editing/adding
  const cancelEdit = () => {
    setEditingId(null);
    setAddingNew(false);
    setFormData({
      bank_name: '',
      account_number_masked: '',
      account_name: '',
      account_number: '',
      iban: '',
      swift_bic: '',
      sort_code: '',
      routing_number: '',
      is_default: false,
    });
  };

  // Save account (create or update)
  const saveAccount = async () => {
    try {
      const url = `/api/vendors/${vendorId}/bank-accounts`;
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId 
        ? { ...formData, accountId: editingId }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await fetchBankAccounts();
        cancelEdit();
      }
    } catch (error) {
      console.error('Error saving bank account:', error);
    }
  };

  // Delete account
  const deleteAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this bank account?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/vendors/${vendorId}/bank-accounts?accountId=${accountId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        await fetchBankAccounts();
      }
    } catch (error) {
      console.error('Error deleting bank account:', error);
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-gray-700">Loading bank accounts...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Bank Accounts</h3>
        {!addingNew && !editingId && (
          <button
            onClick={startAddNew}
            className="px-3 py-1.5 text-sm bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Account
          </button>
        )}
      </div>

      {/* Add new account form */}
      {addingNew && (
        <div className="border border-purple-300 rounded-lg p-4 bg-purple-50">
          <h4 className="font-medium text-gray-900 mb-3">New Bank Account</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Bank Name *
              </label>
              <input
                type="text"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Masked Account Number *
              </label>
              <input
                type="text"
                name="account_number_masked"
                value={formData.account_number_masked}
                onChange={handleChange}
                placeholder="****1234"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Account Name
              </label>
              <input
                type="text"
                name="account_name"
                value={formData.account_name}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Full Account Number
              </label>
              <input
                type="text"
                name="account_number"
                value={formData.account_number}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                IBAN
              </label>
              <input
                type="text"
                name="iban"
                value={formData.iban}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                SWIFT/BIC
              </label>
              <input
                type="text"
                name="swift_bic"
                value={formData.swift_bic}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Sort Code (UK)
              </label>
              <input
                type="text"
                name="sort_code"
                value={formData.sort_code}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Routing Number (US)
              </label>
              <input
                type="text"
                name="routing_number"
                value={formData.routing_number}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="is_default"
                checked={formData.is_default}
                onChange={handleChange}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-900">Set as default</span>
            </label>
            <div className="flex gap-2 ml-auto">
              <button
                onClick={cancelEdit}
                className="px-3 py-1.5 text-sm text-gray-900 hover:text-gray-950"
              >
                Cancel
              </button>
              <button
                onClick={saveAccount}
                disabled={!formData.bank_name || !formData.account_number_masked}
                className="px-3 py-1.5 text-sm bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Existing accounts list */}
      <div className="space-y-2">
        {bankAccounts.length === 0 && !addingNew ? (
          <p className="text-gray-700 text-sm">No bank accounts configured</p>
        ) : (
          bankAccounts.map((account) => (
            <div
              key={account.id}
              className={`border rounded-lg p-3 ${
                editingId === account.id ? 'border-purple-300 bg-purple-50' : 'border-gray-200'
              }`}
            >
              {editingId === account.id ? (
                // Edit form - show all fields
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Bank Name *
                      </label>
                      <input
                        type="text"
                        name="bank_name"
                        value={formData.bank_name}
                        onChange={handleChange}
                        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                        placeholder="Bank Name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Masked Account *
                      </label>
                      <input
                        type="text"
                        name="account_number_masked"
                        value={formData.account_number_masked}
                        onChange={handleChange}
                        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                        placeholder="****1234"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Account Name
                      </label>
                      <input
                        type="text"
                        name="account_name"
                        value={formData.account_name}
                        onChange={handleChange}
                        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                        placeholder="Account Holder Name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Full Account Number
                      </label>
                      <input
                        type="text"
                        name="account_number"
                        value={formData.account_number}
                        onChange={handleChange}
                        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                        placeholder="Full Account Number"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        IBAN
                      </label>
                      <input
                        type="text"
                        name="iban"
                        value={formData.iban}
                        onChange={handleChange}
                        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                        placeholder="International Bank Account Number"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        SWIFT/BIC
                      </label>
                      <input
                        type="text"
                        name="swift_bic"
                        value={formData.swift_bic}
                        onChange={handleChange}
                        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                        placeholder="SWIFT/BIC Code"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Sort Code (UK)
                      </label>
                      <input
                        type="text"
                        name="sort_code"
                        value={formData.sort_code}
                        onChange={handleChange}
                        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                        placeholder="12-34-56"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Routing Number (US)
                      </label>
                      <input
                        type="text"
                        name="routing_number"
                        value={formData.routing_number}
                        onChange={handleChange}
                        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                        placeholder="123456789"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="is_default"
                        checked={formData.is_default}
                        onChange={handleChange}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-900">Set as default account</span>
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveAccount}
                        disabled={!formData.bank_name || !formData.account_number_masked}
                        className="px-3 py-1.5 text-sm bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors disabled:opacity-50"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // Display view
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{account.bank_name}</span>
                      {account.is_default && (
                        <span className="inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      {account.account_number_masked}
                      {account.iban && ` • IBAN: ${account.iban}`}
                      {account.swift_bic && ` • SWIFT: ${account.swift_bic}`}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEdit(account)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteAccount(account.id)}
                      className="p-1 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}