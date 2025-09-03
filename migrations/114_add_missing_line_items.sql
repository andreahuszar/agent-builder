-- Add missing line items for seeded invoices
-- Each invoice should have at least 2-3 line items

-- INV-2024-0001 (Acme Office Supplies)
INSERT INTO invoice_lines (id, invoice_id, line_no, description, qty, uom, unit_price, net_amount, line_total, po_line_id)
VALUES 
  ('11111001-1111-1111-1111-111111111111', '11100001-1111-1111-1111-111111111111', 1, 'Office Chairs - Ergonomic', 10, 'EA', 350.00, 3500.00, 3500.00, null),
  ('11111002-1111-1111-1111-111111111111', '11100001-1111-1111-1111-111111111111', 2, 'Standing Desks', 5, 'EA', 200.00, 1000.00, 1000.00, null)
ON CONFLICT (id) DO NOTHING;

-- INV-2024-0002 (TechWorld Inc)
INSERT INTO invoice_lines (id, invoice_id, line_no, description, qty, uom, unit_price, net_amount, line_total, po_line_id)
VALUES 
  ('11111003-2222-2222-2222-222222222222', '11100002-2222-2222-2222-222222222222', 1, 'Laptop - Dell XPS 15', 5, 'EA', 1500.00, 7500.00, 7500.00, null),
  ('11111004-2222-2222-2222-222222222222', '11100002-2222-2222-2222-222222222222', 2, 'USB-C Docking Station', 5, 'EA', 250.00, 1250.00, 1250.00, null),
  ('11111005-2222-2222-2222-222222222222', '11100002-2222-2222-2222-222222222222', 3, 'Wireless Mouse', 10, 'EA', 45.00, 450.00, 450.00, null)
ON CONFLICT (id) DO NOTHING;

-- INV-2024-0003 (Global Logistics LLC)
INSERT INTO invoice_lines (id, invoice_id, line_no, description, qty, uom, unit_price, net_amount, line_total, po_line_id)
VALUES 
  ('11111006-3333-3333-3333-333333333333', '11100003-3333-3333-3333-333333333333', 1, 'Freight Charges - International', 1, 'LOT', 15000.00, 15000.00, 15000.00, null),
  ('11111007-3333-3333-3333-333333333333', '11100003-3333-3333-3333-333333333333', 2, 'Customs Clearance', 1, 'SVC', 500.00, 500.00, 500.00, null)
ON CONFLICT (id) DO NOTHING;

-- INV-2024-0004 (Software Solutions GmbH)
INSERT INTO invoice_lines (id, invoice_id, line_no, description, qty, uom, unit_price, net_amount, line_total, po_line_id)
VALUES 
  ('11111008-4444-4444-4444-444444444444', '11100004-4444-4444-4444-444444444444', 1, 'Software License - Enterprise', 50, 'USR', 120.00, 6000.00, 6000.00, null),
  ('11111009-4444-4444-4444-444444444444', '11100004-4444-4444-4444-444444444444', 2, 'Support & Maintenance', 1, 'YR', 1200.00, 1200.00, 1200.00, null)
ON CONFLICT (id) DO NOTHING;

-- INV-2024-0005 (Marketing Agency Pro)
INSERT INTO invoice_lines (id, invoice_id, line_no, description, qty, uom, unit_price, net_amount, line_total, po_line_id)
VALUES 
  ('11111010-5555-5555-5555-555555555555', '11100005-5555-5555-5555-555555555555', 1, 'Digital Marketing Campaign', 1, 'PRJ', 8000.00, 8000.00, 8000.00, null),
  ('11111011-5555-5555-5555-555555555555', '11100005-5555-5555-5555-555555555555', 2, 'Social Media Management', 3, 'MON', 1500.00, 4500.00, 4500.00, null)
ON CONFLICT (id) DO NOTHING;

-- INV-2024-0007 (Industrial Parts Co)
INSERT INTO invoice_lines (id, invoice_id, line_no, description, qty, uom, unit_price, net_amount, line_total, po_line_id)
VALUES 
  ('11111012-7777-7777-7777-777777777777', '11100007-7777-7777-7777-777777777777', 1, 'Hydraulic Pump Assembly', 2, 'EA', 3500.00, 7000.00, 7000.00, null),
  ('11111013-7777-7777-7777-777777777777', '11100007-7777-7777-7777-777777777777', 2, 'Pressure Valves', 10, 'EA', 150.00, 1500.00, 1500.00, null),
  ('11111014-7777-7777-7777-777777777777', '11100007-7777-7777-7777-777777777777', 3, 'Hydraulic Hoses', 20, 'FT', 25.00, 500.00, 500.00, null)
ON CONFLICT (id) DO NOTHING;

-- INV-2024-0008 (Catering Deluxe Services)
INSERT INTO invoice_lines (id, invoice_id, line_no, description, qty, uom, unit_price, net_amount, line_total, po_line_id)
VALUES 
  ('11111015-8888-8888-8888-888888888888', '11100008-8888-8888-8888-888888888888', 1, 'Corporate Event Catering', 150, 'PPL', 45.00, 6750.00, 6750.00, null),
  ('11111016-8888-8888-8888-888888888888', '11100008-8888-8888-8888-888888888888', 2, 'Equipment Rental', 1, 'DAY', 500.00, 500.00, 500.00, null)
ON CONFLICT (id) DO NOTHING;

-- INV-2024-0009 (Consulting Group International)
INSERT INTO invoice_lines (id, invoice_id, line_no, description, qty, uom, unit_price, net_amount, line_total, po_line_id)
VALUES 
  ('11111017-9999-9999-9999-999999999999', '11100009-9999-9999-9999-999999999999', 1, 'Strategy Consulting', 80, 'HRS', 250.00, 20000.00, 20000.00, null),
  ('11111018-9999-9999-9999-999999999999', '11100009-9999-9999-9999-999999999999', 2, 'Project Management', 40, 'HRS', 200.00, 8000.00, 8000.00, null),
  ('11111019-9999-9999-9999-999999999999', '11100009-9999-9999-9999-999999999999', 3, 'Travel Expenses', 1, 'LOT', 2000.00, 2000.00, 2000.00, null)
ON CONFLICT (id) DO NOTHING;

-- INV-2024-0011 (Legal Associates LLP)
INSERT INTO invoice_lines (id, invoice_id, line_no, description, qty, uom, unit_price, net_amount, line_total, po_line_id)
VALUES 
  ('11111020-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11100011-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1, 'Legal Services - Contract Review', 20, 'HRS', 350.00, 7000.00, 7000.00, null),
  ('11111021-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11100011-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 2, 'Document Preparation', 10, 'HRS', 250.00, 2500.00, 2500.00, null)
ON CONFLICT (id) DO NOTHING;

-- INV-2024-0012 (Green Energy Solutions)
INSERT INTO invoice_lines (id, invoice_id, line_no, description, qty, uom, unit_price, net_amount, line_total, po_line_id)
VALUES 
  ('11111022-cccc-cccc-cccc-cccccccccccc', '11100012-cccc-cccc-cccc-cccccccccccc', 1, 'Solar Panel Installation', 20, 'EA', 800.00, 16000.00, 16000.00, null),
  ('11111023-cccc-cccc-cccc-cccccccccccc', '11100012-cccc-cccc-cccc-cccccccccccc', 2, 'Inverter System', 2, 'EA', 2500.00, 5000.00, 5000.00, null),
  ('11111024-cccc-cccc-cccc-cccccccccccc', '11100012-cccc-cccc-cccc-cccccccccccc', 3, 'Installation Labor', 40, 'HRS', 75.00, 3000.00, 3000.00, null)
ON CONFLICT (id) DO NOTHING;

-- INV-2024-0013 (Medical Supplies Direct)
INSERT INTO invoice_lines (id, invoice_id, line_no, description, qty, uom, unit_price, net_amount, line_total, po_line_id)
VALUES 
  ('11111025-dddd-dddd-dddd-dddddddddddd', '11100013-dddd-dddd-dddd-dddddddddddd', 1, 'Surgical Masks - N95', 1000, 'EA', 2.50, 2500.00, 2500.00, null),
  ('11111026-dddd-dddd-dddd-dddddddddddd', '11100013-dddd-dddd-dddd-dddddddddddd', 2, 'Latex Gloves', 500, 'BOX', 12.00, 6000.00, 6000.00, null)
ON CONFLICT (id) DO NOTHING;

-- INV-2024-0014 (Cloud Services Corp)
INSERT INTO invoice_lines (id, invoice_id, line_no, description, qty, uom, unit_price, net_amount, line_total, po_line_id)
VALUES 
  ('11111027-eeee-eeee-eeee-eeeeeeeeeeee', '11100014-eeee-eeee-eeee-eeeeeeeeeeee', 1, 'Cloud Storage - 10TB', 12, 'MON', 500.00, 6000.00, 6000.00, null),
  ('11111028-eeee-eeee-eeee-eeeeeeeeeeee', '11100014-eeee-eeee-eeee-eeeeeeeeeeee', 2, 'Compute Instances', 24, 'MON', 250.00, 6000.00, 6000.00, null),
  ('11111029-eeee-eeee-eeee-eeeeeeeeeeee', '11100014-eeee-eeee-eeee-eeeeeeeeeeee', 3, 'Bandwidth Charges', 1000, 'GB', 0.50, 500.00, 500.00, null)
ON CONFLICT (id) DO NOTHING;

-- INV-2024-0016 (Real Estate Management Inc)
INSERT INTO invoice_lines (id, invoice_id, line_no, description, qty, uom, unit_price, net_amount, line_total, po_line_id)
VALUES 
  ('11111030-gggg-gggg-gggg-gggggggggggg', '11100016-gggg-gggg-gggg-gggggggggggg', 1, 'Office Rent - Monthly', 1, 'MON', 25000.00, 25000.00, 25000.00, null),
  ('11111031-gggg-gggg-gggg-gggggggggggg', '11100016-gggg-gggg-gggg-gggggggggggg', 2, 'Utilities', 1, 'MON', 3000.00, 3000.00, 3000.00, null)
ON CONFLICT (id) DO NOTHING;

-- INV-2024-0017 (Training Academy Plus)
INSERT INTO invoice_lines (id, invoice_id, line_no, description, qty, uom, unit_price, net_amount, line_total, po_line_id)
VALUES 
  ('11111032-hhhh-hhhh-hhhh-hhhhhhhhhhhh', '11100017-hhhh-hhhh-hhhh-hhhhhhhhhhhh', 1, 'Corporate Training Program', 30, 'PPL', 150.00, 4500.00, 4500.00, null),
  ('11111033-hhhh-hhhh-hhhh-hhhhhhhhhhhh', '11100017-hhhh-hhhh-hhhh-hhhhhhhhhhhh', 2, 'Training Materials', 30, 'SET', 50.00, 1500.00, 1500.00, null)
ON CONFLICT (id) DO NOTHING;

-- INV-2024-0018 (Security Services Group)
INSERT INTO invoice_lines (id, invoice_id, line_no, description, qty, uom, unit_price, net_amount, line_total, po_line_id)
VALUES 
  ('11111034-iiii-iiii-iiii-iiiiiiiiiiii', '11100018-iiii-iiii-iiii-iiiiiiiiiiii', 1, 'Security Guard Services', 720, 'HRS', 35.00, 25200.00, 25200.00, null),
  ('11111035-iiii-iiii-iiii-iiiiiiiiiiii', '11100018-iiii-iiii-iiii-iiiiiiiiiiii', 2, 'CCTV Monitoring', 1, 'MON', 2000.00, 2000.00, 2000.00, null)
ON CONFLICT (id) DO NOTHING;

-- INV-2024-0019 (Automotive Parts Wholesale)
INSERT INTO invoice_lines (id, invoice_id, line_no, description, qty, uom, unit_price, net_amount, line_total, po_line_id)
VALUES 
  ('11111036-jjjj-jjjj-jjjj-jjjjjjjjjjjj', '11100019-jjjj-jjjj-jjjj-jjjjjjjjjjjj', 1, 'Brake Pads - Premium', 50, 'SET', 85.00, 4250.00, 4250.00, null),
  ('11111037-jjjj-jjjj-jjjj-jjjjjjjjjjjj', '11100019-jjjj-jjjj-jjjj-jjjjjjjjjjjj', 2, 'Oil Filters', 100, 'EA', 12.50, 1250.00, 1250.00, null),
  ('11111038-jjjj-jjjj-jjjj-jjjjjjjjjjjj', '11100019-jjjj-jjjj-jjjj-jjjjjjjjjjjj', 3, 'Air Filters', 75, 'EA', 18.00, 1350.00, 1350.00, null)
ON CONFLICT (id) DO NOTHING;

-- INV-2024-0020 (Financial Advisory Partners)
INSERT INTO invoice_lines (id, invoice_id, line_no, description, qty, uom, unit_price, net_amount, line_total, po_line_id)
VALUES 
  ('11111039-kkkk-kkkk-kkkk-kkkkkkkkkkkk', '11100020-dddd-eeee-ffff-111111111111', 1, 'Financial Planning Services', 60, 'HRS', 300.00, 18000.00, 18000.00, null),
  ('11111040-kkkk-kkkk-kkkk-kkkkkkkkkkkk', '11100020-dddd-eeee-ffff-111111111111', 2, 'Tax Advisory', 20, 'HRS', 350.00, 7000.00, 7000.00, null),
  ('11111041-kkkk-kkkk-kkkk-kkkkkkkkkkkk', '11100020-dddd-eeee-ffff-111111111111', 3, 'Audit Services', 40, 'HRS', 275.00, 11000.00, 11000.00, null)
ON CONFLICT (id) DO NOTHING;