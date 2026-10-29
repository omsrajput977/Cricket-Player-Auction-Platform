import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { useSocket } from './context/SocketContext';
import { apiRequest } from './utils/api';
import { Navbar } from './components/Navbar';
import { LiveRoomPage } from './pages/LiveRoomPage';
import { AdminSetupPage } from './pages/AdminSetupPage';
import { LoginPage } from './pages/LoginPage';
import { PublicRegistrationPage } from './pages/PublicRegistrationPage';
import { PublicLookupPage } from './pages/PublicLookupPage';
import { Trophy, Loader2 } from 'lucide-react';

export default function App() {
  const { user, loading: authLoading, loginWithGoogle } = useAuth();
  const { socket } = useSocket();

  // State-based view routing with path sync
  const [activeView, setActiveView] = useState(() => {
    const path = window.location.pathname;
    if (path === '/auction/live' || path === '/auction') return 'live-room';
    if (path === '/admin') return 'admin-setup';
    if (path === '/nominate') return 'nominate';
    if (path === '/lookup') return 'lookup';
    if (path === '/login') return 'login';
    return 'live-room';
  });

  const [tournaments, setTournaments] = useState([]);
  const [activeTournament, setActiveTournament] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loginRedirectMessage, setLoginRedirectMessage] = useState(null);
  const [googleProcessing, setGoogleProcessing] = useState(false);

  // Handle Google OAuth 2.0 Authorization Code Redirect Callback
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const code = query.get('code');
    const authError = query.get('error');

    if (authError) {
      setLoginRedirectMessage(`Google authentication cancelled or failed (${authError}).`);
      setActiveView('login');
      window.history.replaceState(null, '', '/login');
      return;
    }

    if (code) {
      setGoogleProcessing(true);
      const redirectUri = window.location.origin + '/auth/callback';
      loginWithGoogle({ code, redirectUri })
        .then(() => {
          setLoginRedirectMessage(null);
          window.history.replaceState(null, '', '/auction/live');
          setActiveView('live-room');
        })
        .catch((err) => {
          console.error('Google OAuth exchange error:', err);
          setLoginRedirectMessage(err.message || 'Failed to authenticate with your Google account.');
          window.history.replaceState(null, '', '/login');
          setActiveView('login');
        })
        .finally(() => {
          setGoogleProcessing(false);
        });
    }
  }, [loginWithGoogle]);

  // Load Tournaments dynamically based on authenticated user's college email domain
  const loadTournaments = useCallback(async () => {
    try {
      const res = await apiRequest('/tournaments');
      if (res.success && Array.isArray(res.data)) {
        setTournaments(res.data);
        setActiveTournament((prev) => {
          // If current selection is still in the authorized tournament list, keep it
          if (prev && res.data.some((t) => t._id === prev._id)) {
            return res.data.find((t) => t._id === prev._id);
          }
          // Otherwise pick the first authorized tournament (or null if none)
          return res.data.length > 0 ? res.data[0] : null;
        });
      }
    } catch (err) {
      console.error('Failed to load tournaments:', err.message);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  // Reload tournaments whenever user auth state changes (login, logout, account switch)
  useEffect(() => {
    loadTournaments();
  }, [user, loadTournaments]);

  // Route Protection: Ensure /auction/live strictly requires authentication
  // Redirect unauthenticated users with college email sign-in toast
  useEffect(() => {
    if (authLoading || googleProcessing) return;

    const isLiveRoute = activeView === 'live-room' || window.location.pathname === '/auction/live';
    if (isLiveRoute && !user) {
      setLoginRedirectMessage('Please sign in with your college email to view this auction.');
      setActiveView('login');
      if (window.location.pathname !== '/login') {
        window.history.replaceState(null, '', '/login');
      }
    }
  }, [activeView, user, authLoading, googleProcessing]);

  // Sync browser URL with active view
  const handleViewChange = (view) => {
    if (view === 'live-room' && !user) {
      setLoginRedirectMessage('Please sign in with your college email to view this auction.');
      setActiveView('login');
      window.history.pushState(null, '', '/login');
      return;
    }

    setLoginRedirectMessage(null);
    setActiveView(view);
    const targetPath =
      view === 'live-room'
        ? '/auction/live'
        : view === 'admin-setup'
        ? '/admin'
        : `/${view}`;
    window.history.pushState(null, '', targetPath);
  };

  // Real-time synchronization of tournament status changes across all clients
  useEffect(() => {
    if (!socket) return;
    const handleStatusUpdate = ({ tournamentId, status, tournament }) => {
      setTournaments((prev) =>
        prev.map((t) => (t._id === tournamentId ? { ...t, status, ...(tournament || {}) } : t))
      );
      setActiveTournament((prev) => {
        if (prev && prev._id === tournamentId) {
          return { ...prev, status, ...(tournament || {}) };
        }
        return prev;
      });
    };
    socket.on('TOURNAMENT_STATUS_UPDATED', handleStatusUpdate);
    return () => socket.off('TOURNAMENT_STATUS_UPDATED', handleStatusUpdate);
  }, [socket]);

  // Full-screen loader during Google OAuth Code Verification
  if (googleProcessing) {
    return (
      <div className="min-h-screen bg-stadium-darkest text-slate-100 flex items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-2xl border border-cricket-cyan/40 shadow-2xl text-center max-w-md w-full space-y-4 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-3 shadow-xl shadow-cyan-500/20 mx-auto flex items-center justify-center">
            <Trophy className="w-10 h-10 text-slate-950 stroke-[2.5]" />
          </div>
          <div className="flex items-center justify-center gap-2 text-cricket-cyan">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-extrabold text-sm uppercase tracking-wider">Verifying Google Account</span>
          </div>
          <p className="text-xs text-slate-400">
            Securely exchanging Google authentication tokens and verifying your collegiate domain...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stadium-darkest text-slate-100 flex flex-col">
      <Navbar
        activeView={activeView}
        setActiveView={handleViewChange}
        tournaments={tournaments}
        activeTournament={activeTournament}
        setActiveTournament={setActiveTournament}
      />

      <main className="flex-1">
        {activeView === 'login' ? (
          <LoginPage
            redirectMessage={loginRedirectMessage}
            onLoginSuccess={() => {
              setLoginRedirectMessage(null);
              handleViewChange('live-room');
            }}
          />
        ) : activeView === 'nominate' ? (
          <PublicRegistrationPage
            tournaments={tournaments}
            activeTournament={activeTournament}
            setActiveTournament={setActiveTournament}
            onSuccessRedirect={() => handleViewChange('lookup')}
          />
        ) : activeView === 'lookup' ? (
          <PublicLookupPage
            tournaments={tournaments}
            activeTournament={activeTournament}
            setActiveTournament={setActiveTournament}
          />
        ) : activeView === 'admin-setup' ? (
          <AdminSetupPage
            activeTournament={activeTournament}
            setActiveTournament={setActiveTournament}
            setActiveView={handleViewChange}
            onTournamentCreated={(newTourney) => {
              setTournaments((prev) => [newTourney, ...prev]);
              setActiveTournament(newTourney);
            }}
          />
        ) : (
          <LiveRoomPage
            activeTournament={activeTournament}
            setActiveTournament={setActiveTournament}
            setActiveView={handleViewChange}
          />
        )}
      </main>

      <footer className="glass-panel border-t border-stadium-border/60 py-4 px-6 text-center text-xs text-slate-500">
        <p>
          CricAuction Live Engine • Multi-Tenant Collegiate Cricket Player Auction Platform
        </p>
      </footer>
    </div>
  );
}
