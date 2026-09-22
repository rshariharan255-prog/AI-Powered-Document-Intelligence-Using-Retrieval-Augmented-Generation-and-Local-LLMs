import React, { useState, useEffect } from 'react';
import { checkHealth, getDocuments } from './services/api';
import FileUpload from './components/FileUpload';
import DocumentCard from './components/DocumentCard';
import ChatWindow from './components/ChatWindow';
import { Sparkles, Server, RefreshCw, AlertCircle, Layers, CheckCircle2, MessageSquare, FileText, ChevronDown } from 'lucide-react';

const STORAGE_ACTIVE_DOC_KEY = 'rag_active_document';

export default function App() {
  const [health, setHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [healthError, setHealthError] = useState(null);

  const [uploadedDoc, setUploadedDoc] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ACTIVE_DOC_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [indexedDocs, setIndexedDocs] = useState([]);

  const fetchHealthAndDocs = async () => {
    setLoadingHealth(true);
    setHealthError(null);
    try {
      const healthData = await checkHealth();
      setHealth(healthData);

      const docsData = await getDocuments();
      setIndexedDocs(docsData || []);

      // If no document is currently selected, select the latest one
      if (docsData && docsData.length > 0 && !uploadedDoc) {
        const latestDoc = docsData[docsData.length - 1];
        setUploadedDoc(latestDoc);
        localStorage.setItem(STORAGE_ACTIVE_DOC_KEY, JSON.stringify(latestDoc));
      }
    } catch (err) {
      console.error(err);
      setHealthError(err.message || 'Failed to connect to backend');
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    fetchHealthAndDocs();
  }, []);

  const handleUploadSuccess = (data) => {
    setUploadedDoc(data);
    localStorage.setItem(STORAGE_ACTIVE_DOC_KEY, JSON.stringify(data));
    fetchHealthAndDocs();
  };

  const handleSelectDocument = (docId) => {
    const found = indexedDocs.find((d) => d.document_id === docId);
    if (found) {
      setUploadedDoc(found);
      localStorage.setItem(STORAGE_ACTIVE_DOC_KEY, JSON.stringify(found));
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header>
        <div className="brand">
          <div className="brand-icon">
            <Sparkles size={24} color="#fff" />
          </div>
          <div>
            <h1 className="brand-title">Local RAG Document Assistant</h1>
            <p className="brand-subtitle">Private Document Q&A with Semantic Search & Gemma 2B</p>
          </div>
        </div>

        <div className="phase-badge">
          <span className="dot online"></span>
          Full RAG System Ready
        </div>
      </header>

      {/* Health & Status Bar */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <span className={`dot ${health?.backend ? 'online' : 'offline'}`}></span>
              <strong>Backend:</strong> {health?.backend ? 'Port 8000 (Active)' : 'Offline'}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <span className={`dot ${health?.ollama ? 'online' : 'offline'}`}></span>
              <strong>Ollama:</strong> {health?.ollama ? 'Port 11434 (Connected)' : 'Offline'}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <span className={`dot ${health?.model_available ? 'online' : 'offline'}`}></span>
              <strong>Model:</strong> {health?.target_model || 'gemma:2b'}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <Layers size={14} color="#818cf8" />
              <strong>Vector DB:</strong> FAISS FlatIP (384-D)
            </div>
          </div>

          <button 
            className="btn" 
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
            onClick={fetchHealthAndDocs}
            disabled={loadingHealth}
          >
            <RefreshCw size={12} className={loadingHealth ? 'spin' : ''} />
            {loadingHealth ? 'Refreshing...' : 'Refresh Status'}
          </button>
        </div>

        {healthError && (
          <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: 'var(--danger-bg)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <AlertCircle size={16} />
            <span>{healthError}</span>
          </div>
        )}
      </div>

      {/* Previously Indexed Documents Selector */}
      {indexedDocs.length > 0 && (
        <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '1.25rem', background: 'rgba(31, 41, 55, 0.5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#c7d2fe' }}>
              <FileText size={16} color="#818cf8" />
              <strong>Previously Indexed Documents ({indexedDocs.length}):</strong>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {indexedDocs.map((doc) => (
                <button
                  key={doc.document_id}
                  onClick={() => handleSelectDocument(doc.document_id)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    background: uploadedDoc?.document_id === doc.document_id ? '#4f46e5' : '#111827',
                    color: uploadedDoc?.document_id === doc.document_id ? '#fff' : '#9ca3af',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <span>{doc.filename}</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.75 }}>({doc.total_chunks} chunks)</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Upload & Document on Top/Left, Chat on Bottom/Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        {/* Upload & Document View */}
        <div>
          <FileUpload onUploadSuccess={handleUploadSuccess} />
          {uploadedDoc && <DocumentCard docData={uploadedDoc} />}
        </div>

        {/* Chat Window */}
        <div>
          <ChatWindow activeDocument={uploadedDoc} />
        </div>
      </div>
    </div>
  );
}
