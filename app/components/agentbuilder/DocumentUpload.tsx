"use client"

import { useState, useRef } from "react"
import { Upload, File, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/app/components/ui/button"
import { Label } from "@/app/components/ui/label"
import { Input } from "@/app/components/ui/input"
import { Textarea } from "@/app/components/ui/textarea"
import { Card } from "@/app/components/ui/card"

interface DocumentUploadProps {
  agentId?: string | null
  isShared?: boolean
  onUploadComplete?: (document: any) => void
  compact?: boolean
}

export function DocumentUpload({ agentId, isShared = false, onUploadComplete, compact = false }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [description, setDescription] = useState("")
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const ALLOWED_TYPES = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]
  const MAX_SIZE = 10 * 1024 * 1024 // 10MB

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (selectedFile: File) => {
    setError(null)
    setSuccess(false)

    // Validate type
    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setError("File type not supported. Please upload PDF, Word, Excel, CSV, or TXT files.")
      return
    }

    // Validate size
    if (selectedFile.size > MAX_SIZE) {
      setError(`File size exceeds 10MB limit. File size: ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB`)
      return
    }

    setFile(selectedFile)
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      if (agentId) formData.append("agentId", agentId)
      formData.append("isShared", isShared.toString())
      if (description) formData.append("description", description)

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Upload failed")
      }

      setSuccess(true)
      setFile(null)
      setDescription("")
      
      if (onUploadComplete) {
        onUploadComplete(data.document)
      }

      // Reset success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload file")
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveFile = () => {
    setFile(null)
    setError(null)
    setSuccess(false)
  }

  const getFileIcon = (type: string) => {
    if (type.includes("pdf")) return "📄"
    if (type.includes("word") || type.includes("document")) return "📝"
    if (type.includes("sheet") || type.includes("excel")) return "📊"
    if (type.includes("csv")) return "📋"
    return "📎"
  }

  if (compact) {
    return (
      <div className="space-y-3">
        <div
          className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
            dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />
          
          {!file ? (
            <div className="text-center">
              <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop file here, or{" "}
                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-primary hover:underline">
                  browse
                </button>
              </p>
              <p className="text-xs text-muted-foreground">PDF, Word, Excel, CSV, TXT (max 10MB)</p>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{getFileIcon(file.type)}</span>
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={handleRemoveFile}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {file && (
          <Button onClick={handleUpload} disabled={uploading} className="w-full" size="sm">
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </>
            )}
          </Button>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>Document uploaded successfully!</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Upload Document</h3>
        <p className="text-sm text-muted-foreground">
          Upload procedures, SOWs, contracts, or other reference documents
        </p>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-8 transition-colors ${
          dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        />

        {!file ? (
          <div className="text-center">
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              Drag and drop your file here, or{" "}
              <button type="button" onClick={() => fileInputRef.current?.click()} className="text-primary hover:underline font-medium">
                browse
              </button>
            </p>
            <p className="text-xs text-muted-foreground">Supported formats: PDF, Word, Excel, CSV, TXT (max 10MB)</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getFileIcon(file.type)}</span>
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={handleRemoveFile}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div>
              <Label htmlFor="document-description" className="text-sm">
                Description (optional)
              </Label>
              <Textarea
                id="document-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a brief description of this document..."
                rows={3}
                className="mt-1.5"
              />
            </div>

            <Button onClick={handleUpload} disabled={uploading} className="w-full">
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">Document uploaded successfully!</span>
        </div>
      )}
    </Card>
  )
}
