import OpenAI from "openai"
import { prisma } from "@/lib/db"
import { processDocument, type DocumentChunk } from "./processor"

/**
 * Get OpenAI client (lazy initialization)
 */
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is not set")
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

/**
 * Generate embeddings for text chunks using OpenAI
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const openai = getOpenAIClient()
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
    })

    return response.data.map((item) => item.embedding)
  } catch (error) {
    console.error("Error generating embeddings:", error)
    throw error
  }
}

/**
 * Store document chunks with embeddings in database
 */
export async function storeChunks(
  documentId: string,
  chunks: DocumentChunk[],
  embeddings: number[][]
): Promise<void> {
  try {
    // Create all chunks with embeddings
    const chunkData = chunks.map((chunk, index) => ({
      document_id: documentId,
      chunk_index: chunk.metadata.chunkIndex,
      content: chunk.content,
      embedding: JSON.stringify(embeddings[index]), // Store as JSON string
      metadata: chunk.metadata,
    }))

    await prisma.document_chunks.createMany({
      data: chunkData,
    })
  } catch (error) {
    console.error("Error storing chunks:", error)
    throw error
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length")
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Query relevant document chunks for an agent using semantic search
 */
export async function queryDocuments(
  agentId: string,
  query: string,
  topK: number = 5
): Promise<Array<{ content: string; score: number; documentId: string; chunkIndex: number }>> {
  try {
    // Generate embedding for query
    const [queryEmbedding] = await generateEmbeddings([query])

    // Get all document IDs linked to this agent
    const links = await prisma.agent_document_links.findMany({
      where: { agent_id: agentId },
      select: { document_id: true },
    })

    const documentIds = links.map((link) => link.document_id)

    if (documentIds.length === 0) {
      return []
    }

    // Get all chunks for linked documents
    const chunks = await prisma.document_chunks.findMany({
      where: {
        document_id: { in: documentIds },
      },
      select: {
        id: true,
        document_id: true,
        chunk_index: true,
        content: true,
        embedding: true,
      },
    })

    // Calculate similarity scores
    const results = chunks
      .map((chunk) => {
        if (!chunk.embedding) return null

        const chunkEmbedding = JSON.parse(chunk.embedding)
        const score = cosineSimilarity(queryEmbedding, chunkEmbedding)

        return {
          content: chunk.content,
          score,
          documentId: chunk.document_id,
          chunkIndex: chunk.chunk_index,
        }
      })
      .filter((result): result is NonNullable<typeof result> => result !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)

    return results
  } catch (error) {
    console.error("Error querying documents:", error)
    throw error
  }
}

/**
 * Process a document: extract text, chunk it, generate embeddings, and store
 */
export async function processDocumentFull(documentId: string): Promise<void> {
  try {
    // Get document info
    const document = await prisma.documents.findUnique({
      where: { id: documentId },
    })

    if (!document) {
      throw new Error("Document not found")
    }

    // Update status to processing
    await prisma.documents.update({
      where: { id: documentId },
      data: { processing_status: "processing" },
    })

    // Extract and chunk text
    const { text, chunks, metadata } = await processDocument(
      documentId,
      document.file_path,
      document.file_type
    )

    // Generate embeddings for all chunks
    const chunkTexts = chunks.map((c) => c.content)
    const embeddings = await generateEmbeddings(chunkTexts)

    // Store chunks with embeddings
    await storeChunks(documentId, chunks, embeddings)

    // Update document with metadata and status
    await prisma.documents.update({
      where: { id: documentId },
      data: {
        metadata: metadata,
        processing_status: "completed",
      },
    })
  } catch (error) {
    console.error(`Error processing document ${documentId}:`, error)

    // Update status to failed
    await prisma.documents.update({
      where: { id: documentId },
      data: { processing_status: "failed" },
    })

    throw error
  }
}

/**
 * Get context for an agent by retrieving relevant document chunks
 */
export async function getAgentContext(agentId: string, query: string): Promise<string> {
  try {
    const results = await queryDocuments(agentId, query, 5)

    if (results.length === 0) {
      return ""
    }

    // Format context with source attribution
    let context = "=== RELEVANT REFERENCE DOCUMENTS ===\n\n"

    for (const result of results) {
      // Get document info for attribution
      const chunk = await prisma.document_chunks.findFirst({
        where: {
          document_id: result.documentId,
          chunk_index: result.chunkIndex,
        },
        include: {
          documents: {
            select: {
              original_filename: true,
            },
          },
        },
      })

      if (chunk) {
        context += `[Source: ${chunk.documents.original_filename}, Chunk ${result.chunkIndex}, Relevance: ${(result.score * 100).toFixed(1)}%]\n`
        context += `${result.content}\n\n`
      }
    }

    context += "=== END REFERENCE DOCUMENTS ===\n"

    return context
  } catch (error) {
    console.error("Error getting agent context:", error)
    return ""
  }
}
