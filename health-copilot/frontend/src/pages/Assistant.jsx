import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Layout from '../components/common/Layout';
import ChatWindow from '../components/assistant/ChatWindow';
import aiService from '../services/aiService';
import ErrorMessage from '../components/common/ErrorMessage';
import { Plus, MessageSquare, Trash2, Bot, Clock, Edit2, Check, X } from 'lucide-react';
import Button from '../components/common/Button';

const Assistant = () => {
  const location = useLocation();
  const initialPrompt = location.state?.initialPrompt;

  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingQuery, setSendingQuery] = useState(false);
  const [error, setError] = useState(null);
  const [resetKey, setResetKey] = useState(0);
  const [editingConvId, setEditingConvId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Refs to manage race conditions and lifecycle
  const hasInitializedSelection = useRef(false);
  const activeConversationIdRef = useRef(activeConversationId);
  const chatAbortControllerRef = useRef(null);
  const messagesAbortControllerRef = useRef(null);
  const activeRequestIdRef = useRef(0);

  // Keep ref synchronized with state
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  // Load user conversations
  const fetchConversations = useCallback(async () => {
    try {
      const res = await aiService.getConversations();
      const list = res.data?.conversations || [];
      setConversations(list);

      // Only auto-select first conversation on initial page load if no initialPrompt is queued
      if (!hasInitializedSelection.current) {
        hasInitializedSelection.current = true;
        if (list.length > 0 && !initialPrompt) {
          setActiveConversationId(list[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, [initialPrompt]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Load messages whenever activeConversationId changes
  useEffect(() => {
    // Abort any pending message fetch from a previous conversation
    if (messagesAbortControllerRef.current) {
      messagesAbortControllerRef.current.abort();
      messagesAbortControllerRef.current = null;
    }

    if (!activeConversationId) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    const abortController = new AbortController();
    messagesAbortControllerRef.current = abortController;

    const loadMessages = async () => {
      try {
        setLoadingMessages(true);
        const res = await aiService.getMessages(activeConversationId, abortController.signal);
        // Only set messages if this request was not aborted and is still the active conversation
        if (!abortController.signal.aborted && activeConversationIdRef.current === activeConversationId) {
          setMessages(res.data?.messages || []);
        }
      } catch (err) {
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED' || abortController.signal.aborted) {
          return;
        }
        console.error('Failed to load messages:', err);
        setError('Failed to load consultation messages');
      } finally {
        if (!abortController.signal.aborted) {
          setLoadingMessages(false);
        }
      }
    };

    loadMessages();

    return () => {
      abortController.abort();
    };
  }, [activeConversationId]);

  // Handle incoming initial prompt from dashboard
  useEffect(() => {
    if (initialPrompt && !sendingQuery) {
      handleSendMessage(initialPrompt);
      // Clear location state
      window.history.replaceState({}, document.title);
    }
  }, [initialPrompt]);

  const handleSendMessage = async (question, localAttachments = []) => {
    const rawText = (question || '').trim();
    if (!rawText && (!localAttachments || localAttachments.length === 0)) return;

    // Abort any prior in-flight chat request
    if (chatAbortControllerRef.current) {
      chatAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    chatAbortControllerRef.current = abortController;

    // Track this specific request
    const requestId = ++activeRequestIdRef.current;
    const targetConversationId = activeConversationIdRef.current;

    try {
      setSendingQuery(true);
      setError(null);

      // 1. Upload any pending attachment files
      const uploadedAttachments = [];
      for (const att of localAttachments) {
        if (att.documentId) {
          uploadedAttachments.push(att);
        } else if (att.file) {
          try {
            const upRes = await aiService.uploadAttachment(att.file);
            const savedAttachment = upRes.data?.attachment || upRes.attachment;
            if (savedAttachment) {
              uploadedAttachments.push({
                ...savedAttachment,
                previewUrl: att.previewUrl,
              });
            }
          } catch (uploadErr) {
            console.error('Attachment upload failed:', uploadErr);
            throw new Error(`Failed to upload ${att.fileName}: ${uploadErr.message || 'Network error'}`);
          }
        }
      }

      // Check for abort before proceeding
      if (requestId !== activeRequestIdRef.current || abortController.signal.aborted) {
        return;
      }

      // Optimistic user message render
      const tempUserMsg = {
        _id: `temp-${Date.now()}`,
        role: 'user',
        content: rawText || (uploadedAttachments.length > 0 ? `[Attached: ${uploadedAttachments.map(a => a.fileName).join(', ')}]` : ''),
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : localAttachments,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMsg]);

      // Format history from current messages
      const historyPayload = messages
        .filter((m) => m && m.content && !m._id?.startsWith('temp-'))
        .slice(-8)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await aiService.sendChat(
        rawText,
        targetConversationId,
        historyPayload,
        abortController.signal,
        uploadedAttachments
      );

      // If a newer request was dispatched or the user clicked New Consultation, drop stale response
      if (requestId !== activeRequestIdRef.current || abortController.signal.aborted) {
        return;
      }

      const data = res.data || {};
      const returnedConvId = data.conversationId;
      const returnedAssistantMsg = data.assistantMessage || {
        _id: `resp-${Date.now()}`,
        role: 'assistant',
        content: res.message || data.message || 'No response content received.',
        createdAt: new Date().toISOString(),
      };
      const returnedUserMsg = data.userMessage || tempUserMsg;
      const newTitle = data.conversationTitle;

      // If a new conversation was created on the backend
      if (!targetConversationId && returnedConvId) {
        setActiveConversationId(returnedConvId);
        // Prepend new conversation to sidebar immediately
        setConversations((prev) => [
          {
            _id: returnedConvId,
            title: newTitle || 'Health Consultation',
            updatedAt: new Date().toISOString(),
          },
          ...prev.filter((c) => c._id !== returnedConvId),
        ]);
        // Also fetch to guarantee full synchronization
        fetchConversations();
      } else if (newTitle && targetConversationId) {
        // Update local conversation title immediately for the conversation
        setConversations((prev) =>
          prev.map((c) => (c._id === targetConversationId ? { ...c, title: newTitle } : c))
        );
      }

      setMessages((prev) => [
        ...prev.filter((m) => m._id !== tempUserMsg._id),
        returnedUserMsg,
        returnedAssistantMsg,
      ]);
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED' || abortController.signal.aborted) {
        return;
      }
      if (requestId !== activeRequestIdRef.current) {
        return;
      }

      console.error('Chat error:', err);
      const friendlyError = err.message || 'The AI service took longer than expected to respond. Please try again.';
      setError(friendlyError);

      // Append assistant error message directly in chat stream so it never stays quiet
      setMessages((prev) => [
        ...prev,
        {
          _id: `err-${Date.now()}`,
          role: 'assistant',
          isError: true,
          content: `⚠️ ${friendlyError}\n\nPlease try sending your message again.`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setSendingQuery(false);
      }
    }
  };

  const handleNewConversation = () => {
    // 1. Cancel any in-flight chat query or message fetch
    if (chatAbortControllerRef.current) {
      chatAbortControllerRef.current.abort();
      chatAbortControllerRef.current = null;
    }
    if (messagesAbortControllerRef.current) {
      messagesAbortControllerRef.current.abort();
      messagesAbortControllerRef.current = null;
    }

    // 2. Invalidate active request ID so any pending resolution is ignored
    activeRequestIdRef.current += 1;

    // 3. Mark initial selection as settled so fetchConversations never forces an old conversation
    hasInitializedSelection.current = true;

    // 4. Reset active conversation and state immediately
    setActiveConversationId(null);
    setMessages([]);
    setError(null);
    setSendingQuery(false);
    setLoadingMessages(false);

    // 5. Increment resetKey to clear composer text, attachments, and camera states
    setResetKey((prev) => prev + 1);
  };

  const handleDeleteConversation = async (e, convId) => {
    e.stopPropagation();
    // Delete immediately without blocking browser alert
    try {
      setConversations((prev) => prev.filter((c) => c._id !== convId));
      if (activeConversationId === convId) {
        handleNewConversation();
      }
      await aiService.deleteConversation(convId);
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleStartRename = (e, c) => {
    e.stopPropagation();
    setEditingConvId(c._id);
    setEditingTitle(c.title || '');
  };

  const handleSaveRename = async (e, convId) => {
    e.stopPropagation();
    const trimmed = editingTitle.trim();
    if (!trimmed) {
      setEditingConvId(null);
      return;
    }

    setConversations((prev) =>
      prev.map((c) => (c._id === convId ? { ...c, title: trimmed } : c))
    );
    setEditingConvId(null);

    try {
      await aiService.renameConversation(convId, trimmed);
    } catch (err) {
      console.error('Failed to rename conversation:', err);
    }
  };

  const handleCancelRename = (e) => {
    e.stopPropagation();
    setEditingConvId(null);
  };

  const [showMobileHistory, setShowMobileHistory] = useState(false);

  const activeConv = conversations.find((c) => c._id === activeConversationId);

  return (
    <Layout pageTitle="AI Health Assistant">
      <ErrorMessage message={error} onDismiss={() => setError(null)} />

      {/* Mobile Toolbar (visible only <= 1024px via CSS) */}
      <div className="assistant-mobile-toolbar">
        <Button
          id="mobile-new-chat-btn"
          variant="primary"
          size="sm"
          onClick={() => {
            handleNewConversation();
            setShowMobileHistory(false);
          }}
          icon={Plus}
        >
          New Consultation
        </Button>

        <button
          type="button"
          onClick={() => setShowMobileHistory((prev) => !prev)}
          className="btn btn-secondary btn-sm"
          style={{ gap: '0.4rem' }}
          aria-expanded={showMobileHistory}
        >
          <MessageSquare size={15} />
          <span>Consultations ({conversations.length})</span>
        </button>
      </div>

      <div className="assistant-layout-grid">
        {/* Conversations History Sidebar */}
        <div className={`assistant-history-container ${showMobileHistory ? 'show-mobile' : ''}`}>
          <div className="card assistant-history-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
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
                  const isEditing = editingConvId === c._id;

                  if (isEditing) {
                    return (
                      <div
                        key={c._id}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.45rem 0.65rem',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: '#ffffff',
                          border: '1px solid var(--primary)',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                        }}
                      >
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(e, c._id);
                            if (e.key === 'Escape') handleCancelRename(e);
                          }}
                          autoFocus
                          style={{
                            flex: 1,
                            fontSize: '0.85rem',
                            border: 'none',
                            outline: 'none',
                            background: 'transparent',
                            color: 'var(--text-main)',
                            minWidth: 0,
                            padding: 0,
                          }}
                        />
                        <button
                          type="button"
                          onClick={(e) => handleSaveRename(e, c._id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#059669',
                            cursor: 'pointer',
                            padding: '0.2rem',
                            display: 'flex',
                          }}
                          title="Save title"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelRename}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-subtle)',
                            cursor: 'pointer',
                            padding: '0.2rem',
                            display: 'flex',
                          }}
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={c._id}
                      onClick={() => {
                        setActiveConversationId(c._id);
                        setShowMobileHistory(false);
                      }}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden', flex: 1, minWidth: 0 }}>
                        <MessageSquare size={15} style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.title}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0, marginLeft: '0.35rem' }}>
                        <button
                          type="button"
                          onClick={(e) => handleStartRename(e, c)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-subtle)',
                            cursor: 'pointer',
                            padding: '0.2rem',
                            display: 'flex',
                            opacity: 0.7,
                          }}
                          title="Rename title"
                          aria-label="Rename title"
                        >
                          <Edit2 size={13} />
                        </button>

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
                            opacity: 0.7,
                          }}
                          title="Delete conversation"
                          aria-label="Delete conversation"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Chat Window */}
        <div style={{ minWidth: 0, width: '100%' }}>
          <ChatWindow
            messages={messages}
            isLoading={sendingQuery || loadingMessages}
            onSendMessage={handleSendMessage}
            conversationTitle={activeConv?.title || 'New Health Consultation'}
            resetKey={resetKey}
          />
        </div>
      </div>
    </Layout>
  );
};

export default Assistant;
