// Mock Purchase Order Service - Provides mock PO data for UI demonstration

import { POHeader as APIPOHeader, POLine as APIPOLine } from '@/types/api';

// Extend API types to include lines array for POHeader
interface POHeader extends Omit<APIPOHeader, 'vendor_name' | 'order_date'> {
  vendor_name: string;
  order_date: string;
  lines: POLine[];
}

// Use API POLine type directly
type POLine = APIPOLine;

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
          id: 'po-line-9001-1',
          line_no: 1,
          description: 'Software License - Annual Subscription',
          item_description: 'Annual Software License',
          qty_ordered: 10,
          uom: 'License',
          unit_price: 200.00,
          qty_received_to_date: 0,
          qty_invoiced_to_date: 0,
          qty_remaining_to_receive: 10,
          qty_remaining_to_invoice: 10,
          status: 'open'
        },
        {
          id: 'po-line-9001-2',
          line_no: 2,
          description: 'Professional Services - Account Onboarding Sessions',
          item_description: 'Account Onboarding Sessions',
          qty_ordered: 4,
          uom: 'EA',
          unit_price: 1250.00,
          qty_received_to_date: 0,
          qty_invoiced_to_date: 0,
          qty_remaining_to_receive: 4,
          qty_remaining_to_invoice: 4,
          status: 'open'
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
          item_description: 'AWS Cloud Infrastructure',
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
          item_description: '24/7 Technical Support',
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
          item_description: 'Cloud Architecture Training',
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
          item_description: 'Mixed Office Supplies Pack',
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
          item_description: 'HP Laser Toner - Black',
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
          item_description: 'Hydraulic Pump Assembly',
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
          item_description: 'Senior Consultant Hours',
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
          item_description: 'Azure Cloud Hosting',
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
    },
    'PO-2025-8888': {
      id: 'mock-po-large',
      po_number: 'PO-2025-8888',
      vendor_name: 'Industrial Parts Ltd',
      order_date: '2025-02-15',
      currency: 'USD',
      status: 'open',
      lines: [
        // 18 perfectly matched lines
        { id: 'po-line-large-1', line_no: 1, description: 'Product Item 1 - High Quality Component', item_description: 'Component 1', qty_ordered: 5, uom: 'EA', unit_price: 150, qty_received_to_date: 0, qty_invoiced_to_date: 0, qty_remaining_to_receive: 5, qty_remaining_to_invoice: 5, status: 'open' },
        { id: 'po-line-large-2', line_no: 2, description: 'Product Item 2 - High Quality Component', item_description: 'Component 2', qty_ordered: 5, uom: 'EA', unit_price: 200, qty_received_to_date: 0, qty_invoiced_to_date: 0, qty_remaining_to_receive: 5, qty_remaining_to_invoice: 5, status: 'open' },
        { id: 'po-line-large-3', line_no: 3, description: 'Product Item 3 - High Quality Component', item_description: 'Component 3', qty_ordered: 5, uom: 'EA', unit_price: 250, qty_received_to_date: 0, qty_invoiced_to_date: 0, qty_remaining_to_receive: 5, qty_remaining_to_invoice: 5, status: 'open' },
        { id: 'po-line-large-4', line_no: 4, description: 'Product Item 4 - High Quality Component', item_description: 'Component 4', qty_ordered: 5, uom: 'EA', unit_price: 300, qty_received_to_date: 0, qty_invoiced_to_date: 0, qty_remaining_to_receive: 5, qty_remaining_to_invoice: 5, status: 'open' },
        { id: 'po-line-large-5', line_no: 5, description: 'Product Item 5 - High Quality Component', item_description: 'Component 5', qty_ordered: 10, uom: 'EA', unit_price: 350, qty_received_to_date: 0, qty_invoiced_to_date: 0, qty_remaining_to_receive: 10, qty_remaining_to_invoice: 10, status: 'open' },
        { id: 'po-line-large-6', line_no: 6, description: 'Product Item 6 - High Quality Component', item_description: 'Component 6', qty_ordered: 5, uom: 'EA', unit_price: 400, qty_received_to_date: 0, qty_invoiced_to_date: 0, qty_remaining_to_receive: 5, qty_remaining_to_invoice: 5, status: 'open' },
        { id: 'po-line-large-7', line_no: 7, description: 'Product Item 7 - High Quality Component', item_description: 'Component 7', qty_ordered: 5, uom: 'EA', unit_price: 450, qty_received_to_date: 0, qty_invoiced_to_date: 0, qty_remaining_to_receive: 5, qty_remaining_to_invoice: 5, status: 'open' },
        { id: 'po-line-large-8', line_no: 8, description: 'Product Item 8 - High Quality Component', item_description: 'Component 8', qty_ordered: 5, uom: 'EA', unit_price: 500, qty_received_to_date: 0, qty_invoiced_to_date: 0, qty_remaining_to_receive: 5, qty_remaining_to_invoice: 5, status: 'open' },
        { id: 'po-line-large-9', line_no: 9, description: 'Product Item 9 - High Quality Component', item_description: 'Component 9', qty_ordered: 5, uom: 'EA', unit_price: 550, qty_received_to_date: 0, qty_invoiced_to_date: 0, qty_remaining_to_receive: 5, qty_remaining_to_invoice: 5, status: 'open' },
        { id: 'po-line-large-10', line_no: 10, description: 'Product Item 10 - High Quality Component', item_description: 'Component 10', qty_ordered: 10, uom: 'EA', unit_price: 600, qty_received_to_date: 0, qty_invoiced_to_date: 0, qty_remaining_to_receive: 10, qty_remaining_to_invoice: 10, status: 'open' },
        { id: 'po-line-large-11', line_no: 11, description: 'Product Item 11 - High Quality Component', item_description: 'Component 11', qty_ordered: 5, uom: 'EA', unit_price: 650, qty_received_to_date: 0, qty_invoiced_to_date: 0, qty_remaining_to_receive: 5, qty_remaining_to_invoice: 5, status: 'open' },
        { id: 'po-line-large-12', line_no: 12, description: 'Product Item 12 - High Quality Component', item_description: 'Component 12', qty_ordered: 5, uom: 'EA', unit_price: 700, qty_received_to_date: 0, qty_invoiced_to_date: 0, qty_remaining_to_receive: 5, qty_remaining_to_invoice: 5, status: 'open' },
        { id: 'po-line-large-13', line_no: 13, description: 'Product Item 13 - High Quality Component', item_description: 'Component 13', qty_ordered: 5, uom: 'EA', unit_price: 750, qty_received_to_date: 0, qty_invoiced_to_date: 0, qty_remaining_to_receive: 5, qty_remaining_to_invoice: 5, status: 'open' },
        { id: 'po-line-large-14', line_no: 14, description: 'Product Item 14 - High Quality Component', item_description: 'Component 14', qty_ordered: 5, uom: 'EA', unit_price: 800, qty_received_to_date: 0, qty_invoiced_to_date: 0, qty_remaining_to_receive: 5, qty_remaining_to_invoice: 5, status: 'open' },
        { id: 'po-line-large-15', line_no: 15, description: 'Product Item 15 - High Quality Component', item_description: 'Component 15', qty_ordered: 10, uom: 'EA', unit_price: 850, qty_received_to_date: 0, qty_invoiced_to_date: 0, qty_remaining_to_receive: 10, qty_remaining_to_invoice: 10, status: 'open' },
        { id: 'po-line-large-16', line_no: 16, description: 'Product Item 16 - High Quality Component', item_description: 'Component 16', qty_ordered: 5, uom: 'EA', unit_price: 900, qty_received_to_date: 0, qty_invoiced_to_date: 0, qty_remaining_to_receive: 5, qty_remaining_to_invoice: 5, status: 'open' },
        { id: 'po-line-large-17', line_no: 17, description: 'Product Item 17 - High Quality Component', item_description: 'Component 17', qty_ordered: 5, uom: 'EA', unit_price: 950, qty_received_to_date: 0, qty_invoiced_to_date: 0, qty_remaining_to_receive: 5, qty_remaining_to_invoice: 5, status: 'open' },
        { id: 'po-line-large-18', line_no: 18, description: 'Product Item 18 - High Quality Component', item_description: 'Component 18', qty_ordered: 5, uom: 'EA', unit_price: 1000, qty_received_to_date: 0, qty_invoiced_to_date: 0, qty_remaining_to_receive: 5, qty_remaining_to_invoice: 5, status: 'open' },
        // 2 mismatched lines: line 19 has quantity difference, line 20 has unit price difference
        { id: 'po-line-large-19', line_no: 19, description: 'Product Item 19 - High Quality Component', item_description: 'Component 19', qty_ordered: 3, uom: 'EA', unit_price: 1050, qty_received_to_date: 0, qty_invoiced_to_date: 0, qty_remaining_to_receive: 3, qty_remaining_to_invoice: 3, status: 'open' },
        { id: 'po-line-large-20', line_no: 20, description: 'Product Item 20 - High Quality Component', item_description: 'Component 20', qty_ordered: 10, uom: 'EA', unit_price: 950, qty_received_to_date: 0, qty_invoiced_to_date: 0, qty_remaining_to_receive: 10, qty_remaining_to_invoice: 10, status: 'open' }
      ],
      subtotal: 0,
      total: 0
    },
    'PO-2025-9010': {
      id: 'mock-po-9010',
      po_number: 'PO-2025-9010',
      vendor_name: 'Fleet Inc.',
      order_date: '2025-10-15',
      currency: 'USD',
      status: 'open',
      lines: [
        {
          id: 'po-line-9010-1',
          line_no: 1,
          description: 'Toyota Prius 2022 (7 days)',
          item_description: 'Toyota Prius 2022 (7 days)',
          qty_ordered: 7,
          uom: 'DAYS',
          unit_price: 120.00,
          qty_received_to_date: 7,
          qty_invoiced_to_date: 7,
          qty_remaining_to_receive: 0,
          qty_remaining_to_invoice: 0,
          status: 'closed'
        },
        {
          id: 'po-line-9010-2',
          line_no: 2,
          description: 'Motor Insurnace - Comprehensive (Class 2 Vehicle)',
          item_description: 'Motor Insurnace - Comprehensive (Class 2 Vehicle)',
          qty_ordered: 7,
          uom: 'DAYS',
          unit_price: 30.00,
          qty_received_to_date: 7,
          qty_invoiced_to_date: 7,
          qty_remaining_to_receive: 0,
          qty_remaining_to_invoice: 0,
          status: 'closed'
        }
      ],
      subtotal: 1050.00,
      total: 1207.50
    },
    'PO-2025-9011': {
      id: 'mock-po-9011',
      po_number: 'PO-2025-9011',
      vendor_name: 'TechSupply Solutions Ltd',
      order_date: '2025-10-20',
      currency: 'GBP',
      status: 'open',
      lines: [
        {
          id: 'po-line-9011-1',
          line_no: 1,
          description: 'Equipment - Mower Extension',
          item_description: 'Equipment - Mower Extension',
          sku: 'EQ-012001',
          qty_ordered: 25,
          uom: 'Units',
          unit_price: 80.00,
          qty_received_to_date: 25,
          qty_invoiced_to_date: 25,
          qty_remaining_to_receive: 0,
          qty_remaining_to_invoice: 0,
          status: 'matched'
        },
        {
          id: 'po-line-9011-2',
          line_no: 2,
          description: 'Installation Services - On-site Setup',
          item_description: 'Installation Services - On-site Setup',
          sku: 'SE-002377',
          qty_ordered: 20,
          uom: 'Hours',
          unit_price: 95.00,
          qty_received_to_date: 20,
          qty_invoiced_to_date: 20,
          qty_remaining_to_receive: 0,
          qty_remaining_to_invoice: 0,
          status: 'matched'
        },
        {
          id: 'po-line-9011-3',
          line_no: 3,
          description: 'Training Materials - User Guides',
          item_description: 'Training Materials - User Guides',
          sku: 'GU-00101',
          qty_ordered: 15,
          uom: 'Units',
          unit_price: 45.00,
          qty_received_to_date: 15,
          qty_invoiced_to_date: 20,
          qty_remaining_to_receive: 0,
          qty_remaining_to_invoice: -5,
          status: 'variance'
        },
        {
          id: 'po-line-9011-4',
          line_no: 4,
          description: '12-Month Landscaping Service Contract',
          item_description: 'Landscaping Service Contract - SE-101789',
          sku: 'SE-101789',
          qty_ordered: 12,
          uom: 'Months',
          unit_price: 200.00,
          qty_received_to_date: 12,
          qty_invoiced_to_date: 12,
          qty_remaining_to_receive: 0,
          qty_remaining_to_invoice: 0,
          status: 'matched'
        },
        {
          id: 'po-line-9011-5',
          line_no: 5,
          description: 'Premium pleated air filters with MERV 9 rating',
          item_description: 'Air Filters MERV 9 - EQ-800111',
          sku: 'EQ-800111',
          qty_ordered: 50,
          uom: 'EA',
          unit_price: 45.00,
          qty_received_to_date: 0,
          qty_invoiced_to_date: 0,
          qty_remaining_to_receive: 50,
          qty_remaining_to_invoice: 50,
          status: 'open'
        },
        {
          id: 'po-line-9011-6',
          line_no: 6,
          description: 'Landscaping Sand',
          item_description: 'Ground Sand - MA-145784',
          sku: 'MA-145784',
          qty_ordered: 54,
          uom: 'EACH',
          unit_price: 50.00,
          qty_received_to_date: 54,
          qty_invoiced_to_date: 54,
          qty_remaining_to_receive: 0,
          qty_remaining_to_invoice: 0,
          status: 'open'
        }
      ],
      subtotal: 15230.00,
      total: 18276.00
    },
    'BG8891_470': {
      id: 'mock-po-9012',
      po_number: 'BG8891_470',
      vendor_name: 'Spectre Associates LLC',
      order_date: '2025-10-25',
      currency: 'GBP',
      status: 'open',
      lines: [
        {
          id: 'po-line-9012-1',
          line_no: 1,
          description: 'M&A Contract Preparation',
          item_description: 'M&A Contract Preparation',
          sku: null,
          qty_ordered: 2400,
          uom: 'UNIT',
          unit_price: 10.00,
          qty_received_to_date: 2400,
          qty_invoiced_to_date: 2400,
          qty_remaining_to_receive: 0,
          qty_remaining_to_invoice: 0,
          status: 'matched'
        },
        {
          id: 'po-line-9012-2',
          line_no: 2,
          description: 'Advisory - M&A, Financial Services',
          item_description: 'Legal Advisory Services',
          sku: null,
          qty_ordered: 14,
          uom: 'HOUR',
          unit_price: 1800.00,
          qty_received_to_date: 14,
          qty_invoiced_to_date: 14,
          qty_remaining_to_receive: 0,
          qty_remaining_to_invoice: 0,
          status: 'matched'
        },
        {
          id: 'po-line-9012-3',
          line_no: 3,
          description: 'Board Transition Strategy',
          item_description: 'Board Transition Strategy',
          sku: null,
          qty_ordered: 1,
          uom: 'UNIT',
          unit_price: 35000.00,
          qty_received_to_date: 1,
          qty_invoiced_to_date: 1,
          qty_remaining_to_receive: 0,
          qty_remaining_to_invoice: 0,
          status: 'variance'
        }
      ],
      subtotal: 85200.00,
      total: 102240.00
    },
    'PO-2025-7755': {
      id: 'mock-po-7755',
      po_number: 'PO-2025-7755',
      vendor_name: 'Industrial Equipment Corp',
      order_date: '2025-01-18',
      currency: 'USD',
      status: 'open',
      lines: [
        {
          id: 'po-line-7755-1',
          line_no: 1,
          description: 'Industrial Pump Model XL-500',
          item_description: 'Heavy-duty industrial pump with 500HP motor',
          qty_ordered: 5,
          uom: 'EA',
          unit_price: 2400.00,
          qty_received_to_date: 0,
          qty_invoiced_to_date: 0,
          qty_remaining_to_receive: 5,
          qty_remaining_to_invoice: 5,
          status: 'open'
        },
        {
          id: 'po-line-7755-2',
          line_no: 2,
          description: 'Hydraulic Valve Set - Premium',
          item_description: 'Premium hydraulic valve set with connectors',
          qty_ordered: 10,
          uom: 'EA',
          unit_price: 350.00,
          qty_received_to_date: 0,
          qty_invoiced_to_date: 0,
          qty_remaining_to_receive: 10,
          qty_remaining_to_invoice: 10,
          status: 'open'
        }
      ],
      subtotal: 0,
      total: 0
    },
    'PO-2025-8901': {
      id: 'mock-po-8901',
      po_number: 'PO-2025-8901',
      vendor_name: 'Premier Office Supplies',
      order_date: '2025-10-18',
      currency: 'USD',
      status: 'approved',
      lines: [
        {
          id: 'po-line-8901-1',
          line_no: 1,
          description: 'Premium Copy Paper, 8.5×11, 20lb, White',
          item_description: 'Copy Paper - Premium White',
          qty_ordered: 10,
          uom: 'RM',
          unit_price: 45.00,
          qty_received_to_date: 0,
          qty_invoiced_to_date: 0,
          qty_remaining_to_receive: 10,
          qty_remaining_to_invoice: 10,
          status: 'open'
        },
        {
          id: 'po-line-8901-2',
          line_no: 2,
          description: 'Laser Printer Toner Cartridge, Black, High Yield',
          item_description: 'Toner Cartridge - Black High Yield',
          qty_ordered: 5,
          uom: 'EA',
          unit_price: 89.00,
          qty_received_to_date: 0,
          qty_invoiced_to_date: 0,
          qty_remaining_to_receive: 5,
          qty_remaining_to_invoice: 5,
          status: 'open'
        },
        {
          id: 'po-line-8901-3',
          line_no: 3,
          description: 'Manila File Folders, Letter Size, Box of 100',
          item_description: 'File Folders - Manila Letter',
          qty_ordered: 3,
          uom: 'BX',
          unit_price: 18.50,
          qty_received_to_date: 0,
          qty_invoiced_to_date: 0,
          qty_remaining_to_receive: 3,
          qty_remaining_to_invoice: 3,
          status: 'open'
        },
        {
          id: 'po-line-8901-4',
          line_no: 4,
          description: 'Ballpoint Pens, Black, Medium Point, Box of 12',
          item_description: 'Pens - Ballpoint Black Medium',
          qty_ordered: 8,
          uom: 'BX',
          unit_price: 6.25,
          qty_received_to_date: 0,
          qty_invoiced_to_date: 0,
          qty_remaining_to_receive: 8,
          qty_remaining_to_invoice: 8,
          status: 'open'
        }
      ],
      subtotal: 1000.50,
      total: 1000.50
    },
    'PO-2025-8902': {
      id: 'mock-po-8902',
      po_number: 'PO-2025-8902',
      vendor_name: 'Premier Office Supplies',
      order_date: '2025-10-05',
      currency: 'USD',
      status: 'open',
      lines: [
        {
          id: 'po-line-8902-1',
          line_no: 1,
          description: 'Recycled Copy Paper, 8.5×11, 20lb, White',
          item_description: 'Copy Paper - Recycled White',
          qty_ordered: 20,
          uom: 'RM',
          unit_price: 42.00,
          qty_received_to_date: 0,
          qty_invoiced_to_date: 0,
          qty_remaining_to_receive: 20,
          qty_remaining_to_invoice: 20,
          status: 'open'
        },
        {
          id: 'po-line-8902-2',
          line_no: 2,
          description: 'Desk Organizer Set, Black Mesh',
          item_description: 'Desk Organizer - Black Mesh',
          qty_ordered: 12,
          uom: 'EA',
          unit_price: 24.99,
          qty_received_to_date: 0,
          qty_invoiced_to_date: 0,
          qty_remaining_to_receive: 12,
          qty_remaining_to_invoice: 12,
          status: 'open'
        }
      ],
      subtotal: 0,
      total: 0
    },
    'PO-2025-8903': {
      id: 'mock-po-8903',
      po_number: 'PO-2025-8903',
      vendor_name: 'Premier Office Supplies',
      order_date: '2025-09-28',
      currency: 'USD',
      status: 'open',
      lines: [
        {
          id: 'po-line-8903-1',
          line_no: 1,
          description: 'Whiteboard Markers, Assorted Colors, Pack of 12',
          item_description: 'Whiteboard Markers - Assorted',
          qty_ordered: 6,
          uom: 'PK',
          unit_price: 16.50,
          qty_received_to_date: 0,
          qty_invoiced_to_date: 0,
          qty_remaining_to_receive: 6,
          qty_remaining_to_invoice: 6,
          status: 'open'
        },
        {
          id: 'po-line-8903-2',
          line_no: 2,
          description: 'Hanging File Folders, Legal Size, Box of 25',
          item_description: 'File Folders - Hanging Legal',
          qty_ordered: 4,
          uom: 'BX',
          unit_price: 28.75,
          qty_received_to_date: 0,
          qty_invoiced_to_date: 0,
          qty_remaining_to_receive: 4,
          qty_remaining_to_invoice: 4,
          status: 'open'
        },
        {
          id: 'po-line-8903-3',
          line_no: 3,
          description: 'Label Maker Tape Cartridges, 1/2", Black on White',
          item_description: 'Label Tape - 1/2" Black/White',
          qty_ordered: 10,
          uom: 'EA',
          unit_price: 9.99,
          qty_received_to_date: 0,
          qty_invoiced_to_date: 0,
          qty_remaining_to_receive: 10,
          qty_remaining_to_invoice: 10,
          status: 'open'
        }
      ],
      subtotal: 0,
      total: 0
    },
    'PO-2025-8904': {
      id: 'mock-po-8904',
      po_number: 'PO-2025-8904',
      vendor_name: 'Premier Office Supplies',
      order_date: '2025-10-12',
      currency: 'USD',
      status: 'open',
      lines: [
        {
          id: 'po-line-8904-1',
          line_no: 1,
          description: 'Executive Leather Desk Pad, Black',
          item_description: 'Desk Pad - Executive Leather Black',
          qty_ordered: 5,
          uom: 'EA',
          unit_price: 45.00,
          qty_received_to_date: 0,
          qty_invoiced_to_date: 0,
          qty_remaining_to_receive: 5,
          qty_remaining_to_invoice: 5,
          status: 'open'
        },
        {
          id: 'po-line-8904-2',
          line_no: 2,
          description: 'Staple Remover, Heavy Duty',
          item_description: 'Staple Remover - Heavy Duty',
          qty_ordered: 15,
          uom: 'EA',
          unit_price: 3.25,
          qty_received_to_date: 0,
          qty_invoiced_to_date: 0,
          qty_remaining_to_receive: 15,
          qty_remaining_to_invoice: 15,
          status: 'open'
        },
        {
          id: 'po-line-8904-3',
          line_no: 3,
          description: 'Correction Tape, Side Applicator, Pack of 10',
          item_description: 'Correction Tape - Side Applicator',
          qty_ordered: 8,
          uom: 'PK',
          unit_price: 14.50,
          qty_received_to_date: 0,
          qty_invoiced_to_date: 0,
          qty_remaining_to_receive: 8,
          qty_remaining_to_invoice: 8,
          status: 'open'
        },
        {
          id: 'po-line-8904-4',
          line_no: 4,
          description: 'Rubber Bands, Assorted Sizes, 1lb Box',
          item_description: 'Rubber Bands - Assorted',
          qty_ordered: 3,
          uom: 'BX',
          unit_price: 8.99,
          qty_received_to_date: 0,
          qty_invoiced_to_date: 0,
          qty_remaining_to_receive: 3,
          qty_remaining_to_invoice: 3,
          status: 'open'
        }
      ],
      subtotal: 0,
      total: 0
    },
    'PO-2025-8905': {
      id: 'mock-po-8905',
      po_number: 'PO-2025-8905',
      vendor_name: 'Premier Office Supplies',
      order_date: '2025-10-20',
      currency: 'USD',
      status: 'open',
      lines: [
        {
          id: 'po-line-8905-1',
          line_no: 1,
          description: 'Paper Clips, Jumbo, Silver, Box of 100',
          item_description: 'Paper Clips - Jumbo Silver',
          qty_ordered: 20,
          uom: 'BX',
          unit_price: 4.25,
          qty_received_to_date: 0,
          qty_invoiced_to_date: 0,
          qty_remaining_to_receive: 20,
          qty_remaining_to_invoice: 20,
          status: 'open'
        },
        {
          id: 'po-line-8905-2',
          line_no: 2,
          description: 'Binder Clips, Large, Black, Box of 12',
          item_description: 'Binder Clips - Large Black',
          qty_ordered: 15,
          uom: 'BX',
          unit_price: 7.50,
          qty_received_to_date: 0,
          qty_invoiced_to_date: 0,
          qty_remaining_to_receive: 15,
          qty_remaining_to_invoice: 15,
          status: 'open'
        }
      ],
      subtotal: 0,
      total: 0
    },
    'PO-2025-8906': {
      id: 'mock-po-8906',
      po_number: 'PO-2025-8906',
      vendor_name: 'Premier Office Supplies',
      order_date: '2025-09-15',
      currency: 'USD',
      status: 'open',
      lines: [
        {
          id: 'po-line-8906-1',
          line_no: 1,
          description: 'Scissors, 8", Stainless Steel',
          item_description: 'Scissors - 8" Stainless',
          qty_ordered: 25,
          uom: 'EA',
          unit_price: 6.75,
          qty_received_to_date: 0,
          qty_invoiced_to_date: 0,
          qty_remaining_to_receive: 25,
          qty_remaining_to_invoice: 25,
          status: 'open'
        },
        {
          id: 'po-line-8906-2',
          line_no: 2,
          description: 'Tape Dispenser, Desktop, Weighted Base',
          item_description: 'Tape Dispenser - Desktop Weighted',
          qty_ordered: 10,
          uom: 'EA',
          unit_price: 12.99,
          qty_received_to_date: 0,
          qty_invoiced_to_date: 0,
          qty_remaining_to_receive: 10,
          qty_remaining_to_invoice: 10,
          status: 'open'
        },
        {
          id: 'po-line-8906-3',
          line_no: 3,
          description: 'Push Pins, Assorted Colors, Box of 100',
          item_description: 'Push Pins - Assorted Colors',
          qty_ordered: 12,
          uom: 'BX',
          unit_price: 3.99,
          qty_received_to_date: 0,
          qty_invoiced_to_date: 0,
          qty_remaining_to_receive: 12,
          qty_remaining_to_invoice: 12,
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

  // Check if PO number matches mock pattern (PO-2025-9xxx or PO-2025-8xxx)
  return poNumber.startsWith('PO-2025-9') || poNumber.startsWith('PO-2025-8');
};