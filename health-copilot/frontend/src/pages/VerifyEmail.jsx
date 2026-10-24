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
  Clock,
  ShieldCheck,
} from 'lucide-react';
import useAuth from '../hooks/useAuth';
import Button from '../components/common/Button';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';

  const [code, setCode] = useState('');
  const [email, setEmail] = useState(emailParam);
  const [status, setStatus] = useState(tokenParam ? 'verifying' : 'idle'); // 'verifying' | 'success' | 'error' | 'idle'
  const [message, setMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendNotice, setResendNotice] = useState('');
  const [countdown, setCountdown] = useState(emailParam ? 60 : 0);

  const { verifyEmail, resendVerification } = useAuth();
  const navigate = useNavigate();

  // Keep email in sync if query param changes
  useEffect(() => {
    if (emailParam && !email) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  // Countdown timer for OTP resend cooldown
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [countdown]);

  // Automatic token verification if token was in URL query string (legacy link)
  useEffect(() => {
    let isMounted = true;

    if (tokenParam) {
      setStatus('verifying');
      verifyEmail({ token: tokenParam, email: emailParam })
        .then((res) => {
          if (isMounted) {
            setStatus('success');
            setMessage(res?.message || 'Email verified successfully! Your medical vault is active.');
          }
        })
        .catch((err) => {
          if (isMounted) {
            setStatus('error');
            setMessage(
              err.message ||
                "We couldn't verify this email address. The verification code or link may have expired (5-minute limit) or already been used."
            );
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [tokenParam, emailParam, verifyEmail]);

  // Paste handler: extracts exactly 6 digits if pasted
  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text') || '';
    const digits = pasted.replace(/[^0-9]/g, '').slice(0, 6);
    if (digits) {
      e.preventDefault();
      setCode(digits);
    }
  };

  const handleManualCodeSubmit = async (e) => {
    e.preventDefault();
    const cleanCode = code.trim();
    const cleanEmail = email.trim();

    if (!cleanCode || cleanCode.length !== 6) {
      setMessage('Please enter your complete 6-digit numeric verification code.');
      setStatus('error');
      return;
    }
    if (!cleanEmail) {
      setMessage('Please provide the email address associated with your account.');
      setStatus('error');
      return;
    }

    try {
      setIsVerifying(true);
      setMessage('');
      setStatus('idle');
      const res = await verifyEmail({ code: cleanCode, email: cleanEmail });
      setStatus('success');
      setMessage(res?.message || 'Email verified successfully! Your account is active.');
    } catch (err) {
      setStatus('error');
      setMessage(
        err.message ||
          'Verification failed. The code may be incorrect, expired (5-minute limit), or already used.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || isResending) return;

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setMessage('Please enter your email address to request a new verification code.');
      setStatus('error');
      return;
    }

    try {
      setIsResending(true);
      setResendNotice('');
      const res = await resendVerification(cleanEmail);
      setCountdown(60); // 60s cooldown
      setCode('');
      setResendNotice(res?.message || 'A fresh 6-digit verification code has been dispatched to your email.');
    } catch (err) {
      setMessage(err.message || 'Failed to resend code. Please wait a moment before trying again.');
      setStatus('error');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem 1rem',
        background: 'radial-gradient(circle at top, #e0f2fe 0%, #f8fafc 50%)',
      }}
    >
      <div style={{ width: '100%', maxWidth: '460px' }} className="animate-fade-in">
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              marginBottom: '0.75rem',
            }}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)',
                color: 'white',
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
              }}
            >
              <HeartPulse size={26} />
            </div>
            <span
              style={{
                fontSize: '1.45rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                letterSpacing: '-0.02em',
              }}
            >
              Health<span style={{ color: 'var(--primary)' }}>Copilot</span>
            </span>
          </Link>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            Email OTP Verification
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Enter the 6-digit code sent to your email to activate your health vault
          </p>
        </div>

        {/* Verification Card */}
        <div
          className="card"
          style={{
            padding: '2.5rem 2rem',
            backgroundColor: '#ffffff',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {status === 'verifying' && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  border: '4px solid #e0f2fe',
                  borderTopColor: '#0284c7',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 1.25rem auto',
                }}
              />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Verifying Your Code...
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Validating cryptographic OTP and establishing secure session. Please wait.
              </p>
            </div>
          )}

          {status === 'success' && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#ecfdf5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem auto',
                }}
              >
                <CheckCircle2 size={36} />
              </div>
              <h3
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  color: '#065f46',
                  marginBottom: '0.5rem',
                }}
              >
                Verification Successful!
              </h3>
              <p
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.95rem',
                  lineHeight: 1.6,
                  marginBottom: '1.5rem',
                }}
              >
                {message ||
                  'Your email has been verified. You now have full access to your health documents, trends, and AI Copilot.'}
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
                <div
                  style={{
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
                  }}
                >
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>Verification Failed:</strong>
                    <div style={{ marginTop: '2px' }}>{message}</div>
                  </div>
                </div>
              )}

              {resendNotice && (
                <div
                  style={{
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
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>{resendNotice}</span>
                </div>
              )}

              <form onSubmit={handleManualCodeSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="verify-email-input">
                    Registered Email
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail
                      size={18}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-subtle)',
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

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.35rem',
                    }}
                  >
                    <label className="form-label" htmlFor="verify-code-input" style={{ margin: 0 }}>
                      6-Digit OTP Code
                    </label>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: '#d97706',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontWeight: 500,
                      }}
                    >
                      <Clock size={12} /> Valid for 5 minutes
                    </span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <KeyRound
                      size={18}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-subtle)',
                      }}
                    />
                    <input
                      id="verify-code-input"
                      type="text"
                      className="form-input"
                      style={{
                        paddingLeft: '2.5rem',
                        fontSize: '1.35rem',
                        letterSpacing: '6px',
                        fontWeight: 700,
                        textAlign: 'center',
                      }}
                      placeholder="••••••"
                      maxLength={6}
                      value={code}
                      onPaste={handlePaste}
                      onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                      required
                      autoFocus
                    />
                  </div>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--text-subtle)',
                      marginTop: '0.45rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <ShieldCheck size={14} color="#059669" />
                    <span>Single-use code. Maximum 5 verification attempts allowed.</span>
                  </div>
                </div>

                <Button
                  id="verify-submit-btn"
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isVerifying}
                  disabled={isVerifying || code.length !== 6}
                  style={{ width: '100%', marginBottom: '0.75rem' }}
                >
                  Verify Email & Activate <ArrowRight size={18} />
                </Button>
              </form>

              {/* Action Controls & Resend Cooldown */}
              <div
                style={{
                  marginTop: '1.25rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.85rem',
                }}
              >
                <button
                  id="resend-otp-btn"
                  type="button"
                  onClick={handleResend}
                  disabled={isResending || countdown > 0}
                  className="btn btn-secondary btn-sm"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    cursor: countdown > 0 || isResending ? 'not-allowed' : 'pointer',
                    opacity: countdown > 0 ? 0.75 : 1,
                  }}
                  title={countdown > 0 ? `Wait ${countdown}s to resend code` : 'Resend verification code'}
                >
                  <RefreshCw size={13} className={isResending ? 'spin' : ''} />
                  {isResending
                    ? 'Sending...'
                    : countdown > 0
                    ? `Resend OTP (${countdown}s)`
                    : 'Resend OTP'}
                </button>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <Link to="/register" style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    Change Email
                  </Link>
                  <span style={{ color: '#cbd5e1' }}>•</span>
                  <Link to="/login" style={{ fontWeight: 600 }}>
                    Sign In
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
