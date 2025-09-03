-- Add remaining line items for seeded invoices with proper UUID format

-- INV-2024-0016 (Real Estate Management Inc)
INSERT INTO invoice_lines (id, invoice_id, line_no, description, qty, uom, unit_price, net_amount, line_total, po_line_id)
VALUES 
  ('11111030-1616-1616-1616-161616161616', '11100016-1010-1010-1010-101010101010', 1, 'Office Rent - Monthly', 1, 'MON', 25000.00, 25000.00, 25000.00, null),
  ('11111031-1616-1616-1616-161616161616', '11100016-1010-1010-1010-101010101010', 2, 'Utilities', 1, 'MON', 3000.00, 3000.00, 3000.00, null)
ON CONFLICT (id) DO NOTHING;

-- INV-2024-0017 (Training Academy Plus)
INSERT INTO invoice_lines (id, invoice_id, line_no, description, qty, uom, unit_price, net_amount, line_total, po_line_id)
VALUES 
  ('11111032-1717-1717-1717-171717171717', '11100017-1111-2222-3333-444444444444', 1, 'Corporate Training Program', 30, 'PPL', 150.00, 4500.00, 4500.00, null),
  ('11111033-1717-1717-1717-171717171717', '11100017-1111-2222-3333-444444444444', 2, 'Training Materials', 30, 'SET', 50.00, 1500.00, 1500.00, null)
ON CONFLICT (id) DO NOTHING;

-- INV-2024-0018 (Security Services Group)
INSERT INTO invoice_lines (id, invoice_id, line_no, description, qty, uom, unit_price, net_amount, line_total, po_line_id)
VALUES 
  ('11111034-1818-1818-1818-181818181818', '11100018-5555-6666-7777-888888888888', 1, 'Security Guard Services', 720, 'HRS', 35.00, 25200.00, 25200.00, null),
  ('11111035-1818-1818-1818-181818181818', '11100018-5555-6666-7777-888888888888', 2, 'CCTV Monitoring', 1, 'MON', 2000.00, 2000.00, 2000.00, null)
ON CONFLICT (id) DO NOTHING;

-- INV-2024-0020 (Financial Advisory Partners) - Already has correct UUID format
INSERT INTO invoice_lines (id, invoice_id, line_no, description, qty, uom, unit_price, net_amount, line_total, po_line_id)
VALUES 
  ('11111039-2020-2020-2020-202020202020', '11100020-dddd-eeee-ffff-111111111111', 1, 'Financial Planning Services', 60, 'HRS', 300.00, 18000.00, 18000.00, null),
  ('11111040-2020-2020-2020-202020202020', '11100020-dddd-eeee-ffff-111111111111', 2, 'Tax Advisory', 20, 'HRS', 350.00, 7000.00, 7000.00, null),
  ('11111041-2020-2020-2020-202020202020', '11100020-dddd-eeee-ffff-111111111111', 3, 'Audit Services', 40, 'HRS', 275.00, 11000.00, 11000.00, null)
ON CONFLICT (id) DO NOTHING;