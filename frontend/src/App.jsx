import React, { useState, useEffect } from 'react';
import { checkHealth, getDocuments } from './services/api';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import FileUpload from './components/FileUpload';
import DocumentCard from './components/DocumentCard';
import ChatWindow from './components/ChatWindow';
import { Sparkles, Server, RefreshCw, AlertCircle, Layers, CheckCircle2, MessageSquare, FileText, ChevronRight, ArrowLeft } from 'lucide-react';

const STORAGE_ACTIVE_DOC_KEY = 'rag_active_document';

export default function App() {
  const [currentView, setCurrentView] = useState('landing');
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
    <div className="hf-app-root">
      {/* Top Navbar */}
      <Navbar 
        currentView={currentView}
        onNavigate={setCurrentView}
        health={health}
        activeDocCount={indexedDocs.length}
      />

      {currentView === 'landing' ? (
        <LandingPage 
          onGetStarted={() => setCurrentView('workspace')}
          health={health}
        />
      ) : (
        <main className="app-container">
          {/* Workspace Subheader */}
          <div className="hf-workspace-header">
            <div className="hf-workspace-title-group">
              <button 
                className="hf-back-btn"
                onClick={() => setCurrentView('landing')}
              >
                <ArrowLeft size={16} />
                <span>Overview</span>
              </button>
              <h1 className="hf-workspace-title">Document Intelligence Workspace</h1>
              <p className="hf-workspace-sub">Upload, parse, index and query your private documents locally</p>
            </div>

            <div className="phase-badge">
              <span className={`dot ${health?.backend && health?.ollama ? 'online' : 'offline'}`}></span>
              {health?.target_model ? `${health.target_model} Ready` : 'Full RAG System Ready'}
            </div>
          </div>

          {/* Health & Status Bar */}
          <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
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
                  <strong>Model:</strong> {health?.target_model || 'llama3.2:1b'}
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
            <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', background: '#161b22', borderColor: '#30363d' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#c9d1d9' }}>
                  <FileText size={16} color="#e3b341" />
                  <strong>Indexed Documents ({indexedDocs.length}):</strong>
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
                        background: uploadedDoc?.document_id === doc.document_id ? '#238636' : '#21262d',
                        color: uploadedDoc?.document_id === doc.document_id ? '#ffffff' : '#8b949e',
                        border: uploadedDoc?.document_id === doc.document_id ? '1px solid #2ea043' : '1px solid #30363d',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        transition: 'all 0.15s ease'
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
        </main>
      )}
    </div>
  );
}

