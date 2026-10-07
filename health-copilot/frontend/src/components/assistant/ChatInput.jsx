import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import Button from '../common/Button';

const ChatInput = ({ onSendMessage, isLoading = false, placeholder = 'Ask a question about your health records...' }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || isLoading) return;
    onSendMessage(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e) => {
    setText(e.target.value);
    // Auto resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-end',
        gap: '0.65rem',
        padding: '0.75rem 1rem',
        backgroundColor: '#ffffff',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <textarea
        ref={textareaRef}
        id="assistant-chat-textarea"
        rows={1}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isLoading}
        style={{
          flex: 1,
          border: 'none',
          outline: 'none',
          resize: 'none',
          fontSize: '0.95rem',
          fontFamily: 'inherit',
          lineHeight: 1.5,
          maxHeight: '120px',
          color: 'var(--text-main)',
          padding: '0.35rem 0',
        }}
      />

      <Button
        id="send-chat-btn"
        type="submit"
        variant="accent"
        size="sm"
        isLoading={isLoading}
        disabled={!text.trim() || isLoading}
        style={{
          borderRadius: 'var(--radius-md)',
          padding: '0.55rem 0.85rem',
          height: '38px',
        }}
      >
        <Send size={15} />
      </Button>
    </form>
  );
};

export default ChatInput;
