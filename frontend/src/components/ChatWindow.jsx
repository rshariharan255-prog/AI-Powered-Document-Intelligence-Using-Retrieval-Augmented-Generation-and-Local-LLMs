import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Bot, User, Sparkles, BookOpen, Trash2, AlertCircle, Loader2, 
  Rocket, Copy, Check, ThumbsUp, ThumbsDown, Volume2, VolumeX, RefreshCw, Zap, Users, Target
} from 'lucide-react';
import { askQuestion } from '../services/api';
import SourceCard from './SourceCard';
import DebugInspector from './DebugInspector';
import FormattedMessage from './FormattedMessage';

const STORAGE_CHAT_KEY = 'rag_chat_messages_history';

// Interactive Quick Prompts with Rocket Icons
const QUICK_PROMPTS = [
  { label: 'Project Overview', icon: <Rocket size={14} color="#38bdf8" />, query: 'What is this project and presentation about?' },
  { label: 'Team & Supervisors', icon: <Users size={14} color="#818cf8" />, query: 'Who are the team members, authors, and supervisor or guide?' },
  { label: 'Key Objectives', icon: <Target size={14} color="#f43f5e" />, query: 'What are the main objectives and problem statement?' },
  { label: 'Progress & Status', icon: <Zap size={14} color="#eab308" />, query: 'What progress and work has been completed till now?' },
];

export default function ChatWindow({ activeDocument }) {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CHAT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: activeDocument
          ? `Hello! I have indexed "${activeDocument.filename || 'your document'}" (${activeDocument.pages || activeDocument.total_pages || 1} pages, ${activeDocument.chunks || activeDocument.total_chunks || 1} chunks). Ask any question using the quick rocket prompts below or type your inquiry!`
          : 'Please upload a PDF or PPTX document above to start asking questions.',
        sources: [],
        is_grounded: true
      }
    ];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [speakingId, setSpeakingId] = useState(null);
  const [feedback, setFeedback] = useState({});
  const messagesContainerRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn("Failed to persist messages to localStorage:", e);
    }
  }, [messages]);

  // Update welcome message when document changes
  useEffect(() => {
    if (activeDocument && messages.length <= 1 && (messages[0]?.id === 'welcome' || messages[0]?.id.startsWith('welcome-'))) {
      setMessages([
        {
          id: 'welcome-' + activeDocument.document_id,
          role: 'assistant',
          content: `Document "${activeDocument.filename}" is loaded and ready! Ask questions using the rocket prompt chips or type below.`,
          sources: [],
          is_grounded: true
        }
      ]);
    }
  }, [activeDocument]);

  const executeQuery = async (queryText) => {
    if (!queryText.trim() || loading) return;

    const userQuestion = queryText.trim();
    setInput('');
    setError(null);

    const userMsg = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: userQuestion
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      const historyPayload = newMessages
        .filter(m => m.id !== 'welcome' && !m.id.startsWith('welcome-'))
        .map(m => ({ role: m.role, content: m.content }));

      const data = await askQuestion(
        activeDocument?.document_id,
        userQuestion,
        historyPayload,
        true
      );

      const aiMsg = {
        id: 'ai-' + Date.now(),
        role: 'assistant',
        content: data.answer,
        sources: data.sources || [],
        is_grounded: data.is_grounded,
        debug: data.debug
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || err.message || 'Failed to get answer from local AI');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e) => {
    e?.preventDefault();
    executeQuery(input);
  };

  const handleClearChat = () => {
    // Stop speaking if active
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeakingId(null);

    const defaultMsg = [
      {
        id: 'welcome-reset',
        role: 'assistant',
        content: activeDocument
          ? `Chat cleared. Ask anything from "${activeDocument.filename}".`
          : 'Please upload a PDF or PPTX document above to start asking questions.',
        sources: [],
        is_grounded: true
      }
    ];
    setMessages(defaultMsg);
    localStorage.removeItem(STORAGE_CHAT_KEY);
  };

  // Copy Message Content to Clipboard
  const handleCopy = (msgId, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Speech Synthesis Read Aloud
  const handleSpeech = (msgId, text) => {
    if (!('speechSynthesis' in window)) return;

    if (speakingId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Feedback Toggle
  const handleFeedback = (msgId, type) => {
    setFeedback(prev => ({
      ...prev,
      [msgId]: prev[msgId] === type ? null : type
    }));
  };

  return (
    <div className="card chat-card">
      {/* Top Header */}
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="chatgpt-logo-badge">
            <Rocket size={20} className="text-rocket-header" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff', margin: 0 }}>
                ChatGPT-Style Local AI Assistant
              </h2>
              <span className="pro-badge">
                <Sparkles size={11} /> Clean Output
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              Powered by SentenceTransformers, FAISS & Gemma 2B (Local)
            </p>
          </div>
        </div>

        <button 
          className="btn-icon" 
          onClick={handleClearChat} 
          title="Clear Conversation History"
        >
          <Trash2 size={16} /> Clear Chat
        </button>
      </div>

      {/* Messages Stream */}
      <div className="messages-container" ref={messagesContainerRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`message-wrapper ${msg.role}`}>
            <div className={`avatar ${msg.role}`}>
              {msg.role === 'assistant' ? <Rocket size={18} color="#fff" /> : <User size={18} />}
            </div>

            <div className="message-bubble-container">
              <div className={`message-bubble ${msg.role} ${!msg.is_grounded && msg.role === 'assistant' ? 'unsupported' : ''}`}>
                
                {/* Formatted Clean Response without Star (*) Symbols */}
                {msg.role === 'assistant' ? (
                  <FormattedMessage content={msg.content} />
                ) : (
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{msg.content}</div>
                )}

                {/* Assistant Interactive Toolbar */}
                {msg.role === 'assistant' && msg.id !== 'welcome' && !msg.id.startsWith('welcome-') && (
                  <div className="message-toolbar">
                    <span className="model-tag">
                      <Rocket size={12} color="#38bdf8" /> Gemma 2B
                    </span>

                    <button 
                      className={`toolbar-btn ${copiedId === msg.id ? 'active' : ''}`} 
                      onClick={() => handleCopy(msg.id, msg.content)}
                      title="Copy Answer"
                    >
                      {copiedId === msg.id ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                      {copiedId === msg.id ? <span style={{ color: '#34d399' }}>Copied!</span> : <span>Copy</span>}
                    </button>

                    <button 
                      className={`toolbar-btn ${speakingId === msg.id ? 'active' : ''}`}
                      onClick={() => handleSpeech(msg.id, msg.content)}
                      title="Read Aloud"
                    >
                      {speakingId === msg.id ? <VolumeX size={14} color="#f43f5e" /> : <Volume2 size={14} />}
                      <span>{speakingId === msg.id ? 'Stop' : 'Listen'}</span>
                    </button>

                    <button 
                      className={`toolbar-btn ${feedback[msg.id] === 'up' ? 'active-up' : ''}`}
                      onClick={() => handleFeedback(msg.id, 'up')}
                      title="Good Response"
                    >
                      <ThumbsUp size={14} />
                    </button>

                    <button 
                      className={`toolbar-btn ${feedback[msg.id] === 'down' ? 'active-down' : ''}`}
                      onClick={() => handleFeedback(msg.id, 'down')}
                      title="Needs Improvement"
                    >
                      <ThumbsDown size={14} />
                    </button>
                  </div>
                )}

                {/* Sources Section */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="sources-wrapper">
                    <div className="sources-title">
                      <BookOpen size={14} color="#818cf8" />
                      <span>Verified Sources ({msg.sources.length} citations)</span>
                    </div>
                    <div className="sources-list">
                      {msg.sources.map((src, i) => (
                        <SourceCard key={i} source={src} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* RAG Pipeline Inspection / Debug Block */}
              {msg.debug && <DebugInspector debugData={msg.debug} />}
            </div>
          </div>
        ))}

        {loading && (
          <div className="message-wrapper assistant">
            <div className="avatar assistant">
              <Rocket size={18} />
            </div>
            <div className="message-bubble assistant loading-bubble">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#c7d2fe', fontSize: '0.9rem' }}>
                <Loader2 size={18} className="spin" />
                <span>Searching FAISS vector index & generating clean answer...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error notification */}
      {error && (
        <div style={{ margin: '0 1.25rem 0.75rem', padding: '0.75rem 1rem', background: 'var(--danger-bg)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Quick Prompts Bar with Rocket Icons */}
      {activeDocument && (
        <div className="quick-prompts-container">
          <span className="quick-prompt-label">
            <Sparkles size={13} color="#e3b341" /> Quick Rocket Prompts:
          </span>
          <div className="quick-prompts-scroll">
            {QUICK_PROMPTS.map((qp, idx) => (
              <button
                key={idx}
                type="button"
                className="quick-prompt-chip"
                onClick={() => executeQuery(qp.query)}
                disabled={loading}
              >
                {qp.icon}
                <span>{qp.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Question Input Bar */}
      <form onSubmit={handleSend} className="chat-input-bar">
        <input
          type="text"
          className="chat-input"
          placeholder={activeDocument ? `Ask a question about ${activeDocument.filename}...` : "Upload or select a document above..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading || !activeDocument}
        />
        <button
          type="submit"
          className="btn btn-rocket-submit"
          disabled={loading || !input.trim() || !activeDocument}
        >
          <Rocket size={16} /> Ask AI
        </button>
      </form>
    </div>
  );
}
