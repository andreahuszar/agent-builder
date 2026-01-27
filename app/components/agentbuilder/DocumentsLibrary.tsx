'use client'

import { useState } from 'react'
import { FileText, Download, Search } from 'lucide-react'
import { Card } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import { Button } from '@/app/components/ui/button'
import { Agent, AgentDocument } from './AgentBuilderPage'
import { formatFileSize } from '@/app/utils/documentExtractor'

interface DocumentsLibraryProps {
  agents: Agent[]
}

export function DocumentsLibrary({ agents }: DocumentsLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  
  // Collect all documents from all agents
  const allDocuments: Array<AgentDocument & { agentName: string; agentId: string }> = []
  
  agents.forEach(agent => {
    if (agent.documents) {
      agent.documents.forEach(doc => {
        allDocuments.push({
          ...doc,
          agentName: agent.name,
          agentId: agent.id
        })
      })
    }
  })
  
  // Filter documents based on search
  const filteredDocs = allDocuments.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.agentName.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  const handleDownload = (doc: AgentDocument) => {
    const link = document.createElement('a')
    link.href = doc.filePath
    link.download = doc.name
    link.click()
  }
  
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-950">Documents Library</h1>
        <p className="text-muted-foreground mt-1">
          All documents referenced by agents
        </p>
      </div>
      
      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents or agents..."
            className="pl-9"
          />
        </div>
      </div>
      
      {/* Documents Grid */}
      {filteredDocs.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {searchQuery ? 'No documents found' : 'No documents uploaded yet'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <Card key={`${doc.agentId}-${doc.id}`} className="p-4">
              <div className="flex items-start gap-3">
                <FileText className="w-8 h-8 text-muted-foreground flex-shrink-0 mt-1" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate" title={doc.name}>
                    {doc.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatFileSize(doc.size)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Agent: <span className="font-medium">{doc.agentName}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(doc.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleDownload(doc)}
                >
                  <Download className="w-3 h-3 mr-1" />
                  Download
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
