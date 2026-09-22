import React, { useState } from 'react';
import { Terminal, ChevronDown, ChevronUp, Layers, Check, Clock, Cpu } from 'lucide-react';

export default function DebugInspector({ debugData }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!debugData) return null;

  return (
    <div className="debug-container">
      <div className="debug-header" onClick={() => setIsOpen(!isOpen)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Terminal size={15} color="#38bdf8" />
          <span style={{ fontWeight: 600, fontSize: '0.8rem', color: '#38bdf8' }}>
            RAG Pipeline Inspector (Viva Demonstration Mode)
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span>Total: {debugData.timing_ms?.total || 0}ms</span>
          {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </div>

      {isOpen && (
        <div className="debug-body">
          {/* Step 1: Query Embedding */}
          <div className="debug-step">
            <div className="debug-step-title">
              <span className="step-num">1</span> Query Embedding Generation
            </div>
            <div className="debug-step-content">
              <div><strong>Model:</strong> sentence-transformers/all-MiniLM-L6-v2</div>
              <div><strong>Vector Dimension:</strong> {debugData.query_vector_dimension}-D dense float32 vector</div>
              <div><strong>Latency:</strong> {debugData.timing_ms?.embedding} ms</div>
            </div>
          </div>

          {/* Step 2: FAISS Similarity Search */}
          <div className="debug-step">
            <div className="debug-step-title">
              <span className="step-num">2</span> FAISS Semantic Similarity Search & Threshold Check
            </div>
            <div className="debug-step-content">
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                <span><strong>Top Score:</strong> {debugData.top_score}</span>
                <span><strong>Threshold:</strong> {debugData.threshold}</span>
                <span>
                  <strong>Result:</strong>{' '}
                  <span style={{ color: debugData.is_above_threshold ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                    {debugData.is_above_threshold ? 'PASS (Relevant Context Found)' : 'REJECT (Out-of-Document)'}
                  </span>
                </span>
              </div>

              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Ranked Chunks Retrieved from FAISS:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {debugData.retrieved_chunks?.map((c, i) => (
                  <div key={i} className="chunk-preview-row">
                    <span className="chunk-rank">#{i + 1}</span>
                    <span className="chunk-meta">Page {c.page}</span>
                    <span className="chunk-score">Cosine: {c.score}</span>
                    <span className="chunk-snippet">"{c.snippet}"</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Step 3: Gemma Generation */}
          {debugData.timing_ms?.llm_generation && (
            <div className="debug-step">
              <div className="debug-step-title">
                <span className="step-num">3</span> Local Generation via Ollama (Gemma 2B)
              </div>
              <div className="debug-step-content">
                <div><strong>Inference Time:</strong> {debugData.timing_ms.llm_generation} ms</div>
                <div><strong>Tokens Generated:</strong> {debugData.tokens_generated} tokens</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
