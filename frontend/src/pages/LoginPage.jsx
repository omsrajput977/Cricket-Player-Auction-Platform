import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Trophy, Shield, KeyRound, Mail, User, AlertCircle } from 'lucide-react';

export const LoginPage = ({ onLoginSuccess }) => {
  const { login, registerAdmin } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegistering) {
        await registerAdmin(formData.name, formData.email, formData.password);
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
            Sign in to access your franchise bidding desk or organizer console
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel-glow rounded-2xl p-8 border border-stadium-border/80">
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
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
              className="w-full py-3 rounded-xl font-extrabold text-sm bg-gradient-to-r from-cricket-cyan to-emerald-400 text-slate-950 hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 mt-2"
            >
              {loading ? 'Authenticating...' : isRegistering ? 'Create Admin Account' : 'Sign In to Live Room'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
