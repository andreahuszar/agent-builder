"use client"

import { useState, useEffect } from "react"
import { Card } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Badge } from "@/app/components/ui/badge"
import { DocumentUpload } from "./DocumentUpload"
import { Search, Trash2, FileText, Link as LinkIcon, Download } from "lucide-react"
import { Checkbox } from "@/app/components/ui/checkbox"
import { Label } from "@/app/components/ui/label"

type Document = {
  id: string
  filename: string
  filePath: string
  fileType: string
  fileSize: number
  isShared: boolean
  uploadedByAgentId?: string | null
  description?: string | null
  uploadDate: string
  processingStatus: string
  linkedAgents: string[]
}

export function DocumentsLibrary() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showSharedOnly, setShowSharedOnly] = useState(false)
  const [showUpload, setShowUpload] = useState(false)

  const loadDocuments = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchQuery) params.append("search", searchQuery)
      if (showSharedOnly) params.append("isShared", "true")

      const response = await fetch(`/api/documents?${params}`)
      const data = await response.json()

      if (response.ok) {
        setDocuments(data.documents)
      }
    } catch (error) {
      console.error("Error loading documents:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()
  }, [searchQuery, showSharedOnly])

  const handleDelete = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document? This cannot be undone.")) {
      return
    }

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setDocuments(documents.filter((doc) => doc.id !== documentId))
      } else {
        alert("Failed to delete document")
      }
    } catch (error) {
      console.error("Error deleting document:", error)
      alert("Failed to delete document")
    }
  }

  const handleUploadComplete = () => {
    setShowUpload(false)
    loadDocuments()
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  return (
    <div className="h-full overflow-y-auto p-6 bg-background">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Document Library</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Upload and manage reference documents for your agents
            </p>
          </div>
          <Button onClick={() => setShowUpload(!showUpload)}>
            {showUpload ? "Cancel" : "Upload Document"}
          </Button>
        </div>

        {/* Upload Section */}
        {showUpload && (
          <DocumentUpload isShared={true} onUploadComplete={handleUploadComplete} />
        )}

        {/* Filters */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="shared-only"
                checked={showSharedOnly}
                onCheckedChange={(checked) => setShowSharedOnly(checked === true)}
              />
              <Label htmlFor="shared-only" className="text-sm font-normal cursor-pointer">
                Shared only
              </Label>
            </div>
          </div>
        </Card>

        {/* Documents List */}
        {loading ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Loading documents...</p>
          </Card>
        ) : documents.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "No documents found matching your search." : "No documents uploaded yet."}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <Card key={doc.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="text-2xl flex-shrink-0">{getFileIcon(doc.fileType)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{doc.filename}</h3>
                        {doc.isShared && (
                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                            Shared
                          </Badge>
                        )}
                        {doc.processingStatus === "completed" && (
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                            Ready
                          </Badge>
                        )}
                        {doc.processingStatus === "pending" && (
                          <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                            Processing
                          </Badge>
                        )}
                      </div>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground mb-2">{doc.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <span>•</span>
                        <span>{doc.fileType.toUpperCase()}</span>
                        <span>•</span>
                        <span>Uploaded {formatDate(doc.uploadDate)}</span>
                        {doc.linkedAgents.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <LinkIcon className="w-3 h-3" />
                              {doc.linkedAgents.length} agent{doc.linkedAgents.length !== 1 ? "s" : ""}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(doc.filePath, "_blank")}
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(doc.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
