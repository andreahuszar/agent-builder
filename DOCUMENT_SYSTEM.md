# Agent Document Upload and RAG System

## Overview

The document system allows agents to reference external documents (procedures, SOWs, contracts, etc.) during invoice processing. Documents are processed using RAG (Retrieval-Augmented Generation) to enable semantic search and context-aware processing.

## Features

- **Dual Upload Modes**:
  - **Shared Library**: Documents available to all agents
  - **Agent-Specific**: Documents owned by individual agents

- **Supported File Types**:
  - PDF (.pdf)
  - Microsoft Word (.doc, .docx)
  - Microsoft Excel (.xls, .xlsx)
  - CSV (.csv)
  - Plain Text (.txt)

- **RAG Processing**:
  - Automatic text extraction from all file types
  - Smart chunking with sentence-boundary detection
  - OpenAI embeddings for semantic search
  - Cosine similarity matching for relevant context retrieval

- **File Size Limit**: 10MB per file

## Database Setup

### Run Migrations

```bash
# If database is running
npm run db:migrate:sql

# Or manually apply the migration
psql -h localhost -p 5433 -U postgres -d xelix_invoice_dev -f migrations/095_agent_documents.sql
```

This creates three tables:
1. `documents` - File metadata and storage tracking
2. `agent_document_links` - Many-to-many relationships between agents and documents
3. `document_chunks` - Text chunks with embeddings for RAG

## Usage

### 1. Upload to Shared Library

Navigate to **Agent Builder → Documents Tab**:
- Click "Upload Document"
- Drag and drop or browse for file
- Add optional description
- Document is immediately available to all agents

### 2. Upload Agent-Specific Document

In **Agent Builder → Build Mode** (when editing an agent):
- Scroll to "Reference Documents" section
- Click "Upload New"
- Upload document - it automatically links to the current agent

### 3. Link Existing Document to Agent

In the agent's "Reference Documents" section:
- Click "Link Existing"
- Select from shared library
- Click "Link"

### 4. Use Documents in Agent Processing

Documents are automatically processed with RAG:
- Text is extracted and chunked
- Embeddings are generated using OpenAI
- When agent processes invoices, relevant document sections are retrieved

## API Endpoints

### Upload Document
```typescript
POST /api/documents/upload
Content-Type: multipart/form-data

Body:
- file: File
- agentId?: string (optional, for agent-specific uploads)
- isShared: boolean
- description?: string (optional)

Response:
{
  success: true,
  document: {
    id: string,
    filename: string,
    filePath: string,
    fileType: string,
    fileSize: number,
    isShared: boolean,
    uploadDate: string
  }
}
```

### List Documents
```typescript
GET /api/documents?agentId={id}&isShared={true|false}&search={query}

Response:
{
  documents: [...],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

### Query Documents (RAG)
```typescript
POST /api/documents/query

Body:
{
  agentId: string,
  query: string,
  topK?: number (default: 5)
}

Response:
{
  results: [
    {
      content: string,
      score: number,
      documentId: string,
      chunkIndex: number
    }
  ]
}
```

### Link Document to Agent
```typescript
POST /api/agents/{agentId}/documents

Body:
{
  documentId: string
}
```

### Get Agent Documents
```typescript
GET /api/agents/{agentId}/documents

Response:
{
  documents: [...]
}
```

### Unlink Document
```typescript
DELETE /api/agents/{agentId}/documents?documentId={documentId}
```

## Architecture

### Storage
- Files stored in: `/public/uploads/`
  - Shared: `/public/uploads/shared/`
  - Agent-specific: `/public/uploads/agents/{agent-id}/`

### Processing Pipeline
1. **Upload** → File saved to filesystem + DB record created
2. **Extract** → Text extracted using appropriate parser (pdf-parse, mammoth, xlsx)
3. **Chunk** → Text split into ~1000 character chunks with overlap
4. **Embed** → OpenAI generates embeddings for each chunk
5. **Store** → Chunks and embeddings saved to database
6. **Query** → Semantic search retrieves relevant chunks for agent context

### RAG Integration
When an agent needs document context:
```typescript
import { getAgentContext } from '@/lib/documents/rag'

const context = await getAgentContext(agentId, "What is the approval policy?")
// Returns formatted string with relevant document sections and source attribution
```

## Configuration

### Environment Variables
Required in `.env.local`:
```env
OPENAI_API_KEY=sk-...  # For embeddings generation
DATABASE_URL=postgresql://...  # Database connection
```

### Embedding Model
- Uses: `text-embedding-3-small` (1536 dimensions)
- Cost-effective and fast
- Can upgrade to `text-embedding-3-large` for better quality

## Components

### DocumentUpload
```typescript
<DocumentUpload
  agentId={agentId}        // Optional, for agent-specific uploads
  isShared={true}          // If true, adds to shared library
  onUploadComplete={(doc) => {}}  // Callback after successful upload
  compact={false}          // Compact mode for smaller spaces
/>
```

### AgentDocuments
```typescript
<AgentDocuments
  agentId={agentId}        // Agent to show documents for
  disabled={false}         // Disable all interactions
/>
```

### DocumentsLibrary
```typescript
<DocumentsLibrary />  // Full-page document management interface
```

## Security Considerations

- File type validation prevents malicious uploads
- File size limit prevents DOS attacks
- Unique filenames prevent overwrites
- Cascade delete ensures orphaned files are cleaned up
- API routes should add authentication in production

## Future Enhancements

- [ ] Add pgvector extension for faster similarity search
- [ ] Implement document versioning
- [ ] Add virus scanning (ClamAV integration)
- [ ] Support for additional file types (images, audio transcripts)
- [ ] Document preview in UI
- [ ] Batch upload multiple files
- [ ] Background job queue for processing (Bull/BullMQ)
- [ ] Document access permissions and sharing controls
- [ ] Analytics: track which documents agents use most
- [ ] OCR for scanned documents
