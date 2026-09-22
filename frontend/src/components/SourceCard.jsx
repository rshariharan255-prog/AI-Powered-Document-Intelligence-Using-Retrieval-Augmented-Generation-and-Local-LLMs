import React, { useState } from 'react';
import { FileText, Bookmark, ChevronDown, ChevronUp, Percent } from 'lucide-react';

export default function SourceCard({ source }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="source-card">
      <div className="source-card-header" onClick={() => setOpen(!open)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={15} color="#818cf8" />
          <span style={{ fontWeight: 600, color: '#f3f4f6', fontSize: '0.85rem' }}>
            {source.document}
          </span>
          <span className="page-pill">
            <Bookmark size={11} /> Page {source.page}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="score-pill">
            Similarity: {(source.score * 100).toFixed(1)}%
          </span>
          {open ? <ChevronUp size={16} color="#9ca3af" /> : <ChevronDown size={16} color="#9ca3af" />}
        </div>
      </div>

      {open && (
        <div className="source-card-body">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            Retrieved Text Excerpt (Page {source.page}):
          </div>
          <div className="source-snippet">
            "{source.excerpt}"
          </div>
        </div>
      )}
    </div>
  );
}
