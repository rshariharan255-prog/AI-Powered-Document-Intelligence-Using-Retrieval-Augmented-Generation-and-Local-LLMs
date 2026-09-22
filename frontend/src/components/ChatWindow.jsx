import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, BookOpen, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { askQuestion } from '../services/api';
import SourceCard from './SourceCard';
import DebugInspector from './DebugInspector';

const STORAGE_CHAT_KEY = 'rag_chat_messages_history';

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
          ? `Hello! I have indexed "${activeDocument.filename || 'your document'}" (${activeDocument.pages || activeDocument.total_pages || 1} pages, ${activeDocument.chunks || activeDocument.total_chunks || 1} chunks). What would you like to know about this document?`
          : 'Please upload a PDF or PPTX document above to start asking questions.',
        sources: [],
        is_grounded: true
      }
    ];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
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

  // When activeDocument changes and chat is empty or default welcome, update prompt
  useEffect(() => {
    if (activeDocument && messages.length <= 1 && messages[0]?.id === 'welcome') {
      setMessages([
        {
          id: 'welcome-' + activeDocument.document_id,
          role: 'assistant',
          content: `Document "${activeDocument.filename}" is loaded and ready! Ask any question based on the document.`,
          sources: [],
          is_grounded: true
        }
      ]);
    }
  }, [activeDocument]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userQuestion = input.trim();
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
      // Build conversation history for follow-ups
      const historyPayload = newMessages
        .filter(m => m.id !== 'welcome' && !m.id.startsWith('welcome-'))
        .map(m => ({ role: m.role, content: m.content }));

      const data = await askQuestion(
        activeDocument?.document_id,
        userQuestion,
        historyPayload,
        true // debugMode enabled
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

  const handleClearChat = () => {
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

  return (
    <div className="card chat-card">
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Bot size={22} color="#6366f1" />
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff', margin: 0 }}>
              Grounded Document Chat
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
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
              {msg.role === 'assistant' ? <Bot size={18} /> : <User size={18} />}
            </div>

            <div className="message-bubble-container">
              <div className={`message-bubble ${msg.role} ${!msg.is_grounded && msg.role === 'assistant' ? 'unsupported' : ''}`}>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {msg.content}
                </div>

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
              <Bot size={18} />
            </div>
            <div className="message-bubble assistant loading-bubble">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#c7d2fe', fontSize: '0.9rem' }}>
                <Loader2 size={18} className="spin" />
                <span>Searching FAISS vector index & generating answer with Gemma 2B...</span>
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
          className="btn"
          style={{ padding: '0.8rem 1.4rem' }}
          disabled={loading || !input.trim() || !activeDocument}
        >
          <Send size={16} /> Send
        </button>
      </form>
    </div>
  );
}
