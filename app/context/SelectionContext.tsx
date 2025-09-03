'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface SelectionContextType {
  selectedLineId: string | null;
  selectedPOLineId: string | null;
  selectedGRLineId: string | null;
  selectInvoiceLine: (lineId: string | null) => void;
  selectPOLine: (lineId: string | null) => void;
  selectGRLine: (lineId: string | null) => void;
  clearSelection: () => void;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [selectedPOLineId, setSelectedPOLineId] = useState<string | null>(null);
  const [selectedGRLineId, setSelectedGRLineId] = useState<string | null>(null);

  const selectInvoiceLine = useCallback((lineId: string | null) => {
    setSelectedLineId(lineId);
    // TODO: Find and select corresponding PO and GR lines based on matching
  }, []);

  const selectPOLine = useCallback((lineId: string | null) => {
    setSelectedPOLineId(lineId);
    // TODO: Find and select corresponding invoice and GR lines
  }, []);

  const selectGRLine = useCallback((lineId: string | null) => {
    setSelectedGRLineId(lineId);
    // TODO: Find and select corresponding invoice and PO lines
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedLineId(null);
    setSelectedPOLineId(null);
    setSelectedGRLineId(null);
  }, []);

  return (
    <SelectionContext.Provider
      value={{
        selectedLineId,
        selectedPOLineId,
        selectedGRLineId,
        selectInvoiceLine,
        selectPOLine,
        selectGRLine,
        clearSelection,
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const context = useContext(SelectionContext);
  if (context === undefined) {
    throw new Error('useSelection must be used within a SelectionProvider');
  }
  return context;
}