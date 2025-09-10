'use client';

import React, { useState } from 'react';
import { FileText, Download, Eye, Upload, File, Image, FileSpreadsheet, X, Paperclip } from 'lucide-react';

interface Attachment {
  id: string;
  filename: string;
  media_type: string;
  storage_url: string;
  created_at: string;
  source?: string;
  sha256?: string;
}

interface AttachmentsTabProps {
  invoiceId: string;
  attachments: Attachment[];
}

export function AttachmentsTab({ invoiceId, attachments }: AttachmentsTabProps) {
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const getFileIcon = (mediaType: string | undefined) => {
    if (!mediaType) {
      return <File className="h-6 w-6 text-gray-500" />;
    }
    if (mediaType.startsWith('image/')) {
      return <Image className="h-6 w-6 text-blue-500" />;
    }
    if (mediaType === 'application/pdf') {
      return <FileText className="h-6 w-6 text-red-500" />;
    }
    if (mediaType.includes('spreadsheet') || mediaType.includes('excel')) {
      return <FileSpreadsheet className="h-6 w-6 text-green-500" />;
    }
    return <File className="h-6 w-6 text-gray-500" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', 'INV');
    formData.append('doc_id', invoiceId);

    try {
      const response = await fetch('/api/attachments/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        // Refresh attachments list
        window.location.reload();
      } else {
        console.error('Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleView = (attachment: Attachment) => {
    if (attachment.media_type && (attachment.media_type.startsWith('image/') || attachment.media_type === 'application/pdf')) {
      setSelectedAttachment(attachment);
    } else {
      // For non-viewable files, download instead
      handleDownload(attachment);
    }
  };

  const handleDownload = (attachment: Attachment) => {
    window.open(`/api/invoices/download/${invoiceId}?attachment=${attachment.id}`, '_blank');
  };

  if (attachments.length === 0) {
    return (
      <div className="h-full flex flex-col bg-white">
        {/* Header */}
        <div className="flex items-center px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-purple-600" />
            <h3 className="text-xs font-semibold text-gray-950 uppercase tracking-wider">ATTACHMENTS</h3>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center flex-1">
        <FileText className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-950 mb-2">No Attachments</h3>
        <p className="text-sm text-gray-500 text-center max-w-md mb-6">
          No files have been attached to this invoice yet.
        </p>
        <label className="relative cursor-pointer">
          <input
            type="file"
            className="sr-only"
            onChange={handleFileUpload}
            disabled={isUploading}
            accept=".pdf,.png,.jpg,.jpeg,.gif,.xlsx,.xls,.csv"
          />
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors">
            <Upload className="h-4 w-4" />
            <span>{isUploading ? 'Uploading...' : 'Upload Attachment'}</span>
          </div>
        </label>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-purple-600" />
          <h3 className="text-xs font-semibold text-gray-950 uppercase tracking-wider">ATTACHMENTS</h3>
        </div>
        <label className="relative cursor-pointer">
          <input
            type="file"
            className="sr-only"
            onChange={handleFileUpload}
            disabled={isUploading}
            accept=".pdf,.png,.jpg,.jpeg,.gif,.xlsx,.xls,.csv"
          />
          <div className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            <Upload className="h-4 w-4" />
            <span>{isUploading ? 'Uploading...' : 'Add File'}</span>
          </div>
        </label>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

      {/* Attachments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {attachments.map((attachment, index) => (
          <div
            key={attachment.id || `attachment-${index}-${attachment.filename}`}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow min-w-0"
          >
            <div className="flex items-start justify-between mb-3">
              {getFileIcon(attachment.media_type)}
              <span className="text-xs text-gray-500">
                {attachment.source || 'Manual Upload'}
              </span>
            </div>
            
            <h4 className="text-sm font-medium text-gray-950 mb-1 truncate" title={attachment.filename}>
              {attachment.filename}
            </h4>
            
            <p className="text-xs text-gray-500 mb-3">
              {formatDate(attachment.created_at)}
            </p>

            <div className="flex items-center gap-2 flex-nowrap">
              <button
                onClick={() => handleView(attachment)}
                className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-xs bg-purple-50 text-purple-600 rounded hover:bg-purple-100 transition-colors whitespace-nowrap min-w-0"
              >
                <Eye className="h-3.5 w-3.5 flex-shrink-0" />
                <span>View</span>
              </button>
              <button
                onClick={() => handleDownload(attachment)}
                className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-xs bg-gray-50 text-gray-950 rounded hover:bg-gray-100 transition-colors whitespace-nowrap min-w-0"
              >
                <Download className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Download</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      {selectedAttachment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-950">
                {selectedAttachment.filename}
              </h3>
              <button
                onClick={() => setSelectedAttachment(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {selectedAttachment.media_type && selectedAttachment.media_type.startsWith('image/') ? (
                <img
                  src={`/api/invoices/${invoiceId}/preview`}
                  alt={selectedAttachment.filename}
                  className="max-w-full h-auto mx-auto"
                />
              ) : selectedAttachment.media_type === 'application/pdf' ? (
                <iframe
                  src={`/api/invoices/download/${invoiceId}?attachment=${selectedAttachment.id}`}
                  className="w-full h-[600px]"
                  title={selectedAttachment.filename}
                />
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Preview not available for this file type</p>
                  <button
                    onClick={() => handleDownload(selectedAttachment)}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download File
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}