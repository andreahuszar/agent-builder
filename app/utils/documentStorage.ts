/**
 * Document storage utility for persisting uploaded files
 */

export async function storeDocument(file: File, agentId: string): Promise<string> {
  // Create FormData for file upload
  const formData = new FormData()
  formData.append('file', file)
  formData.append('agentId', agentId)
  
  // Upload to server
  const response = await fetch('/api/documents/store', {
    method: 'POST',
    body: formData
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to store document' }))
    throw new Error(error.error || 'Failed to store document')
  }
  
  const { filePath } = await response.json()
  return filePath // Returns: /uploads/agents/{agentId}/{filename}
}
