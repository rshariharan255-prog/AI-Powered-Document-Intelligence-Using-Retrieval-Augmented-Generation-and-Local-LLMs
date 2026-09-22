import React, { useState } from 'react';
import { FileText, Layers, Hash, BookOpen, ChevronRight, ChevronDown } from 'lucide-react';

export default function DocumentCard({ docData }) {
  const [selectedPage, setSelectedPage] = useState(1);
  const [expanded, setExpanded] = useState(true);

  if (!docData) return null;

  const totalPages = typeof docData.pages === 'number' 
    ? docData.pages 
    : (docData.total_pages || (Array.isArray(docData.pages) ? docData.pages.length : 1));

  const totalChunks = docData.chunks || docData.total_chunks || 0;
  const totalChars = docData.total_characters;
  const pagesList = Array.isArray(docData.pages) ? docData.pages : (Array.isArray(docData.extracted_pages) ? docData.extracted_pages : []);
  const currentPageData = pagesList.length > 0 
    ? (pagesList.find((p) => p.page_number === selectedPage) || pagesList[0])
    : null;

  return (
    <div className="card">
      <div 
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', flexWrap: 'wrap', gap: '0.75rem' }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={20} color="#818cf8" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', margin: 0 }}>
              {docData.filename || 'Uploaded Document'}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Document ID: <code style={{ color: '#c7d2fe' }}>{docData.document_id}</code>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className="badge-meta">
              <Layers size={14} /> {totalPages} {totalPages === 1 ? 'Page / Slide' : 'Pages / Slides'}
            </span>
            {totalChunks > 0 && (
              <span className="badge-meta">
                <Hash size={14} /> {totalChunks} Chunks Indexed
              </span>
            )}
            {totalChars !== undefined && (
              <span className="badge-meta">
                <Hash size={14} /> {Number(totalChars).toLocaleString()} Characters
              </span>
            )}
          </div>
          {expanded ? <ChevronDown size={18} color="#9ca3af" /> : <ChevronRight size={18} color="#9ca3af" />}
        </div>
      </div>

      {expanded && pagesList.length > 0 && (
        <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Extracted Pages & Text Content
            </span>

            {/* Page Selector Tabs */}
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {pagesList.map((p) => (
                <button
                  key={p.page_number}
                  className={`page-tab ${selectedPage === p.page_number ? 'active' : ''}`}
                  onClick={() => setSelectedPage(p.page_number)}
                >
                  Page {p.page_number}
                </button>
              ))}
            </div>
          </div>

          {/* Current Page Text View */}
          {currentPageData && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                <span>Viewing text extracted from <strong>Page {currentPageData.page_number}</strong></span>
                <span>{currentPageData.char_count || currentPageData.text?.length || 0} characters</span>
              </div>
              <div className="code-box" style={{ maxHeight: '200px', background: '#0a0e17', color: '#e2e8f0' }}>
                {currentPageData.text}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
