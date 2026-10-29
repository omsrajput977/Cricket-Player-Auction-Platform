import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import {
  Trophy,
  Shield,
  KeyRound,
  Mail,
  User,
  AlertCircle,
  Lock,
  GraduationCap,
  ExternalLink,
  HelpCircle,
  X,
  CheckCircle2,
  ArrowRight,
  Send,
  Sparkles,
} from 'lucide-react';

export const LoginPage = ({ onLoginSuccess, redirectMessage }) => {
  const {
    login,
    registerAdmin,
    loginWithGoogle,
    sendSchoolEmailCode,
    verifySchoolEmailCode,
  } = useAuth();

  const [authMode, setAuthMode] = useState('google'); // 'google' | 'otp'
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    adminSecretKey: '',
  });

  // School Email OTP verification state
  const [schoolEmail, setSchoolEmail] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [demoPasscode, setDemoPasscode] = useState(null);

  // Google OAuth state
  const [googleClientId, setGoogleClientId] = useState(
    import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
  );
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customClientIdInput, setCustomClientIdInput] = useState('');
  const [configModalError, setConfigModalError] = useState(null);

  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch server Google OAuth config on mount
  useEffect(() => {
    let isMounted = true;
    const fetchConfig = async () => {
      try {
        const res = await apiRequest('/auth/google/config');
        if (isMounted && res.success && res.data) {
          if (res.data.clientId) {
            setGoogleClientId(res.data.clientId);
          } else if (import.meta.env.VITE_GOOGLE_CLIENT_ID) {
            setGoogleClientId(import.meta.env.VITE_GOOGLE_CLIENT_ID);
          }
        }
      } catch (err) {
        if (import.meta.env.VITE_GOOGLE_CLIENT_ID) {
          setGoogleClientId(import.meta.env.VITE_GOOGLE_CLIENT_ID);
        }
      }
    };
    fetchConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle click on "Continue with Google"
  const handleGoogleRedirect = () => {
    // Validate that client ID is properly configured and matches Google's standard format
    if (
      !googleClientId ||
      !googleClientId.trim().includes('.apps.googleusercontent.com')
    ) {
      setShowConfigModal(true);
      return;
    }

    setLoading(true);
    setError(null);

    const redirectUri = window.location.origin + '/auth/callback';
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      googleClientId.trim()
    )}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=openid%20email%20profile&access_type=offline&prompt=select_account`;

    // Redirect browser to Google's official account chooser / sign-in screen
    window.location.href = googleAuthUrl;
  };

  // Save Google Client ID via API
  const handleSaveGoogleClientId = async () => {
    const trimmed = customClientIdInput.trim();
    if (!trimmed.includes('.apps.googleusercontent.com')) {
      setConfigModalError(
        'Invalid Client ID. A Google OAuth Client ID must end with ".apps.googleusercontent.com" (e.g. 1234567890-abcdef.apps.googleusercontent.com). Do not enter project names or IDs.'
      );
      return;
    }

    setConfigModalError(null);
    setLoading(true);
    try {
      const res = await apiRequest('/auth/google/config', {
        method: 'POST',
        body: { clientId: trimmed },
      });
      if (res.success) {
        setGoogleClientId(trimmed);
        setShowConfigModal(false);
        // Trigger redirect immediately to Google
        const redirectUri = window.location.origin + '/auth/callback';
        window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
          trimmed
        )}&redirect_uri=${encodeURIComponent(
          redirectUri
        )}&response_type=code&scope=openid%20email%20profile&access_type=offline&prompt=select_account`;
      }
    } catch (err) {
      setConfigModalError(err.message || 'Failed to update Google Client ID on server.');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Send School Email OTP Passcode
  const handleSendSchoolCode = async (e) => {
    e.preventDefault();
    if (!schoolEmail || !schoolEmail.includes('@')) {
      return setError('Please enter a valid school email address (e.g. om.25bcs10039@sst.scaler.com)');
    }
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = await sendSchoolEmailCode(schoolEmail);
      if (res.success) {
        setOtpSent(true);
        if (res.verificationCode) {
          setDemoPasscode(res.verificationCode);
        }
        setSuccessMsg(`Verification passcode generated for ${schoolEmail}!`);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify School Email OTP Passcode
  const handleVerifySchoolCode = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length < 6) {
      return setError('Please enter the 6-digit verification code.');
    }
    setError(null);
    setLoading(true);
    try {
      await verifySchoolEmailCode(schoolEmail, otpCode.trim(), schoolName);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setError(err.message || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  // Admin / Team Owner standard login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegistering) {
        await registerAdmin(
          formData.name,
          formData.email,
          formData.password,
          formData.adminSecretKey
        );
      } else {
        await login(formData.email, formData.password);
      }
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-3 shadow-xl shadow-cyan-500/20 mb-4">
            <Trophy className="w-10 h-10 text-slate-950 stroke-[2.5]" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            CRIC<span className="text-cricket-cyan">AUCTION</span> LIVE
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Collegiate Cricket Auction • Multi-Tenant Isolated Arenas
          </p>
        </div>

        {/* Redirect Notice Toast */}
        {redirectMessage && (
          <div className="mb-4 flex items-center gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-300 shadow-lg shadow-amber-950/20 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <span>{redirectMessage}</span>
          </div>
        )}

        {/* Card */}
        <div className="glass-panel-glow rounded-2xl p-8 border border-stadium-border/80">
          {/* Spectator Student Access Section */}
          <div className="mb-6">
            <div className="text-center mb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center justify-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-cricket-cyan" />
                Verified Student Access
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Authenticate with your school credentials (e.g.{' '}
                <span className="text-cricket-cyan font-mono font-bold">@sst.scaler.com</span>)
              </p>
            </div>

            {/* Verification Mode Toggle */}
            <div className="flex rounded-lg bg-stadium-surface p-1 mb-3.5 border border-stadium-border text-xs">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('google');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-1.5 font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  authMode === 'google'
                    ? 'bg-cricket-cyan text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Google OAuth</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('otp');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-1.5 font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  authMode === 'otp'
                    ? 'bg-cricket-cyan text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>School Email Passcode</span>
              </button>
            </div>

            {/* Mode 1: Google OAuth Redirect */}
            {authMode === 'google' && (
              <div>
                <button
                  type="button"
                  id="google-signin-btn"
                  onClick={handleGoogleRedirect}
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-white hover:bg-slate-100 text-slate-900 flex items-center justify-center gap-3 transition-all shadow-lg shadow-white/10 active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{loading ? 'Connecting to Google...' : 'Continue with Google'}</span>
                </button>
                <p className="text-[10px] text-slate-500 text-center mt-2">
                  Redirects to accounts.google.com. Requires a valid Google OAuth Client ID.
                </p>
              </div>
            )}

            {/* Mode 2: School Email Passcode Verification */}
            {authMode === 'otp' && (
              <div className="p-3.5 rounded-xl bg-stadium-surface border border-cricket-cyan/30 space-y-3 animate-fade-in">
                {!otpSent ? (
                  <form onSubmit={handleSendSchoolCode} className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                        Your School Email Address
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. om.25bcs10039@sst.scaler.com"
                        value={schoolEmail}
                        onChange={(e) => setSchoolEmail(e.target.value)}
                        className="w-full bg-stadium-dark border border-stadium-border text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-cricket-cyan font-mono"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2 rounded-lg font-bold text-xs bg-cricket-cyan text-slate-950 hover:bg-cyan-400 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{loading ? 'Generating Code...' : 'Send Verification Passcode'}</span>
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifySchoolCode} className="space-y-3">
                    <div className="text-xs text-slate-300">
                      <span>Passcode sent for: </span>
                      <strong className="text-cricket-cyan font-mono">{schoolEmail}</strong>
                    </div>

                    {demoPasscode && (
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                        <div className="font-semibold text-[11px] text-slate-300 mb-0.5">
                          Verification Passcode:
                        </div>
                        <div className="font-mono text-base font-black tracking-widest text-emerald-400 select-all">
                          {demoPasscode}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                        Enter 6-Digit Passcode
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        placeholder="123456"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-stadium-dark border border-cricket-cyan/60 text-white text-center text-lg tracking-widest font-mono rounded-lg px-3 py-2 focus:outline-none focus:border-cricket-cyan"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setDemoPasscode(null);
                        }}
                        className="py-2 px-3 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-2 rounded-lg font-bold text-xs bg-cricket-cyan text-slate-950 hover:bg-cyan-400 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{loading ? 'Verifying...' : 'Verify & Enter Live Auction'}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="relative flex py-2 items-center mb-6">
            <div className="flex-grow border-t border-stadium-border"></div>
            <span className="flex-shrink mx-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              OR ORGANIZER / OWNER LOGIN
            </span>
            <div className="flex-grow border-t border-stadium-border"></div>
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl bg-stadium-dark p-1 mb-6 border border-stadium-border">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(false);
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                !isRegistering
                  ? 'bg-cricket-cyan text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In (Admin / Owner)
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegistering(true);
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                isRegistering
                  ? 'bg-cricket-cyan text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Register Admin
            </button>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-semibold text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      placeholder="Tournament Organizer"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-stadium-surface border border-stadium-border text-white text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-cricket-cyan"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-cricket-gold">
                      Organizer Security Passcode
                    </label>
                    <span className="text-[10px] text-slate-400 font-semibold">Faculty / Committee Only</span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-cricket-gold absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      required
                      placeholder="Enter committee master key"
                      value={formData.adminSecretKey}
                      onChange={(e) => setFormData({ ...formData, adminSecretKey: e.target.value })}
                      className="w-full bg-stadium-surface border border-cricket-gold/40 text-white text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-cricket-gold shadow-sm shadow-amber-950/20"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Protects the tournament against unauthorized registrations. Default:{' '}
                    <code className="text-cricket-gold font-mono">CRIC_ADMIN_2026</code>
                  </p>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="owner@csk.com or admin@college.edu"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-stadium-surface border border-stadium-border text-white text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-cricket-cyan"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-stadium-surface border border-stadium-border text-white text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-cricket-cyan"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-extrabold text-sm bg-gradient-to-r from-cricket-cyan to-emerald-400 text-slate-950 hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 mt-2 cursor-pointer"
            >
              {loading ? 'Authenticating...' : isRegistering ? 'Create Admin Account' : 'Sign In to Franchise Desk'}
            </button>
          </form>
        </div>
      </div>

      {/* Google OAuth Setup Helper Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 sm:p-8 rounded-2xl max-w-lg w-full border border-cricket-cyan/40 shadow-2xl space-y-4 animate-fade-in relative">
            <button
              onClick={() => {
                setShowConfigModal(false);
                setConfigModalError(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cricket-cyan/20 border border-cricket-cyan/40 flex items-center justify-center text-cricket-cyan">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-white">Google OAuth Setup Required</h3>
                <p className="text-xs text-slate-400">Why Google showed "Client missing a project id (Error 401: invalid_client)"</p>
              </div>
            </div>

            <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
                <strong>Why did Google show Error 401: invalid_client?</strong>
                <p className="mt-1 text-[11px] text-slate-300">
                  Google expects an OAuth 2.0 Client ID that ends with{' '}
                  <code className="text-cricket-cyan font-mono font-bold">.apps.googleusercontent.com</code>.
                  If you enter a project name or ID, Google does not recognize it and blocks authorization.
                </p>
              </div>

              <p className="font-semibold text-white">
                How to get your free Google OAuth Client ID in 2 minutes:
              </p>

              <ol className="list-decimal list-inside space-y-1.5 text-slate-400 pl-1">
                <li>
                  Go to{' '}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noreferrer"
                    className="text-cricket-cyan underline inline-flex items-center gap-0.5"
                  >
                    Google Cloud Console <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>Click <strong>Create Credentials</strong> &gt; <strong>OAuth Client ID</strong> &gt; <strong>Web application</strong></li>
                <li>
                  Under <strong>Authorized redirect URIs</strong>, add:
                  <div className="bg-slate-900 text-white font-mono px-2 py-1 rounded my-1 text-[11px] select-all">
                    {window.location.origin}/auth/callback
                  </div>
                </li>
                <li>
                  Copy the Client ID from Google (it ends with <code className="text-white font-mono">.apps.googleusercontent.com</code>).
                </li>
              </ol>
            </div>

            {configModalError && (
              <div className="p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-xs text-rose-300 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{configModalError}</span>
              </div>
            )}

            {/* Paste Client ID to save */}
            <div className="pt-2 border-t border-stadium-border/60">
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                Paste your Google OAuth Client ID here:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="123456789-abcdef.apps.googleusercontent.com"
                  value={customClientIdInput}
                  onChange={(e) => setCustomClientIdInput(e.target.value)}
                  className="flex-1 bg-stadium-surface border border-stadium-border rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-cricket-cyan"
                />
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSaveGoogleClientId}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-cricket-cyan text-slate-950 hover:bg-cyan-400 cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save & Login'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
