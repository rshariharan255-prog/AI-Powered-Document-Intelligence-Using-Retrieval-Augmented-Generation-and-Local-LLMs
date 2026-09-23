import React from 'react';
import { Sparkles, Terminal, FileText, LayoutGrid, ShieldCheck, ChevronRight, MessageSquareCode } from 'lucide-react';

export default function Navbar({ currentView, onNavigate, health, activeDocCount }) {
  return (
    <nav className="hf-navbar">
      <div className="hf-nav-inner">
        {/* Brand */}
        <div className="hf-brand" onClick={() => onNavigate('landing')}>
          <div className="hf-brand-badge">
            <Sparkles size={18} className="text-amber" />
          </div>
          <div className="hf-brand-text">
            <div className="hf-brand-title">
              DocuMind <span className="hf-tag">RAG</span>
            </div>
            <div className="hf-brand-sub">Private Local Intelligence</div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="hf-nav-links">
          <button 
            className={`hf-nav-link ${currentView === 'landing' ? 'active' : ''}`}
            onClick={() => onNavigate('landing')}
          >
            <LayoutGrid size={15} />
            <span>Overview</span>
          </button>

          <button 
            className={`hf-nav-link ${currentView === 'workspace' ? 'active' : ''}`}
            onClick={() => onNavigate('workspace')}
          >
            <MessageSquareCode size={15} />
            <span>Workspace</span>
            {activeDocCount > 0 && (
              <span className="hf-count-pill">{activeDocCount} docs</span>
            )}
          </button>
        </div>

        {/* Right Status & Action */}
        <div className="hf-nav-actions">
          <div className="hf-status-pill">
            <span className={`hf-status-dot ${health?.backend ? 'online' : 'offline'}`}></span>
            <span className="hf-status-text">
              {health?.target_model ? health.target_model : 'Local Model'}
            </span>
          </div>

          {currentView === 'landing' ? (
            <button 
              className="hf-btn hf-btn-primary"
              onClick={() => onNavigate('workspace')}
            >
              <span>Get Started</span>
              <ChevronRight size={15} />
            </button>
          ) : (
            <button 
              className="hf-btn hf-btn-secondary"
              onClick={() => onNavigate('landing')}
            >
              <span>Back to Overview</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
