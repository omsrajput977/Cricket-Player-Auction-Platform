import React, { useState } from 'react';
import { Trophy, Upload, User, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export const PublicRegistrationPage = ({ tournaments, activeTournament, setActiveTournament, onSuccessRedirect }) => {
  const [formData, setFormData] = useState({
    name: '',
    rollNumber: '',
    department: 'Computer Science',
    year: '3rd Year',
    contactNumber: '',
    role: 'ALL_ROUNDER',
    battingStyle: 'RIGHT_HAND',
    bowlingStyle: 'RIGHT_ARM_FAST',
    matchesPlayed: '10',
    runsScored: '250',
    battingAverage: '35',
    strikeRate: '140',
    wicketsTaken: '12',
    bowlingEconomy: '7.2',
    basePrice: '50000',
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ error: null, success: null });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFeedback({ error: 'Photo file size exceeds 5MB limit.', success: null });
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ error: null, success: null });

    if (!activeTournament?._id) {
      setFeedback({ error: 'Please select a tournament to register for.', success: null });
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append('tournamentId', activeTournament._id);
      data.append('name', formData.name);
      data.append('rollNumber', formData.rollNumber);
      data.append('department', formData.department);
      data.append('year', formData.year);
      data.append('contactNumber', formData.contactNumber);
      data.append('role', formData.role);
      data.append('battingStyle', formData.battingStyle);
      data.append('bowlingStyle', formData.bowlingStyle);
      data.append('basePrice', formData.basePrice);

      const statsObj = {
        matchesPlayed: Number(formData.matchesPlayed) || 0,
        runsScored: Number(formData.runsScored) || 0,
        battingAverage: Number(formData.battingAverage) || 0,
        strikeRate: Number(formData.strikeRate) || 0,
        wicketsTaken: Number(formData.wicketsTaken) || 0,
        bowlingEconomy: Number(formData.bowlingEconomy) || 0,
      };
      data.append('stats', JSON.stringify(statsObj));

      if (photoFile) {
        data.append('photo', photoFile);
      }

      const response = await fetch('/api/public/players/register', {
        method: 'POST',
        body: data,
      });

      const res = await response.json();

      if (!response.ok || !res.success) {
        throw new Error(res.message || 'Registration failed');
      }

      setFeedback({ success: res.data, error: null });
    } catch (err) {
      setFeedback({ error: err.message, success: null });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-3 shadow-xl shadow-cyan-500/20 mb-3">
          <Trophy className="w-8 h-8 text-slate-950 stroke-[2.5]" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Player Nomination Form
        </h1>
        <p className="text-sm text-slate-400 mt-1 max-w-lg mx-auto">
          Submit your player credentials for the college tournament cricket auction. All submissions undergo organizer verification.
        </p>
      </div>

      {/* Success State */}
      {feedback.success ? (
        <div className="glass-panel-glow p-8 rounded-2xl border border-emerald-500/40 text-center max-w-lg mx-auto space-y-6 animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-white">Nomination Submitted!</h2>
            <p className="text-xs text-slate-400 mt-1">
              Your registration has been queued for verification by the tournament organizers.
            </p>
          </div>

          <div className="bg-stadium-surface p-4 rounded-xl border border-stadium-border text-left space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Player Name:</span>
              <span className="font-bold text-white">{feedback.success.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Roll Number:</span>
              <span className="font-mono font-bold text-cricket-cyan">{feedback.success.rollNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Playing Role:</span>
              <span className="font-bold text-slate-200">{feedback.success.role.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status:</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                PENDING APPROVAL
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setFeedback({ success: null, error: null });
                setPhotoFile(null);
                setPhotoPreview(null);
              }}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-stadium-surface hover:bg-slate-700 text-slate-300 transition-all border border-stadium-border"
            >
              Submit Another Player
            </button>
            {onSuccessRedirect && (
              <button
                onClick={onSuccessRedirect}
                className="flex-1 py-2.5 rounded-xl text-xs font-extrabold bg-cricket-cyan hover:bg-cyan-400 text-slate-950 transition-all shadow-md shadow-cyan-950 flex items-center justify-center gap-1.5"
              >
                <span>Check Status</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="glass-panel p-6 sm:p-8 rounded-2xl border border-stadium-border/80 space-y-6">
          {/* Tournament Picker */}
          {tournaments && tournaments.length > 0 && (
            <div className="p-4 rounded-xl bg-stadium-surface/40 border border-stadium-border flex items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase font-bold text-slate-400 block">Selected Tournament</span>
                <span className="font-extrabold text-white text-base">{activeTournament?.name}</span>
              </div>
              <select
                value={activeTournament?._id || ''}
                onChange={(e) => {
                  const t = tournaments.find((x) => x._id === e.target.value);
                  if (t) setActiveTournament(t);
                }}
                className="bg-stadium-card border border-stadium-border text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-cricket-cyan"
              >
                {tournaments.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} ({t.edition})
                  </option>
                ))}
              </select>
            </div>
          )}

          {feedback.error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-semibold text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{feedback.error}</span>
            </div>
          )}

          {/* Personal & College Credentials */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-cricket-cyan flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>1. Student Credentials</span>
            </h3>

            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jasprit Singh"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-stadium-surface border border-stadium-border text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-cricket-cyan"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">College Roll Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS23-45"
                  value={formData.rollNumber}
                  onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                  className="w-full bg-stadium-surface border border-stadium-border text-white uppercase rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-cricket-cyan font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Department *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Computer Science & Engg"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full bg-stadium-surface border border-stadium-border text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-cricket-cyan"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Year of Study *</label>
                <select
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  className="w-full bg-stadium-surface border border-stadium-border text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-cricket-cyan"
                >
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year / Final">4th Year / Final</option>
                  <option value="Postgraduate">Postgraduate</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Contact Phone Number</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                  className="w-full bg-stadium-surface border border-stadium-border text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-cricket-cyan"
                />
              </div>
            </div>
          </div>

          {/* Playing Role & Styles */}
          <div className="space-y-4 pt-4 border-t border-stadium-border/60">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-cricket-gold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span>2. Cricket Playing Profile</span>
            </h3>

            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Primary Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-stadium-surface border border-stadium-border text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-cricket-gold"
                >
                  <option value="TOP_ORDER_BATTER">Top-Order Batter</option>
                  <option value="MIDDLE_ORDER_BATTER">Middle-Order Batter</option>
                  <option value="WICKETKEEPER_BATTER">Wicketkeeper-Batter</option>
                  <option value="PACE_BOWLER">Pace Bowler</option>
                  <option value="SPIN_BOWLER">Spin Bowler</option>
                  <option value="ALL_ROUNDER">All-Rounder</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Batting Style</label>
                <select
                  value={formData.battingStyle}
                  onChange={(e) => setFormData({ ...formData, battingStyle: e.target.value })}
                  className="w-full bg-stadium-surface border border-stadium-border text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-cricket-gold"
                >
                  <option value="RIGHT_HAND">Right-Hand Bat</option>
                  <option value="LEFT_HAND">Left-Hand Bat</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Bowling Style</label>
                <select
                  value={formData.bowlingStyle}
                  onChange={(e) => setFormData({ ...formData, bowlingStyle: e.target.value })}
                  className="w-full bg-stadium-surface border border-stadium-border text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-cricket-gold"
                >
                  <option value="NONE">None / Pure Batter</option>
                  <option value="RIGHT_ARM_FAST">Right-Arm Fast</option>
                  <option value="LEFT_ARM_FAST">Left-Arm Fast</option>
                  <option value="RIGHT_ARM_SPIN">Right-Arm Spin</option>
                  <option value="LEFT_ARM_SPIN">Left-Arm Spin</option>
                </select>
              </div>
            </div>

            {/* Match Stats */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Matches</label>
                <input
                  type="number"
                  value={formData.matchesPlayed}
                  onChange={(e) => setFormData({ ...formData, matchesPlayed: e.target.value })}
                  className="w-full bg-stadium-surface border border-stadium-border text-white rounded-lg px-2 py-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Runs</label>
                <input
                  type="number"
                  value={formData.runsScored}
                  onChange={(e) => setFormData({ ...formData, runsScored: e.target.value })}
                  className="w-full bg-stadium-surface border border-stadium-border text-white rounded-lg px-2 py-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Avg</label>
                <input
                  type="number"
                  value={formData.battingAverage}
                  onChange={(e) => setFormData({ ...formData, battingAverage: e.target.value })}
                  className="w-full bg-stadium-surface border border-stadium-border text-white rounded-lg px-2 py-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">SR</label>
                <input
                  type="number"
                  value={formData.strikeRate}
                  onChange={(e) => setFormData({ ...formData, strikeRate: e.target.value })}
                  className="w-full bg-stadium-surface border border-stadium-border text-white rounded-lg px-2 py-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Wickets</label>
                <input
                  type="number"
                  value={formData.wicketsTaken}
                  onChange={(e) => setFormData({ ...formData, wicketsTaken: e.target.value })}
                  className="w-full bg-stadium-surface border border-stadium-border text-white rounded-lg px-2 py-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Economy</label>
                <input
                  type="number"
                  value={formData.bowlingEconomy}
                  onChange={(e) => setFormData({ ...formData, bowlingEconomy: e.target.value })}
                  className="w-full bg-stadium-surface border border-stadium-border text-white rounded-lg px-2 py-1.5 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Photo Upload & Base Price */}
          <div className="space-y-4 pt-4 border-t border-stadium-border/60">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <Upload className="w-4 h-4" />
              <span>3. Photo & Base Valuation</span>
            </h3>

            <div className="grid sm:grid-cols-2 gap-6 items-center">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                  Profile Photo (Cloudinary CDN)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-stadium-surface file:text-cricket-cyan hover:file:bg-slate-700 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500 mt-1">Accepts JPG, PNG, WEBP up to 5MB.</p>
              </div>

              {photoPreview && (
                <div className="flex items-center gap-3 bg-stadium-surface p-3 rounded-xl border border-stadium-border">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-16 h-16 rounded-lg object-cover border border-cricket-cyan/40"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">Preview Loaded</span>
                    <span className="text-[11px] text-slate-400">Ready for CDN upload</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl font-extrabold text-base bg-gradient-to-r from-cricket-cyan via-emerald-400 to-emerald-500 text-slate-950 hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-cyan-500/20 disabled:opacity-50"
          >
            {loading ? 'Submitting Nomination...' : 'Submit Player Registration'}
          </button>
        </form>
      )}
    </div>
  );
};
