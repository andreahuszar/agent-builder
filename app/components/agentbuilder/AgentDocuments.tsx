"use client"

import { useState, useEffect } from "react"
import { Card } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import { Badge } from "@/app/components/ui/badge"
import { DocumentUpload } from "./DocumentUpload"
import { FileText, X, Link as LinkIcon, Upload, Plus, ExternalLink } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog"

type Document = {
  id: string
  filename: string
  filePath: string
  fileType: string
  fileSize: number
  isShared: boolean
  description?: string | null
  uploadDate: string
  linkType: string
  processingStatus: string
}

interface AgentDocumentsProps {
  agentId: string | null
  disabled?: boolean
}

export function AgentDocuments({ agentId, disabled = false }: AgentDocumentsProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [allDocuments, setAllDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)

  const loadAgentDocuments = async () => {
    if (!agentId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/agents/${agentId}/documents`)
      const data = await response.json()

      if (response.ok) {
        setDocuments(data.documents)
      }
    } catch (error) {
      console.error("Error loading agent documents:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadAllDocuments = async () => {
    try {
      const response = await fetch("/api/documents?isShared=true")
      const data = await response.json()

      if (response.ok) {
        setAllDocuments(data.documents)
      }
    } catch (error) {
      console.error("Error loading all documents:", error)
    }
  }

  useEffect(() => {
    loadAgentDocuments()
  }, [agentId])

  const handleUnlink = async (documentId: string) => {
    if (!agentId) return

    try {
      const response = await fetch(`/api/agents/${agentId}/documents?documentId=${documentId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setDocuments(documents.filter((doc) => doc.id !== documentId))
      } else {
        alert("Failed to unlink document")
      }
    } catch (error) {
      console.error("Error unlinking document:", error)
      alert("Failed to unlink document")
    }
  }

  const handleLinkDocument = async (documentId: string) => {
    if (!agentId) return

    try {
      const response = await fetch(`/api/agents/${agentId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      })

      if (response.ok) {
        await loadAgentDocuments()
        setShowLinkDialog(false)
      } else {
        const data = await response.json()
        alert(data.error || "Failed to link document")
      }
    } catch (error) {
      console.error("Error linking document:", error)
      alert("Failed to link document")
    }
  }

  const handleUploadComplete = () => {
    setShowUploadDialog(false)
    loadAgentDocuments()
  }

  const getFileIcon = (type: string) => {
    if (type === "pdf") return "📄"
    if (type === "doc" || type === "docx") return "📝"
    if (type === "xls" || type === "xlsx") return "📊"
    if (type === "csv") return "📋"
    if (type === "txt") return "📝"
    return "📎"
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const availableToLink = allDocuments.filter(
    (doc) => !documents.some((linked) => linked.id === doc.id)
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Reference Documents</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Documents this agent can reference during processing
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || !agentId}
                onClick={() => loadAllDocuments()}
              >
                <LinkIcon className="w-3.5 h-3.5 mr-1.5" />
                Link Existing
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[600px] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Link Shared Document</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-4">
                {availableToLink.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No shared documents available to link
                  </p>
                ) : (
                  availableToLink.map((doc) => (
                    <Card key={doc.id} className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 flex-1">
                          <span className="text-xl">{getFileIcon(doc.fileType)}</span>
                          <div>
                            <p className="text-sm font-medium">{doc.filename}</p>
                            {doc.description && (
                              <p className="text-xs text-muted-foreground mt-1">{doc.description}</p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span>{formatFileSize(doc.fileSize)}</span>
                              <span>•</span>
                              <span>{doc.fileType.toUpperCase()}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleLinkDocument(doc.id)}
                        >
                          Link
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" size="sm" disabled={disabled || !agentId}>
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Upload New
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Upload Document for Agent</DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                <DocumentUpload
                  agentId={agentId}
                  isShared={false}
                  onUploadComplete={handleUploadComplete}
                  compact={false}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Documents List */}
      {loading ? (
        <Card className="p-6 text-center text-muted-foreground">
          Loading documents...
        </Card>
      ) : documents.length === 0 ? (
        <Card className="p-6 text-center">
          <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No documents linked to this agent yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Upload agent-specific documents or link from the shared library.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Card key={doc.id} className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-lg">{getFileIcon(doc.fileType)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{doc.filename}</p>
                      {doc.isShared && (
                        <Badge variant="outline" className="text-xs">
                          Shared
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>•</span>
                      <span>{doc.fileType.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(doc.filePath, "_blank")}
                    disabled={disabled}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnlink(doc.id)}
                    disabled={disabled}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
