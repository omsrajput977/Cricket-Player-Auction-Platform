import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useSocket } from './context/SocketContext';
import { apiRequest } from './utils/api';
import { Navbar } from './components/Navbar';
import { LiveRoomPage } from './pages/LiveRoomPage';
import { AdminSetupPage } from './pages/AdminSetupPage';
import { LoginPage } from './pages/LoginPage';
import { PublicRegistrationPage } from './pages/PublicRegistrationPage';
import { PublicLookupPage } from './pages/PublicLookupPage';

export default function App() {
  const { user, isAdmin } = useAuth();
  const { socket } = useSocket();
  const [activeView, setActiveView] = useState('live-room');
  const [tournaments, setTournaments] = useState([]);
  const [activeTournament, setActiveTournament] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Load Tournaments
  const loadTournaments = async () => {
    try {
      const res = await apiRequest('/tournaments');
      if (res.success && res.data.length > 0) {
        setTournaments(res.data);
        setActiveTournament(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to load tournaments:', err.message);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadTournaments();
  }, []);

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

  return (
    <div className="min-h-screen bg-stadium-darkest text-slate-100 flex flex-col">
      <Navbar
        activeView={activeView}
        setActiveView={setActiveView}
        tournaments={tournaments}
        activeTournament={activeTournament}
        setActiveTournament={setActiveTournament}
      />

      <main className="flex-1">
        {activeView === 'login' ? (
          <LoginPage onLoginSuccess={() => setActiveView('live-room')} />
        ) : activeView === 'nominate' ? (
          <PublicRegistrationPage
            tournaments={tournaments}
            activeTournament={activeTournament}
            setActiveTournament={setActiveTournament}
            onSuccessRedirect={() => setActiveView('lookup')}
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
            setActiveView={setActiveView}
            onTournamentCreated={(newTourney) => {
              setTournaments((prev) => [newTourney, ...prev]);
              setActiveTournament(newTourney);
            }}
          />
        ) : (
          <LiveRoomPage
            activeTournament={activeTournament}
            setActiveTournament={setActiveTournament}
            setActiveView={setActiveView}
          />
        )}
      </main>


      <footer className="glass-panel border-t border-stadium-border/60 py-4 px-6 text-center text-xs text-slate-500">
        <p>
          CricAuction Live Engine • Sub-millisecond synchronized bidding for collegiate cricket tournaments
        </p>
      </footer>
    </div>
  );
}
