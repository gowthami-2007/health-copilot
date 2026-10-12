import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { AlertCircle } from 'lucide-react';

const GoogleSignInButton = ({ onSuccess, onError, disabled = false, text = 'continue_with' }) => {
  const [configNotice, setConfigNotice] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isRealClientIdConfigured = Boolean(clientId && !clientId.includes('dummy-client-id'));

  const handleSuccess = (credentialResponse) => {
    if (credentialResponse?.credential) {
      onSuccess(credentialResponse.credential);
    } else {
      if (onError) onError('No credential received from Google.');
    }
  };

  const handleFailure = () => {
    if (!isRealClientIdConfigured) {
      setConfigNotice(true);
    }
    if (onError) {
      onError(
        !isRealClientIdConfigured
          ? 'Google Client ID is not configured in .env. Please set VITE_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID.'
          : 'Google sign-in was cancelled or failed. Please try again.'
      );
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {configNotice && (
        <div style={{
          width: '100%',
          padding: '0.75rem',
          marginBottom: '0.75rem',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          fontSize: '0.8rem',
          color: '#1e40af',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.5rem',
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Google OAuth Setup Required:</strong>
            <div style={{ marginTop: '2px' }}>
              Add <code>VITE_GOOGLE_CLIENT_ID</code> to frontend <code>.env</code> and <code>GOOGLE_CLIENT_ID</code> to backend <code>.env</code> to activate live Google authentication.
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
};

export default GoogleSignInButton;
