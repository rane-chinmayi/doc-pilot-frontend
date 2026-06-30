import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const getHistoryKey = (tool) => `amplitude_search_history_${tool}`;

const getHistory = (tool) => {
  try {
    return JSON.parse(localStorage.getItem(getHistoryKey(tool))) || [];
  } catch { return []; }
};

const saveToHistory = (query, tool) => {
  const history = getHistory(tool);
  const updated = [query, ...history.filter(q => q !== query)].slice(0, 10);
  localStorage.setItem(getHistoryKey(tool), JSON.stringify(updated));
};

const evaluationData = {
  totalQuestions: 50,
  accuracy: 74.0,
  avgResponseTime: 4.31,
  avgManualTime: 27.26,
  timeSavedPercent: 84.2,
  byTool: [
    { tool: 'Amplitude', accuracy: 75.0, questions: 20 },
    { tool: 'Mixpanel', accuracy: 86.7, questions: 15 },
    { tool: 'Google Analytics', accuracy: 60.0, questions: 15 }
  ],
  byConfidence: [
    { level: 'High', accuracy: 100.0, count: 14 },
    { level: 'Medium', accuracy: 66.7, count: 33 },
    { level: 'Low', accuracy: 33.3, count: 3 }
  ]
};

export default function App() {
  const [activeTab, setActiveTab] = useState('assistant');
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [loadingStep, setLoadingStep] = useState(0);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [selectedTool, setSelectedTool] = useState('amplitude');
  const [tools, setTools] = useState([
    { key: 'amplitude', name: 'Amplitude', icon: '📊' },
    { key: 'mixpanel', name: 'Mixpanel', icon: '🔥' },
    { key: 'google_analytics', name: 'Google Analytics', icon: '📈' }
  ]);
  const [darkMode, setDarkMode] = useState(true);
  const [searchHistory, setSearchHistory] = useState(getHistory(selectedTool));
  const inputRef = useRef(null);
  const chatEndRef = useRef(null);

  const getPlaceholder = () => {
    switch (selectedTool) {
      case 'mixpanel': return 'Ask anything about Mixpanel...';
      case 'google_analytics': return 'Ask anything about Google Analytics...';
      default: return 'Ask anything about Amplitude...';
    }
  };

  const getFooterText = () => {
    switch (selectedTool) {
      case 'mixpanel': return 'Built with Mixpanel Docs · Gemini AI · FAISS';
      case 'google_analytics': return 'Built with Google Analytics Docs · Gemini AI · FAISS';
      default: return 'Built with Amplitude Docs · Gemini AI · FAISS';
    }
  };

  const getDefaultChips = () => {
    switch (selectedTool) {
      case 'mixpanel': return [
        'How do I create a funnel in Mixpanel?',
        'What is retention in Mixpanel?',
        'How do I create a cohort in Mixpanel?'
      ];
      case 'google_analytics': return [
        'What is a segment in Google Analytics?',
        'How do I track conversions in GA4?',
        'What are events in Google Analytics?'
      ];
      default: return [
        'How do I build a funnel?',
        'What is a cohort?',
        'How do I track retention?'
      ];
    }
  };

  const [faqQuestions, setFaqQuestions] = useState(getDefaultChips());

  const theme = {
    dark: {
      bg: '#0F1117',
      card: '#1A1D2E',
      border: '#2E3250',
      text: '#F0F0F0',
      muted: '#8B8FA8',
      accent: '#7C3AED',
    },
    light: {
      bg: '#F8F9FC',
      card: '#FFFFFF',
      border: '#E2E8F0',
      text: '#1A1A2E',
      muted: '#64748B',
      accent: '#7C3AED',
    },
  };
  const t = darkMode ? theme.dark : theme.light;

  useEffect(() => {
    document.body.style.backgroundColor = t.bg;
  }, [darkMode]);

  useEffect(() => {
    setFaqQuestions(getDefaultChips());
    setSearchHistory(getHistory(selectedTool));
  }, [selectedTool]);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/tools`)
      .then(res => setTools(res.data.tools))
      .catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd+K or Ctrl+K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // Escape to clear chat
      if (e.key === 'Escape') {
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const styles = {
    app: {
      backgroundColor: t.bg,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '60px 20px',
      fontFamily: 'Inter, system-ui, sans-serif',
    },
    container: {
      width: '100%',
      maxWidth: '760px',
    },
    tabsWrapper: {
      display: 'flex',
      gap: '32px',
      marginBottom: '48px',
      borderBottom: `1px solid ${t.border}`,
    },
    tab: {
      padding: '12px 0',
      background: 'transparent',
      border: 'none',
      color: t.muted,
      fontSize: '15px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      borderBottom: '2px solid transparent',
    },
    tabActive: {
      color: t.text,
      borderBottomColor: t.accent,
    },
    header: {
      textAlign: 'center',
      marginBottom: '48px',
    },
    emoji: {
      fontSize: '48px',
      marginBottom: '16px',
    },
    title: {
      fontSize: '2rem',
      fontWeight: '700',
      color: t.text,
      marginBottom: '12px',
    },
    subtitle: {
      fontSize: '1rem',
      color: t.muted,
      marginBottom: '16px',
    },
    badge: {
      display: 'inline-block',
      border: `1px solid ${t.accent}`,
      borderRadius: '20px',
      padding: '6px 16px',
      fontSize: '13px',
      color: t.accent,
    },
    chipsRow: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'center',
      marginBottom: '32px',
      flexWrap: 'wrap',
    },
    chip: {
      background: 'transparent',
      border: `1px solid ${t.border}`,
      borderRadius: '20px',
      padding: '8px 16px',
      fontSize: '13px',
      color: t.muted,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    searchRow: {
      display: 'flex',
      alignItems: 'center',
      backgroundColor: t.card,
      border: `1px solid ${t.border}`,
      borderRadius: '12px',
      padding: '4px 4px 4px 16px',
      marginBottom: '32px',
      width: '100%',
    },
    input: {
      flex: 1,
      background: 'transparent',
      border: 'none',
      outline: 'none',
      color: t.text,
      fontSize: '15px',
      padding: '10px 0',
    },
    sendButton: {
      backgroundColor: t.accent,
      border: 'none',
      borderRadius: '8px',
      color: 'white',
      width: '40px',
      height: '40px',
      cursor: 'pointer',
      fontSize: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    answerCard: {
      backgroundColor: t.card,
      borderLeft: `3px solid ${t.accent}`,
      borderRadius: '8px',
      padding: '24px',
      marginBottom: '24px',
      width: '100%',
    },
    answerLabel: {
      fontSize: '11px',
      letterSpacing: '1px',
      color: t.muted,
      textTransform: 'uppercase',
      marginBottom: '12px',
    },
    answerText: {
      color: t.text,
      fontSize: '15px',
      lineHeight: '1.7',
      marginBottom: '16px',
    },
    sourceTag: {
      display: 'inline-block',
      backgroundColor: t.bg,
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      padding: '4px 10px',
      fontSize: '12px',
      color: t.accent,
      marginTop: '16px',
    },
    feedbackRow: {
      display: 'flex',
      gap: '12px',
      marginTop: '16px',
    },
    feedbackBtn: {
      background: 'transparent',
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      padding: '8px 20px',
      color: t.muted,
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'all 0.2s ease',
    },
    footer: {
      textAlign: 'center',
      color: t.muted,
      fontSize: '13px',
      marginTop: '48px',
      paddingBottom: '32px',
    },
    loadingDots: {
      display: 'flex',
      gap: '8px',
      justifyContent: 'center',
      margin: '32px 0',
    },
    dot: {
      width: '8px',
      height: '8px',
      backgroundColor: t.accent,
      borderRadius: '50%',
      animation: 'bounce 1.4s infinite',
    },
    error: {
      backgroundColor: 'rgba(239, 68, 68, 0.2)',
      border: '1px solid #ef4444',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '24px',
      color: '#ef4444',
      fontSize: '14px',
      width: '100%',
    },
    metricsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '16px',
      marginBottom: '32px',
    },
    metricCard: {
      backgroundColor: t.card,
      border: `1px solid ${t.border}`,
      borderRadius: '12px',
      padding: '20px',
      textAlign: 'center',
    },
    metricValue: {
      fontSize: '2rem',
      fontWeight: '700',
      color: t.accent,
      marginBottom: '8px',
    },
    metricLabel: {
      fontSize: '13px',
      color: t.muted,
    },
    refreshButton: {
      backgroundColor: t.accent,
      border: 'none',
      borderRadius: '8px',
      color: 'white',
      padding: '10px 20px',
      cursor: 'pointer',
      fontSize: '14px',
      marginBottom: '32px',
      transition: 'all 0.2s ease',
    },
    analyticsTable: {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: '16px',
    },
    tableHeader: {
      backgroundColor: t.card,
      borderBottom: `1px solid ${t.border}`,
      padding: '12px',
      textAlign: 'left',
      fontSize: '13px',
      fontWeight: '600',
      color: t.accent,
    },
    tableCell: {
      borderBottom: `1px solid ${t.border}`,
      padding: '12px',
      fontSize: '13px',
      color: t.text,
    },
    emptyMessage: {
      backgroundColor: t.card,
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      padding: '32px',
      textAlign: 'center',
      color: t.muted,
      fontSize: '14px',
    },
    feedbackMessage: {
      marginTop: '16px',
      fontSize: '14px',
      padding: '12px 16px',
      borderRadius: '8px',
    },
    feedbackPositive: {
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      color: '#22c55e',
      border: '1px solid #22c55e',
    },
    feedbackNegative: {
      backgroundColor: 'rgba(234, 179, 8, 0.1)',
      color: '#eab308',
      border: '1px solid #eab308',
    },
    resetButton: {
      background: 'transparent',
      border: `1px solid ${t.border}`,
      borderRadius: '8px',
      padding: '10px 20px',
      color: t.muted,
      cursor: 'pointer',
      fontSize: '14px',
      marginTop: '16px',
      transition: 'all 0.2s ease',
    },
    copyButton: {
      background: 'transparent',
      border: `1px solid ${t.border}`,
      borderRadius: '6px',
      padding: '4px 10px',
      color: t.muted,
      cursor: 'pointer',
      fontSize: '12px',
      float: 'right',
    },
    relatedQuestionsSection: {
      marginTop: '32px',
    },
    relatedQuestionsTitle: {
      fontSize: '14px',
      color: t.muted,
      marginBottom: '12px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    relatedQuestionsGrid: {
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap',
    },
    relatedQuestion: {
      background: 'transparent',
      border: `1px solid ${t.border}`,
      borderRadius: '20px',
      padding: '8px 16px',
      fontSize: '13px',
      color: t.muted,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
  };

  const models = [
    { value: 'gemini-2.5-flash', label: '⚡ Gemini 2.5 Flash', description: '20 req/day' },
    { value: 'gemini-2.5-flash-lite', label: '🚀 Gemini 2.5 Flash Lite', description: 'Higher limits' },
    { value: 'gemini-2.0-flash-lite', label: '💡 Gemini 2.0 Flash Lite', description: 'Most generous' },
  ];

  const loadingMessages = [
    '🔍 Searching Amplitude docs...',
    '📄 Reading relevant sections...',
    '🧠 Thinking...',
    '✍️ Generating answer...',
  ];

  const handleSearch = async (searchQuery) => {
    if (!searchQuery.trim()) return;

    const userMsg = { id: Date.now(), type: 'user', content: searchQuery };
    const loadingMsg = { id: Date.now() + 1, type: 'assistant', content: loadingMessages[0], loading: true };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setQuery('');
    saveToHistory(searchQuery, selectedTool);
    setSearchHistory(getHistory(selectedTool));

    const interval = startLoadingAnimation();

    try {
      const response = await axios.post(`${API_BASE_URL}/ask`, {
        query: searchQuery,
        model: selectedModel,
        tool: selectedTool
      });
      const data = response.data;
      clearInterval(interval);

      const assistantMsg = {
        id: Date.now() + 2,
        type: 'assistant',
        content: data.answer,
        source_url: data.source_url,
        confidence: data.confidence,
        model_used: data.model_used,
        response_time: data.response_time,
        feedbackGiven: null,
        relatedQuestions: []
      };

      setMessages(prev => prev.map(msg => msg.loading ? assistantMsg : msg));

      // Fetch related questions
      try {
        const relatedRes = await axios.post(`${API_BASE_URL}/related`, {
          query: searchQuery,
          answer: data.answer,
          model: selectedModel
        });
        if (relatedRes.data.questions?.length > 0) {
          setMessages(prev => prev.map(msg =>
            msg.id === assistantMsg.id ? { ...msg, relatedQuestions: relatedRes.data.questions } : msg
          ));
        }
      } catch {}

    } catch (error) {
      clearInterval(interval);
      setMessages(prev => prev.map(msg =>
        msg.loading ? { ...msg, loading: false, content: 'Our AI models are currently busy. Please try again in a moment, or select a different model from the dropdown above.' } : msg
      ));
    }
  };

  const handleFeedback = (messageId, type) => {
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, feedbackGiven: type } : msg
    ));
    const msg = messages.find(m => m.id === messageId);
    if (msg) {
      const idx = messages.indexOf(msg);
      const userMsg = messages.slice(0, idx).reverse().find(m => m.type === 'user');
      axios.post(`${API_BASE_URL}/feedback`, {
        query: userMsg?.content || '',
        answer: msg.content,
        feedback: type
      }).catch(() => {});
    }
  };

  const startLoadingAnimation = () => {
    setLoadingStep(0);
    const interval = setInterval(() => {
      setLoadingStep(prev => {
        if (prev >= loadingMessages.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 1500);
    return interval;
  };

  return (
    <div style={styles.app}>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { opacity: 0.3; }
          40% { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        .dot-0 { animation-delay: 0s; }
        .dot-1 { animation-delay: 0.2s; }
        .dot-2 { animation-delay: 0.4s; }

        /* Markdown styles */
        .answerText ul, .answerText ol {
          padding-left: 20px;
        }
        .answerText li {
          margin-bottom: 6px;
        }
        .answerText p {
          margin-bottom: 12px;
        }
        .answerText strong {
          color: ${t.text};
          font-weight: 600;
        }
      `}</style>

      {/* Dark/Light Mode Toggle */}
      <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 100 }}>
        <button
          onClick={() => setDarkMode(!darkMode)}
          style={{
            backgroundColor: t.card,
            border: `1px solid ${t.border}`,
            borderRadius: '8px',
            padding: '8px 14px',
            color: t.text,
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          {darkMode ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.emoji}>{activeTab === 'assistant' ? '🤖' : '📊'}</div>
          <h1 style={styles.title}>{activeTab === 'assistant' ? 'DocPilot' : 'Analytics Dashboard'}</h1>
          <p style={styles.subtitle}>
            {activeTab === 'assistant'
              ? 'Get instant answers from your analytics tool docs'
              : 'Evaluation results across Amplitude, Mixpanel, and Google Analytics'}
          </p>
          <div style={styles.badge}>✦ Powered by Gemini AI + FAISS</div>

          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', color: t.muted }}>Model:</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{
                backgroundColor: t.card,
                border: `1px solid ${t.border}`,
                borderRadius: '8px',
                color: t.text,
                padding: '6px 12px',
                fontSize: '13px',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {models.map(m => (
                <option key={m.value} value={m.value}>
                  {m.label} — {m.description}
                </option>
              ))}
            </select>
          </div>

          {activeTab === 'assistant' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: t.muted }}>Tool:</span>
              {tools.map(tool => (
                <button
                  key={tool.key}
                  onClick={() => {
                    setSelectedTool(tool.key);
                    setMessages([{
                      id: Date.now(),
                      type: 'system',
                      content: `Switched to ${tool.name} — ask me anything!`
                    }]);
                  }}
                  style={{
                    backgroundColor: selectedTool === tool.key ? t.accent : 'transparent',
                    border: `1px solid ${selectedTool === tool.key ? t.accent : t.border}`,
                    borderRadius: '20px',
                    padding: '6px 16px',
                    fontSize: '13px',
                    color: selectedTool === tool.key ? 'white' : t.muted,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {tool.icon} {tool.name}
                </button>
              ))}
            </div>
          )}

        </div>

        {/* Tab Switcher */}
        <div style={styles.tabsWrapper}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'assistant' ? styles.tabActive : {})
            }}
            onClick={() => setActiveTab('assistant')}
          >
            🤖 Assistant
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'analytics' ? styles.tabActive : {})
            }}
            onClick={() => setActiveTab('analytics')}
          >
            📊 Analytics
          </button>
        </div>

        {/* ASSISTANT TAB */}
        {activeTab === 'assistant' && (
          <>
            {/* FAQ Chips */}
            <div style={styles.chipsRow}>
              {faqQuestions.map((q, i) => (
                <button key={i} onMouseDown={() => { setQuery(q); handleSearch(q); }} style={styles.chip}>
                  {q}
                </button>
              ))}
            </div>

            {/* Clear Chat Button */}
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                style={{ ...styles.chip, marginBottom: '16px', fontSize: '12px' }}
              >
                🗑 Clear Chat
              </button>
            )}

            {/* Chat Messages Area */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              maxHeight: '60vh',
              scrollbarWidth: 'none',
              width: '100%',
            }}>
              {messages.map((msg) => (
                msg.type === 'system' ? (
                  <div key={msg.id} style={{ textAlign: 'center', color: t.muted, fontSize: '13px', padding: '8px' }}>
                    {msg.content}
                  </div>
                ) : msg.type === 'user' ? (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{
                      backgroundColor: t.accent,
                      color: 'white',
                      borderRadius: '18px 18px 4px 18px',
                      padding: '12px 18px',
                      maxWidth: '70%',
                      fontSize: '15px',
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '85%' }}>
                    <div style={{
                      backgroundColor: t.card,
                      borderLeft: `3px solid ${t.accent}`,
                      borderRadius: '4px 18px 18px 18px',
                      padding: '16px 20px',
                    }}>
                      {msg.loading ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: t.accent, animation: 'pulse 1s infinite' }}/>
                          <span style={{ color: t.muted, fontSize: '14px' }}>{loadingMessages[loadingStep]}</span>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '11px', color: t.muted, textTransform: 'uppercase', letterSpacing: '1px' }}>Answer</span>
                            <span style={{ fontSize: '11px', color: t.muted }}>
                              {msg.confidence === 'High' ? '🟢' : msg.confidence === 'Medium' ? '🟡' : '🔴'} {msg.confidence} Confidence
                            </span>
                            {msg.response_time && (
                              <span style={{
                                fontSize: '11px',
                                color: t.muted,
                                marginLeft: '8px'
                              }}>
                                ⏱ {msg.response_time}s
                              </span>
                            )}
                            <span style={{ fontSize: '11px', backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: '4px', padding: '2px 8px', color: t.accent }}>
                              ⚡ {msg.model_used}
                            </span>
                          </div>
                          <div style={{ color: t.text, fontSize: '15px', lineHeight: '1.7' }} className="answerText">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                          <a
                            href={msg.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: t.bg, border: `1px solid ${t.accent}`, borderRadius: '6px', padding: '4px 10px', fontSize: '12px', color: t.accent, textDecoration: 'none', marginTop: '12px' }}
                          >
                            📄 View Source Documentation ↗
                          </a>
                        </>
                      )}
                    </div>

                    {!msg.loading && !msg.feedbackGiven && (
                      <div style={{ display: 'flex', gap: '8px', paddingLeft: '4px' }}>
                        <button onMouseDown={() => handleFeedback(msg.id, 'positive')} style={{ ...styles.feedbackBtn }}>👍 Helpful</button>
                        <button onMouseDown={() => handleFeedback(msg.id, 'negative')} style={{ ...styles.feedbackBtn }}>👎 Not Helpful</button>
                      </div>
                    )}

                    {msg.feedbackGiven === 'positive' && (
                      <p style={{ fontSize: '13px', color: '#10B981', paddingLeft: '4px' }}>✅ Glad it helped!</p>
                    )}
                    {msg.feedbackGiven === 'negative' && (
                      <p style={{ fontSize: '13px', color: '#EAB308', paddingLeft: '4px' }}>📝 Thanks for the feedback!</p>
                    )}

                    {msg.relatedQuestions && msg.relatedQuestions.length > 0 && (
                      <div style={{ paddingLeft: '4px' }}>
                        <p style={{ fontSize: '12px', color: t.muted, marginBottom: '8px' }}>You might also ask:</p>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {msg.relatedQuestions.map((q, i) => (
                            <button key={i} onMouseDown={() => handleSearch(q)} style={styles.chip}>{q}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              ))}

              {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: t.muted, marginTop: '40px' }}>
                  <p style={{ fontSize: '15px' }}>Ask anything about Amplitude analytics</p>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Search Bar + History Dropdown */}
            <div style={{ position: 'relative', width: '100%', marginTop: '16px' }}>
              <div style={styles.searchRow}>
                <input
                  ref={inputRef}
                  type="text"
                  style={styles.input}
                  placeholder={getPlaceholder()}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && query.trim()) {
                      handleSearch(query);
                    }
                  }}
                />
                <button
                  style={styles.sendButton}
                  onClick={() => query.trim() && handleSearch(query)}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#6d28d9'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = t.accent}
                >
                  ➤
                </button>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '6px',
                marginBottom: '8px'
              }}>
                <span style={{
                  fontSize: '11px',
                  color: t.muted,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  Press
                  <kbd style={{
                    backgroundColor: t.card,
                    border: `1px solid ${t.border}`,
                    borderRadius: '4px',
                    padding: '1px 6px',
                    fontSize: '11px',
                    color: t.muted,
                    fontFamily: 'monospace'
                  }}>Ctrl+K</kbd>
                  to focus
                </span>
              </div>
            </div>
          </>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <>
            <p style={{ fontSize: '13px', color: t.muted, marginBottom: '24px' }}>
              📋 Based on a 50-question self-evaluation across Amplitude, Mixpanel, and Google Analytics
            </p>

            {/* Headline Metrics */}
            <div style={styles.metricsGrid}>
              <div style={styles.metricCard}>
                <div style={styles.metricValue}>{evaluationData.totalQuestions}</div>
                <div style={styles.metricLabel}>Questions Evaluated</div>
              </div>
              <div style={styles.metricCard}>
                <div style={styles.metricValue}>{evaluationData.accuracy}%</div>
                <div style={styles.metricLabel}>Answer Accuracy</div>
              </div>
              <div style={styles.metricCard}>
                <div style={styles.metricValue}>{evaluationData.avgResponseTime}s</div>
                <div style={styles.metricLabel}>Avg Response Time</div>
              </div>
              <div style={styles.metricCard}>
                <div style={styles.metricValue}>{evaluationData.timeSavedPercent}%</div>
                <div style={styles.metricLabel}>Time Saved vs Manual</div>
              </div>
            </div>

            {/* Accuracy by Tool */}
            <div style={{ backgroundColor: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
              <h3 style={{ color: t.text, fontSize: '16px', marginBottom: '16px' }}>🔧 Accuracy by Tool</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={evaluationData.byTool}>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.border}/>
                  <XAxis dataKey="tool" stroke={t.muted} fontSize={11}/>
                  <YAxis stroke={t.muted} fontSize={11} unit="%"/>
                  <Tooltip contentStyle={{ backgroundColor: t.card, border: `1px solid ${t.border}`, borderRadius: '8px', color: t.text }} formatter={(value) => [`${value}%`, 'Accuracy']}/>
                  <Bar dataKey="accuracy" fill="#7C3AED" radius={[4, 4, 0, 0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Confidence Calibration */}
            <div style={{ backgroundColor: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
              <h3 style={{ color: t.text, fontSize: '16px', marginBottom: '16px' }}>🎯 Confidence Calibration</h3>
              <p style={{ fontSize: '12px', color: t.muted, marginBottom: '16px' }}>Does the confidence badge actually predict accuracy?</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={evaluationData.byConfidence}>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.border}/>
                  <XAxis dataKey="level" stroke={t.muted} fontSize={11}/>
                  <YAxis stroke={t.muted} fontSize={11} unit="%"/>
                  <Tooltip contentStyle={{ backgroundColor: t.card, border: `1px solid ${t.border}`, borderRadius: '8px', color: t.text }} formatter={(value) => [`${value}%`, 'Accuracy']}/>
                  <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                    {evaluationData.byConfidence.map((entry, i) => (
                      <Cell key={i} fill={entry.level === 'High' ? '#10B981' : entry.level === 'Medium' ? '#EAB308' : '#EF4444'}/>
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Response Time Comparison */}
            <div style={{ backgroundColor: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
              <h3 style={{ color: t.text, fontSize: '16px', marginBottom: '16px' }}>⏱ DocPilot vs Manual Search</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={[
                  { method: 'DocPilot', seconds: evaluationData.avgResponseTime },
                  { method: 'Manual Search', seconds: evaluationData.avgManualTime }
                ]} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={t.border}/>
                  <XAxis type="number" stroke={t.muted} fontSize={11} unit="s"/>
                  <YAxis type="category" dataKey="method" stroke={t.muted} fontSize={12} width={100}/>
                  <Tooltip contentStyle={{ backgroundColor: t.card, border: `1px solid ${t.border}`, borderRadius: '8px', color: t.text }} formatter={(value) => [`${value}s`, 'Time']}/>
                  <Bar dataKey="seconds" radius={[0, 4, 4, 0]}>
                    <Cell fill="#7C3AED"/>
                    <Cell fill="#6B7280"/>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* Footer */}
        <div style={styles.footer}>
          <p style={{ marginBottom: '8px' }}>{getFooterText()}</p>
          <p>Developed by <span style={{ color: t.accent }}>Chinmayi</span></p>
        </div>
      </div>
    </div>
  );
}
