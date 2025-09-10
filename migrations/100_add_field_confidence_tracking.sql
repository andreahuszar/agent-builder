-- Add field confidence tracking to invoice_headers
ALTER TABLE invoice_headers 
ADD COLUMN IF NOT EXISTS extraction_field_confidences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_manually_edited JSONB DEFAULT '{}';

-- Add comments for documentation
COMMENT ON COLUMN invoice_headers.extraction_field_confidences IS 'Stores confidence scores (0-100) for each extracted field from AI processing';
COMMENT ON COLUMN invoice_headers.is_manually_edited IS 'Tracks which fields have been manually edited by users (field_name: true/false)';