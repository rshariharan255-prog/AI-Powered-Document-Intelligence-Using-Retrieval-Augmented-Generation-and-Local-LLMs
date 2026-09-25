import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, Image, Sparkles } from 'lucide-react';
import { uploadPDF } from '../services/api';

const ALLOWED_EXTENSIONS = ['.pdf', '.pptx', '.ppt', '.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff'];

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
    const isValidExt = ALLOWED_EXTENSIONS.some(ext => nameLower.endsWith(ext));

    if (!isValidExt) {
      setUploadError('Please upload a PDF (.pdf), PowerPoint (.pptx), or Image (.png, .jpg, .jpeg, .webp) file.');
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
      setUploadError(err.response?.data?.detail || err.message || 'Failed to upload and process document');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h2 className="card-title" style={{ margin: 0 }}>
          <UploadCloud size={22} color="#6366f1" /> Upload Document or Image
        </h2>
        <span className="pro-badge">
          <Sparkles size={11} /> RapidOCR Enabled
        </span>
      </div>

      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
        Supports PDF, PPTX, and Image files (.png, .jpg, .jpeg, .webp). OCR automatically extracts visual text from scanned pages & diagrams.
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
          accept="application/pdf,.pdf,.pptx,.ppt,.png,.jpg,.jpeg,.webp,.bmp,.tiff"
          style={{ display: 'none' }}
        />

        <div className="dropzone-content">
          <div className="dropzone-icon">
            <UploadCloud size={32} color="#818cf8" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 600, fontSize: '0.92rem', color: '#fff', marginBottom: '0.2rem' }}>
              {file ? file.name : 'Drag & drop PDF, PPTX, or Images here'}
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Supports PDF, PowerPoint, PNG, JPG & WEBP up to 25MB
            </p>
          </div>
        </div>
      </div>

      {/* Selected file info & action button */}
      {file && (
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FileText size={18} color="#a5b4fc" />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f3f4f6' }}>{file.name}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </div>
            </div>
          </div>

          <button
            className="btn btn-rocket-submit"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            onClick={(e) => {
              e.stopPropagation();
              handleUpload();
            }}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 size={15} className="spin" /> OCR & Indexing ({uploadProgress}%)...
              </>
            ) : (
              <>
                <CheckCircle2 size={15} /> Run OCR & Index Document
              </>
            )}
          </button>
        </div>
      )}

      {/* Error Message */}
      {uploadError && (
        <div style={{ marginTop: '0.85rem', padding: '0.75rem 1rem', background: 'var(--danger-bg)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
          <AlertCircle size={18} />
          <div>
            <strong>Upload Error:</strong> {uploadError}
          </div>
        </div>
      )}
    </div>
  );
}
