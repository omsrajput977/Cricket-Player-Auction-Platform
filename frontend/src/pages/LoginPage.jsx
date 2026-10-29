import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import {
  Trophy,
  Mail,
  User,
  AlertCircle,
  Lock,
  GraduationCap,
  KeyRound,
} from 'lucide-react';

export const LoginPage = ({ onLoginSuccess, redirectMessage }) => {
  const { login, registerAdmin } = useAuth();

  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    adminSecretKey: '',
  });

  const [googleClientId, setGoogleClientId] = useState(
    import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
  );
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch server Google OAuth config on mount
  useEffect(() => {
    let isMounted = true;
    const fetchConfig = async () => {
      try {
        const res = await apiRequest('/auth/google/config');
        if (isMounted && res.success && res.data?.clientId) {
          setGoogleClientId(res.data.clientId);
        }
      } catch (err) {
        // Retain fallback client ID if present
      }
    };
    fetchConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle click on "Continue with Google"
  const handleGoogleRedirect = () => {
    const clientId = (googleClientId || import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

    if (!clientId) {
      setError(
        'Google Sign-In is not configured on the server. Please set GOOGLE_CLIENT_ID in backend/.env.'
      );
      return;
    }

    setLoading(true);
    setError(null);

    const redirectUri = window.location.origin + '/auth/callback';
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=openid%20email%20profile&access_type=offline&prompt=select_account`;

    // Redirect to Google's official account login / authorization page
    window.location.href = googleAuthUrl;
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
                Student & Spectator Access
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Sign in with your verified college Google account to view live auctions
              </p>
            </div>

            {/* Official Google Sign-In Button */}
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

            <p className="text-[11px] text-slate-500 text-center mt-2.5">
              Redirects to Google Authentication. Only genuine school domain emails (e.g.{' '}
              <span className="text-cricket-cyan font-mono font-bold">@sst.scaler.com</span>) are granted access.
            </p>
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
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
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
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
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
    </div>
  );
};
