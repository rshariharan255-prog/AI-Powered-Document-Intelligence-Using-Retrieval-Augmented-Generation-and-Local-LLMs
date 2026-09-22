import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { uploadPDF } from '../services/api';

export default function FileUpload({ onUploadSuccess }) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const validateAndSetFile = (selectedFile) => {
    setUploadError(null);
    if (!selectedFile) return;

    const nameLower = selectedFile.name.toLowerCase();
    const isValidExt = nameLower.endsWith('.pdf') || nameLower.endsWith('.pptx') || nameLower.endsWith('.ppt');

    if (!isValidExt) {
      setUploadError('Please upload a PDF (.pdf) or PowerPoint (.pptx) file.');
      setFile(null);
      return;
    }

    if (selectedFile.size > 25 * 1024 * 1024) {
      setUploadError('File size exceeds the 25MB limit.');
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      const result = await uploadPDF(file, (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
        setUploadProgress(percent);
      });
      if (onUploadSuccess) {
        onUploadSuccess(result);
      }
    } catch (err) {
      console.error(err);
      setUploadError(err.response?.data?.detail || err.message || 'Failed to upload and process PDF');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="card">
      <h2 className="card-title">
        <UploadCloud size={22} color="#6366f1" /> Upload PDF Document
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
        Upload a text-based PDF document. Text will be extracted page-by-page preserving accurate page numbers.
      </p>

      {/* Drag & Drop Zone */}
      <div
        className={`dropzone ${isDragging ? 'drag-active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx,.ppt"
          style={{ display: 'none' }}
        />

        <div className="dropzone-content">
          <div className="dropzone-icon">
            <UploadCloud size={36} color="#818cf8" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 600, fontSize: '1rem', color: '#fff', marginBottom: '0.25rem' }}>
              {file ? file.name : 'Drag & drop your PDF or PowerPoint (.pptx) here, or click to browse'}
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Supports PDF documents and PPTX presentations up to 25MB
            </p>
          </div>
        </div>
      </div>

      {/* Selected file info & action button */}
      {file && (
        <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)', padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileText size={20} color="#a5b4fc" />
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f3f4f6' }}>{file.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </div>
            </div>
          </div>

          <button
            className="btn"
            onClick={(e) => {
              e.stopPropagation();
              handleUpload();
            }}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 size={16} className="spin" /> Processing ({uploadProgress}%)...
              </>
            ) : (
              <>
                <CheckCircle2 size={16} /> Extract Text & Metadata
              </>
            )}
          </button>
        </div>
      )}

      {/* Error Message */}
      {uploadError && (
        <div style={{ marginTop: '1rem', padding: '0.85rem 1.25rem', background: 'var(--danger-bg)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={20} />
          <div>
            <strong>Upload Error:</strong> {uploadError}
          </div>
        </div>
      )}
    </div>
  );
}
