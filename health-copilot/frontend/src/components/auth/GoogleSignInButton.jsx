import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { AlertCircle, HelpCircle, ExternalLink, X } from 'lucide-react';

const GoogleSignInButton = ({ onSuccess, onError, disabled = false, text = 'continue_with' }) => {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isRealClientIdConfigured = Boolean(
    clientId &&
    !clientId.includes('dummy-client-id') &&
    clientId.includes('.apps.googleusercontent.com')
  );

  const handleSuccess = (credentialResponse) => {
    if (credentialResponse?.credential) {
      onSuccess(credentialResponse.credential);
    } else {
      if (onError) onError('No credential received from Google.');
    }
  };

  const handleFailure = () => {
    if (onError) {
      onError('Google sign-in was cancelled or failed. Please try again.');
    }
  };

  const handleDummyClick = () => {
    setShowConfigModal(true);
    if (onError) {
      onError('Please configure your VITE_GOOGLE_CLIENT_ID in your environment variables to enable real Google authentication.');
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Modal explaining how to configure Google OAuth Client ID */}
      {showConfigModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '520px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            position: 'relative',
          }}>
            <button
              type="button"
              onClick={() => setShowConfigModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
              }}
            >
              <X size={20} />
            </button>

            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}>
              <AlertCircle size={26} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
              Google OAuth Setup Required
            </h3>
            <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              The popup showed <code>Error 401: invalid_client</code> because your Google OAuth Client ID has not been added to your environment variables yet.
            </p>

            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1rem',
              fontSize: '0.85rem',
              color: '#334155',
              lineHeight: 1.6,
              marginBottom: '1.25rem',
            }}>
              <strong>How to fix in 2 minutes:</strong>
              <ol style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.25rem' }}>
                <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" style={{ color: '#0284c7', fontWeight: 600 }}>Google Cloud Console</a> &rarr; Credentials.</li>
                <li>Create an <strong>OAuth 2.0 Client ID</strong> (Web application).</li>
                <li>Add <code>https://health-copilot-pearl.vercel.app</code> and <code>http://localhost:5173</code> to <strong>Authorized JavaScript origins</strong>.</li>
                <li>Add the Client ID to <strong>Vercel &rarr; Settings &rarr; Environment Variables</strong>:
                  <div style={{ marginTop: '4px', fontFamily: 'monospace', background: '#e2e8f0', padding: '4px 8px', borderRadius: '4px', wordBreak: 'break-all' }}>
                    VITE_GOOGLE_CLIENT_ID = your_id.apps.googleusercontent.com
                  </div>
                </li>
              </ol>
            </div>

            <button
              type="button"
              onClick={() => setShowConfigModal(false)}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {isRealClientIdConfigured ? (
        <div style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          opacity: disabled ? 0.6 : 1,
          pointerEvents: disabled ? 'none' : 'auto',
        }}>
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={handleFailure}
            theme="outline"
            size="large"
            text={text}
            shape="rectangular"
            width="100%"
            useOneTap={false}
          />
        </div>
      ) : (
        /* Fallback branded Google button that explains setup instead of launching broken 401 popup */
        <button
          type="button"
          onClick={handleDummyClick}
          disabled={disabled}
          style={{
            width: '100%',
            height: '40px',
            backgroundColor: '#ffffff',
            border: '1px solid #dadce0',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            color: '#3c4043',
            fontFamily: 'Roboto, arial, sans-serif',
            boxShadow: '0 1px 2px rgba(60, 64, 67, 0.08)',
            transition: 'background-color 0.2s ease, border-color 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafd'; e.currentTarget.style.borderColor = '#c2c7d0'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#dadce0'; }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
          </svg>
          <span>{text === 'signup_with' ? 'Sign up with Google' : 'Continue with Google'}</span>
        </button>
      )}
    </div>
  );
};

export default GoogleSignInButton;
