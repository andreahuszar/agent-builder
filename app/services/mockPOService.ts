// Mock Purchase Order Service - Provides mock PO data for UI demonstration

interface POLine {
  id: string;
  line_no: number;
  description: string;
  item_name?: string;
  qty_ordered: number;
  uom: string;
  unit_price: number;
  qty_received_to_date?: number;
  qty_invoiced_to_date?: number;
  qty_remaining_to_receive?: number;
  qty_remaining_to_invoice?: number;
  status: string;
}

interface POHeader {
  id: string;
  po_number: string;
  vendor_name: string;
  order_date: string;
  currency: string;
  status: string;
  lines: POLine[];
  subtotal: number;
  total: number;
}

// Generate mock PO data
export const generateMockPOs = (): Record<string, POHeader> => {
  const mockPOs: Record<string, POHeader> = {
    'PO-2025-9001': {
      id: 'mock-po-1',
      po_number: 'PO-2025-9001',
      vendor_name: 'TechSupply Solutions Ltd',
      order_date: '2025-01-15',
      currency: 'GBP',
      status: 'open',
      lines: [
        {
          id: 'po-line-1',
          line_no: 1,
          description: 'Professional Services - IT Consulting',
          item_name: 'Consulting Hours - Senior Developer',
          qty_ordered: 40,
          uom: 'Hours',
          unit_price: 125.00,
          qty_received_to_date: 0,
          qty_invoiced_to_date: 0,
          qty_remaining_to_receive: 40,
          qty_remaining_to_invoice: 40,
          status: 'open'
        },
        {
          id: 'po-line-2',
          line_no: 2,
          description: 'Software License - Enterprise Edition',
          item_name: 'Annual Software License',
          qty_ordered: 10,
          uom: 'License',
          unit_price: 450.00,
          qty_received_to_date: 10,
          qty_invoiced_to_date: 5,
          qty_remaining_to_receive: 0,
          qty_remaining_to_invoice: 5,
          status: 'partially_received'
        },
        {
          id: 'po-line-3',
          line_no: 3,
          description: 'Hardware - Server Equipment',
          item_name: 'Dell PowerEdge R740 Server',
          qty_ordered: 2,
          uom: 'Units',
          unit_price: 3500.00,
          qty_received_to_date: 2,
          qty_invoiced_to_date: 0,
          qty_remaining_to_receive: 0,
          qty_remaining_to_invoice: 2,
          status: 'received'
        }
      ],
      subtotal: 0,
      total: 0
    },
    'PO-2025-9002': {
      id: 'mock-po-2',
      po_number: 'PO-2025-9002',
      vendor_name: 'TechSupply Solutions Ltd',
      order_date: '2025-01-20',
      currency: 'GBP',
      status: 'open',
      lines: [
        {
          id: 'po-line-4',
          line_no: 1,
          description: 'Cloud Services - Monthly Subscription',
          item_name: 'AWS Cloud Infrastructure',
          qty_ordered: 1,
          uom: 'Month',
          unit_price: 2500.00,
          qty_received_to_date: 0,
          qty_invoiced_to_date: 0,
          qty_remaining_to_receive: 1,
          qty_remaining_to_invoice: 1,
          status: 'open'
        },
        {
          id: 'po-line-5',
          line_no: 2,
          description: 'Support Services - Premium Support',
          item_name: '24/7 Technical Support',
          qty_ordered: 1,
          uom: 'Month',
          unit_price: 1200.00,
          qty_received_to_date: 0,
          qty_invoiced_to_date: 0,
          qty_remaining_to_receive: 1,
          qty_remaining_to_invoice: 1,
          status: 'open'
        },
        {
          id: 'po-line-6',
          line_no: 3,
          description: 'Training Services - Staff Training',
          item_name: 'Cloud Architecture Training',
          qty_ordered: 5,
          uom: 'Days',
          unit_price: 800.00,
          qty_received_to_date: 0,
          qty_invoiced_to_date: 0,
          qty_remaining_to_receive: 5,
          qty_remaining_to_invoice: 5,
          status: 'open'
        }
      ],
      subtotal: 0,
      total: 0
    },
    'PO-2025-9009': {
      id: 'mock-po-9',
      po_number: 'PO-2025-9009',
      vendor_name: 'Global Supply Chain Partners',
      order_date: '2025-02-01',
      currency: 'USD',
      status: 'open',
      lines: [
        {
          id: 'po-line-19',
          line_no: 1,
          description: 'Office Supplies - Bulk Order',
          item_name: 'Mixed Office Supplies Pack',
          qty_ordered: 100,
          uom: 'Pack',
          unit_price: 45.00,
          qty_received_to_date: 0,
          qty_invoiced_to_date: 0,
          qty_remaining_to_receive: 100,
          qty_remaining_to_invoice: 100,
          status: 'open'
        },
        {
          id: 'po-line-20',
          line_no: 2,
          description: 'Printing Supplies - Toner Cartridges',
          item_name: 'HP Laser Toner - Black',
          qty_ordered: 50,
          uom: 'Units',
          unit_price: 85.00,
          qty_received_to_date: 0,
          qty_invoiced_to_date: 0,
          qty_remaining_to_receive: 50,
          qty_remaining_to_invoice: 50,
          status: 'open'
        }
      ],
      subtotal: 0,
      total: 0
    },
    'PO-2025-8501': {
      id: 'mock-po-8501',
      po_number: 'PO-2025-8501',
      vendor_name: 'Industrial Equipment Co',
      order_date: '2025-01-10',
      currency: 'USD',
      status: 'open',
      lines: [
        {
          id: 'po-line-21',
          line_no: 1,
          description: 'Industrial Machinery Parts',
          item_name: 'Hydraulic Pump Assembly',
          qty_ordered: 5,
          uom: 'Units',
          unit_price: 2400.00,
          qty_received_to_date: 0,
          qty_invoiced_to_date: 0,
          qty_remaining_to_receive: 5,
          qty_remaining_to_invoice: 5,
          status: 'open'
        }
      ],
      subtotal: 0,
      total: 0
    },
    'PO-2025-8502': {
      id: 'mock-po-8502',
      po_number: 'PO-2025-8502',
      vendor_name: 'Professional IT Services',
      order_date: '2025-01-25',
      currency: 'USD',
      status: 'open',
      lines: [
        {
          id: 'po-line-22',
          line_no: 1,
          description: 'IT Consulting Services',
          item_name: 'Senior Consultant Hours',
          qty_ordered: 100,
          uom: 'Hours',
          unit_price: 150.00,
          qty_received_to_date: 0,
          qty_invoiced_to_date: 0,
          qty_remaining_to_receive: 100,
          qty_remaining_to_invoice: 100,
          status: 'open'
        }
      ],
      subtotal: 0,
      total: 0
    },
    'PO-2025-8503': {
      id: 'mock-po-8503',
      po_number: 'PO-2025-8503',
      vendor_name: 'CloudNet Systems Inc',
      order_date: '2025-01-18',
      currency: 'USD',
      status: 'open',
      lines: [
        {
          id: 'po-line-23',
          line_no: 1,
          description: 'Cloud Infrastructure Services',
          item_name: 'Azure Cloud Hosting',
          qty_ordered: 1,
          uom: 'Month',
          unit_price: 3200.00,
          qty_received_to_date: 0,
          qty_invoiced_to_date: 0,
          qty_remaining_to_receive: 1,
          qty_remaining_to_invoice: 1,
          status: 'open'
        }
      ],
      subtotal: 0,
      total: 0
    }
  };

  // Calculate totals for each PO
  Object.values(mockPOs).forEach(po => {
    po.subtotal = po.lines.reduce((sum, line) => sum + (line.qty_ordered * line.unit_price), 0);
    po.total = po.subtotal;
  });

  return mockPOs;
};

// Get mock PO by number
export const getMockPOByNumber = (poNumber: string): POHeader | null => {
  const mockPOs = generateMockPOs();
  return mockPOs[poNumber] || null;
};

// Get all mock POs for a vendor
export const getMockPOsByVendor = (vendorName: string): POHeader[] => {
  const mockPOs = generateMockPOs();
  return Object.values(mockPOs).filter(po =>
    po.vendor_name.toLowerCase().includes(vendorName.toLowerCase())
  );
};

// Get all mock POs
export const getAllMockPOs = (): POHeader[] => {
  const mockPOs = generateMockPOs();
  return Object.values(mockPOs);
};

// Check if this is a mock PO number
export const isMockPO = (poNumber: string): boolean => {
  const useMockData = process.env.USE_MOCK_DATA === 'true' || process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';
  if (!useMockData) return false;

  // Check if PO number matches mock pattern
  return poNumber.startsWith('PO-2025-9');
};