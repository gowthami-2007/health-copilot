import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import Layout from '../components/common/Layout';
import ChatWindow from '../components/assistant/ChatWindow';
import aiService from '../services/aiService';
import ErrorMessage from '../components/common/ErrorMessage';
import { Plus, MessageSquare, Trash2, Bot, Clock } from 'lucide-react';
import Button from '../common/Button';

const Assistant = () => {
  const location = useLocation();
  const initialPrompt = location.state?.initialPrompt;

  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingQuery, setSendingQuery] = useState(false);
  const [error, setError] = useState(null);

  // Load user conversations
  const fetchConversations = useCallback(async () => {
    try {
      const res = await aiService.getConversations();
      const list = res.data?.conversations || [];
      setConversations(list);
      if (list.length > 0 && !activeConversationId) {
        setActiveConversationId(list[0]._id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, [activeConversationId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Load messages whenever activeConversationId changes
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      try {
        setLoadingMessages(true);
        const res = await aiService.getMessages(activeConversationId);
        setMessages(res.data?.messages || []);
      } catch (err) {
        console.error('Failed to load messages:', err);
        setError('Failed to load consultation messages');
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
  }, [activeConversationId]);

  // Handle incoming initial prompt from dashboard
  useEffect(() => {
    if (initialPrompt && !sendingQuery) {
      handleSendMessage(initialPrompt);
      // Clear location state
      window.history.replaceState({}, document.title);
    }
  }, [initialPrompt]);

  const handleSendMessage = async (question) => {
    try {
      setSendingQuery(true);
      setError(null);

      // Optimistic user message render
      const tempUserMsg = {
        _id: `temp-${Date.now()}`,
        role: 'user',
        content: question,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMsg]);

      const res = await aiService.sendChat(question, activeConversationId);
      const { conversationId, assistantMessage } = res.data;

      // If new conversation was created, update state
      if (!activeConversationId || activeConversationId !== conversationId) {
        setActiveConversationId(conversationId);
        fetchConversations();
      }

      setMessages((prev) => [
        ...prev.filter((m) => m._id !== tempUserMsg._id),
        res.data.userMessage,
        assistantMessage,
      ]);
    } catch (err) {
      console.error('Chat error:', err);
      setError(err.message || 'AI assistant was unable to process your request.');
    } finally {
      setSendingQuery(false);
    }
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
  };

  const handleDeleteConversation = async (e, convId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation history?')) return;

    try {
      await aiService.deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c._id !== convId));
      if (activeConversationId === convId) {
        handleNewConversation();
      }
    } catch (err) {
      alert('Failed to delete conversation');
    }
  };

  const activeConv = conversations.find((c) => c._id === activeConversationId);

  return (
    <Layout pageTitle="AI Health Assistant">
      <ErrorMessage message={error} onDismiss={() => setError(null)} />

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Conversations History Sidebar */}
        <div className="card" style={{ padding: '1.25rem', height: 'calc(100vh - 180px)', minHeight: '550px', display: 'flex', flexDirection: 'column' }}>
          <Button
            id="new-chat-btn"
            variant="primary"
            onClick={handleNewConversation}
            icon={Plus}
            style={{ width: '100%', marginBottom: '1.25rem' }}
          >
            New Consultation
          </Button>

          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
            Consultation History
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {conversations.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', textAlign: 'center', marginTop: '2rem' }}>
                No prior conversations. Ask a question to begin.
              </p>
            ) : (
              conversations.map((c) => {
                const isActive = c._id === activeConversationId;
                return (
                  <div
                    key={c._id}
                    onClick={() => setActiveConversationId(c._id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                      color: isActive ? 'var(--primary-dark)' : 'var(--text-main)',
                      fontWeight: isActive ? 600 : 400,
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      transition: 'all 0.15s ease',
                      border: `1px solid ${isActive ? 'var(--primary-light)' : 'transparent'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                      <MessageSquare size={15} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.title}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteConversation(e, c._id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-subtle)',
                        cursor: 'pointer',
                        padding: '0.2rem',
                        display: 'flex',
                      }}
                      title="Delete conversation"
                      aria-label="Delete conversation"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div>
          <ChatWindow
            messages={messages}
            isLoading={sendingQuery || loadingMessages}
            onSendMessage={handleSendMessage}
            conversationTitle={activeConv?.title || 'New Health Consultation'}
          />
        </div>
      </div>
    </Layout>
  );
};

export default Assistant;
