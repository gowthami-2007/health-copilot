import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  Mail,
  ArrowRight,
  HeartPulse,
  RefreshCw,
  KeyRound,
} from 'lucide-react';
import useAuth from '../hooks/useAuth';
import Button from '../components/common/Button';
import ErrorMessage from '../components/common/ErrorMessage';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';

  const [code, setCode] = useState('');
  const [email, setEmail] = useState(emailParam);
  const [status, setStatus] = useState(tokenParam ? 'verifying' : 'idle'); // 'verifying' | 'success' | 'error' | 'idle'
  const [message, setMessage] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendNotice, setResendNotice] = useState('');

  const { verifyEmail, resendVerification } = useAuth();
  const navigate = useNavigate();

  // Automatic token verification if token was in URL query string
  useEffect(() => {
    let isMounted = true;

    if (tokenParam) {
      setStatus('verifying');
      verifyEmail({ token: tokenParam, email: emailParam })
        .then((res) => {
          if (isMounted) {
            setStatus('success');
            setMessage(res?.message || 'Email verified successfully! Your account is active.');
          }
        })
        .catch((err) => {
          if (isMounted) {
            setStatus('error');
            setMessage(
              err.message ||
                "We couldn't verify this email address. The link may have expired or already been used."
            );
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [tokenParam, emailParam, verifyEmail]);

  const handleManualCodeSubmit = async (e) => {
    e.preventDefault();
    if (!code || code.trim().length !== 6) {
      setMessage('Please enter a 6-digit numeric verification code.');
      setStatus('error');
      return;
    }
    if (!email.trim()) {
      setMessage('Please provide the email address associated with your account.');
      setStatus('error');
      return;
    }

    try {
      setStatus('verifying');
      setMessage('');
      const res = await verifyEmail({ code: code.trim(), email: email.trim() });
      setStatus('success');
      setMessage(res?.message || 'Email verified successfully!');
    } catch (err) {
      setStatus('error');
      setMessage(err.message || "We couldn't verify this email address. Please check your code or request a new one.");
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setMessage('Please enter your email address to request a new verification link.');
      return;
    }

    try {
      setIsResending(true);
      setResendNotice('');
      const res = await resendVerification(email.trim());
      setResendNotice(res.message || 'A fresh verification email has been sent. Please check your inbox.');
    } catch (err) {
      setMessage(err.message || 'Failed to resend verification email.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '2rem 1rem',
      background: 'radial-gradient(circle at top, #e0f2fe 0%, #f8fafc 50%)',
    }}>
      <div style={{ width: '100%', maxWidth: '460px' }} className="animate-fade-in">
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)',
              color: 'white',
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
            }}>
              <HeartPulse size={26} />
            </div>
            <span style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Health<span style={{ color: 'var(--primary)' }}>Copilot</span>
            </span>
          </Link>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Email Verification</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Verify your mailbox to activate private health repository encryption
          </p>
        </div>

        {/* Verification Card */}
        <div className="card" style={{ padding: '2.5rem 2rem', backgroundColor: '#ffffff', boxShadow: 'var(--shadow-lg)' }}>
          {status === 'verifying' && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                border: '4px solid #e0f2fe',
                borderTopColor: '#0284c7',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1.25rem auto',
              }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Verifying Your Email...
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Validating cryptographic token with the server. Please wait a moment.
              </p>
            </div>
          )}

          {status === 'success' && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem auto',
              }}>
                <CheckCircle2 size={36} />
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#065f46', marginBottom: '0.5rem' }}>
                Verification Successful!
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                {message || 'Your email has been verified. You can now access your encrypted medical documents and AI Copilot.'}
              </p>
              <Button
                variant="primary"
                size="lg"
                style={{ width: '100%' }}
                onClick={() => navigate('/dashboard', { replace: true })}
              >
                Go to Dashboard <ArrowRight size={18} />
              </Button>
            </div>
          )}

          {(status === 'error' || status === 'idle') && (
            <div>
              {status === 'error' && (
                <div style={{
                  padding: '1rem',
                  marginBottom: '1.25rem',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#991b1b',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.65rem',
                }}>
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>Verification Failed:</strong>
                    <div style={{ marginTop: '2px' }}>{message}</div>
                  </div>
                </div>
              )}

              {resendNotice && (
                <div style={{
                  padding: '0.85rem 1rem',
                  marginBottom: '1.25rem',
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: '8px',
                  color: '#065f46',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <CheckCircle2 size={16} />
                  <span>{resendNotice}</span>
                </div>
              )}

              <form onSubmit={handleManualCodeSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="verify-email-input">Your Account Email</label>
                  <div style={{ position: 'relative' }}>
                    <Mail
                      size={18}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-subtle)'
                      }}
                    />
                    <input
                      id="verify-email-input"
                      type="email"
                      className="form-input"
                      style={{ paddingLeft: '2.5rem' }}
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label" htmlFor="verify-code-input">6-Digit Verification Code</label>
                  <div style={{ position: 'relative' }}>
                    <KeyRound
                      size={18}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-subtle)'
                      }}
                    />
                    <input
                      id="verify-code-input"
                      type="text"
                      className="form-input"
                      style={{
                        paddingLeft: '2.5rem',
                        fontSize: '1.2rem',
                        letterSpacing: '4px',
                        fontWeight: 700,
                      }}
                      placeholder="123456"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                      required
                    />
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', marginTop: '0.35rem' }}>
                    Check your email inbox or spam folder for your 6-digit confirmation code.
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  style={{ width: '100%', marginBottom: '0.75rem' }}
                >
                  Confirm Verification <ArrowRight size={18} />
                </Button>
              </form>

              <div style={{
                marginTop: '1.25rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.85rem',
              }}>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <RefreshCw size={13} className={isResending ? 'spin' : ''} />
                  {isResending ? 'Sending...' : 'Resend Email'}
                </button>
                <Link to="/login" style={{ fontWeight: 600 }}>Back to Sign In</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
