-- Migration: Agent Document System
-- Description: Add tables for agent document uploads, linking, and RAG processing

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(50) NOT NULL,  -- pdf, docx, txt, csv, xlsx, doc, xls
  file_size_bytes BIGINT NOT NULL,
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  is_shared BOOLEAN DEFAULT false,  -- true for shared library, false for agent-specific
  uploaded_by_agent_id VARCHAR(50),  -- null if shared, agent ID if agent-specific
  description TEXT,
  metadata JSONB,  -- extracted metadata (page count, author, etc.)
  processing_status VARCHAR(50) DEFAULT 'pending',  -- pending, processing, completed, failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for documents
CREATE INDEX IF NOT EXISTS idx_documents_agent_id ON documents(uploaded_by_agent_id);
CREATE INDEX IF NOT EXISTS idx_documents_shared ON documents(is_shared);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(file_type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_documents_upload_date ON documents(upload_date DESC);

-- Create agent_document_links table for many-to-many relationships
CREATE TABLE IF NOT EXISTS agent_document_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(50) NOT NULL,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  link_type VARCHAR(50) DEFAULT 'reference',  -- 'reference' (linked) or 'owned' (uploaded by agent)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint and indexes for agent_document_links
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_doc_links_unique ON agent_document_links(agent_id, document_id);
CREATE INDEX IF NOT EXISTS idx_agent_doc_links_agent ON agent_document_links(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_doc_links_doc ON agent_document_links(document_id);

-- Create document_chunks table for RAG processing
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding TEXT,  -- Store embeddings as JSON string (can upgrade to pgvector later)
  metadata JSONB,  -- page number, section, character positions, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for document_chunks
CREATE INDEX IF NOT EXISTS idx_chunks_document ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_document_index ON document_chunks(document_id, chunk_index);

-- Add comments for documentation
COMMENT ON TABLE documents IS 'Stores uploaded documents that can be referenced by agents';
COMMENT ON TABLE agent_document_links IS 'Many-to-many relationship between agents and documents';
COMMENT ON TABLE document_chunks IS 'Text chunks with embeddings for RAG semantic search';

COMMENT ON COLUMN documents.is_shared IS 'If true, available in shared library for all agents';
COMMENT ON COLUMN documents.uploaded_by_agent_id IS 'Agent ID if uploaded via agent-specific upload, null for shared';
COMMENT ON COLUMN documents.processing_status IS 'pending: not processed, processing: in progress, completed: ready, failed: error';
COMMENT ON COLUMN agent_document_links.link_type IS 'reference: linked from library, owned: uploaded by this agent';
COMMENT ON COLUMN document_chunks.embedding IS 'Vector embedding as JSON string (1536 dims for OpenAI text-embedding-3-small)';
