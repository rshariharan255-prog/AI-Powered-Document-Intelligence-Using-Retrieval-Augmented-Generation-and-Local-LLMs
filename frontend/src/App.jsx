import React, { useState, useEffect } from 'react';
import { checkHealth, getDocuments } from './services/api';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import FileUpload from './components/FileUpload';
import DocumentCard from './components/DocumentCard';
import ChatWindow from './components/ChatWindow';
import { Sparkles, RefreshCw, AlertCircle, Layers, FileText, ArrowLeft, Bot, UploadCloud } from 'lucide-react';

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
        <main className="app-container workspace-main">
          {/* Workspace Compact Subheader */}
          <div className="hf-workspace-header" style={{ marginBottom: '1rem', paddingBottom: '0.75rem' }}>
            <div className="hf-workspace-title-group">
              <button 
                className="hf-back-btn"
                onClick={() => setCurrentView('landing')}
              >
                <ArrowLeft size={15} />
                <span>Overview</span>
              </button>
              <h1 className="hf-workspace-title" style={{ fontSize: '1.3rem' }}>
                Document Intelligence Dashboard
              </h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div className="phase-badge" style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}>
                <span className={`dot ${health?.backend && health?.ollama ? 'online' : 'offline'}`}></span>
                {health?.target_model ? `${health.target_model} Ready` : 'Local AI Ready'}
              </div>

              <button 
                className="btn-icon" 
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                onClick={fetchHealthAndDocs}
                disabled={loadingHealth}
                title="Refresh System Status"
              >
                <RefreshCw size={13} className={loadingHealth ? 'spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {healthError && (
            <div style={{ marginBottom: '1rem', padding: '0.65rem 1rem', background: 'var(--danger-bg)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
              <AlertCircle size={16} />
              <span>{healthError}</span>
            </div>
          )}

          {/* 2-Column Dashboard Layout: Left = Upload & Docs, Right = AI Chatbot */}
          <div className="workspace-dashboard-grid">
            
            {/* LEFT COLUMN: Upload PPT/PDF & Loaded Document Details */}
            <div className="workspace-left-panel">
              {/* PPT/PDF File Upload Card */}
              <FileUpload onUploadSuccess={handleUploadSuccess} />

              {/* Previously Indexed Documents Pills */}
              {indexedDocs.length > 0 && (
                <div className="card" style={{ padding: '0.85rem 1rem', marginBottom: '1rem', background: '#161b22', borderColor: '#30363d' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#c9d1d9', marginBottom: '0.6rem' }}>
                    <FileText size={15} color="#e3b341" />
                    <strong>Select Indexed Document ({indexedDocs.length}):</strong>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {indexedDocs.map((doc) => (
                      <button
                        key={doc.document_id}
                        onClick={() => handleSelectDocument(doc.document_id)}
                        style={{
                          padding: '0.3rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          background: uploadedDoc?.document_id === doc.document_id ? '#238636' : '#21262d',
                          color: uploadedDoc?.document_id === doc.document_id ? '#ffffff' : '#8b949e',
                          border: uploadedDoc?.document_id === doc.document_id ? '1px solid #2ea043' : '1px solid #30363d',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.filename}
                        </span>
                        <span style={{ fontSize: '0.7rem', opacity: 0.75 }}>({doc.total_chunks}c)</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Document Metadata & Extracted Text Card */}
              {uploadedDoc && <DocumentCard docData={uploadedDoc} />}
            </div>

            {/* RIGHT COLUMN: AI Chatbot Window */}
            <div className="workspace-right-panel">
              <ChatWindow activeDocument={uploadedDoc} />
            </div>

          </div>
        </main>
      )}
    </div>
  );
}
