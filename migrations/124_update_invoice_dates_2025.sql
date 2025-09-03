-- Update all invoice dates to be between August 11, 2025 and September 3, 2025
-- Due dates will be set to 30 days after invoice date

-- Update invoices with distributed dates across the specified range
UPDATE invoice_headers 
SET 
    invoice_date = new_dates.invoice_date,
    due_date = new_dates.invoice_date + INTERVAL '30 days'
FROM (
    SELECT 
        id,
        DATE '2025-08-11' + (ROW_NUMBER() OVER (ORDER BY invoice_number) - 1) * INTERVAL '1 day' AS invoice_date
    FROM invoice_headers
) AS new_dates
WHERE invoice_headers.id = new_dates.id;

-- Specific updates to ensure good distribution across the range
UPDATE invoice_headers SET 
    invoice_date = '2025-08-11',
    due_date = '2025-09-10'
WHERE invoice_number = 'INV-2024-0001';

UPDATE invoice_headers SET 
    invoice_date = '2025-08-12',
    due_date = '2025-09-11'
WHERE invoice_number = 'INV-2024-0002';

UPDATE invoice_headers SET 
    invoice_date = '2025-08-13',
    due_date = '2025-09-12'
WHERE invoice_number = 'INV-2024-0003';

UPDATE invoice_headers SET 
    invoice_date = '2025-08-14',
    due_date = '2025-09-13'
WHERE invoice_number = 'INV-2024-0004';

UPDATE invoice_headers SET 
    invoice_date = '2025-08-15',
    due_date = '2025-09-14'
WHERE invoice_number = 'INV-2024-0005';

UPDATE invoice_headers SET 
    invoice_date = '2025-08-16',
    due_date = '2025-09-15'
WHERE invoice_number = 'INV-2024-0006';

UPDATE invoice_headers SET 
    invoice_date = '2025-08-18',
    due_date = '2025-09-17'
WHERE invoice_number = 'INV-2024-0007';

UPDATE invoice_headers SET 
    invoice_date = '2025-08-19',
    due_date = '2025-09-18'
WHERE invoice_number = 'INV-2024-0008';

UPDATE invoice_headers SET 
    invoice_date = '2025-08-20',
    due_date = '2025-09-19'
WHERE invoice_number = 'INV-2024-0009';

UPDATE invoice_headers SET 
    invoice_date = '2025-08-21',
    due_date = '2025-09-20'
WHERE invoice_number = 'INV-2024-0010';

UPDATE invoice_headers SET 
    invoice_date = '2025-08-22',
    due_date = '2025-09-21'
WHERE invoice_number = 'INV-2024-0011';

UPDATE invoice_headers SET 
    invoice_date = '2025-08-23',
    due_date = '2025-09-22'
WHERE invoice_number = 'INV-2024-0012';

UPDATE invoice_headers SET 
    invoice_date = '2025-08-25',
    due_date = '2025-09-24'
WHERE invoice_number = 'INV-2024-0013';

UPDATE invoice_headers SET 
    invoice_date = '2025-08-26',
    due_date = '2025-09-25'
WHERE invoice_number = 'INV-2024-0014';

UPDATE invoice_headers SET 
    invoice_date = '2025-08-27',
    due_date = '2025-09-26'
WHERE invoice_number = 'INV-2024-0015';

UPDATE invoice_headers SET 
    invoice_date = '2025-08-28',
    due_date = '2025-09-27'
WHERE invoice_number = 'INV-2024-0016';

UPDATE invoice_headers SET 
    invoice_date = '2025-08-29',
    due_date = '2025-09-28'
WHERE invoice_number = 'INV-2024-0017';

UPDATE invoice_headers SET 
    invoice_date = '2025-08-30',
    due_date = '2025-09-29'
WHERE invoice_number = 'INV-2024-0018';

UPDATE invoice_headers SET 
    invoice_date = '2025-09-01',
    due_date = '2025-10-01'
WHERE invoice_number = 'INV-2024-0019';

-- Update electricity invoices
UPDATE invoice_headers SET 
    invoice_date = '2025-09-02',
    due_date = '2025-10-02'
WHERE invoice_number = 'ELEC-2024-001';

UPDATE invoice_headers SET 
    invoice_date = '2025-09-03',
    due_date = '2025-10-03'
WHERE invoice_number = 'ELEC-2024-002';