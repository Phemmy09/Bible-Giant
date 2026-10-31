import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Gamepad2,
  BookOpen,
  Users,
  Trophy,
  Shield,
  LogOut,
  Cross,
  Smartphone,
  Tv,
  QrCode,
  Zap,
  RefreshCw
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useGameStore } from '@/stores/gameStore';
import { BRAND } from '@/lib/constants';

const modules = [
  {
    title: 'Live Stage Controller',
    desc: 'Run the tournament — pick tiles, judge answers, launch timer, and control the arena',
    icon: Gamepad2,
    path: '/admin/live',
    color: 'from-afc-gold to-afc-gold-dark',
    priority: true,
  },
  {
    title: 'Question Bank',
    desc: 'Create, edit, and import questions. Manage round types, options, and gap-fill data',
    icon: BookOpen,
    path: '/admin/questions',
    color: 'from-blue-500 to-blue-700',
  },
  {
    title: 'Zones & Round Setup',
    desc: 'Configure competing zones, reset scores, manage player rosters, set topic labels',
    icon: Users,
    path: '/admin/zones',
    color: 'from-emerald-500 to-emerald-700',
  },
  {
    title: 'Grand Podium & Ceremony',
    desc: 'Reveal final rankings from 6th to 1st place with symphonic fanfare and certificates',
    icon: Trophy,
    path: '/admin/podium',
    color: 'from-amber-500 to-amber-700',
  },
  {
    title: 'Security & Settings',
    desc: 'Change master password, view detailed audit log, manage session modes',
    icon: Shield,
    path: '/admin/security',
    color: 'from-red-500 to-red-700',
  },
];

export default function AdminDashboardPage() {
  const logout = useAuthStore(s => s.logout);
  const session = useGameStore(s => s.session);
  const setEngineMode = useGameStore(s => s.setEngineMode);
  const setSessionCode = useGameStore(s => s.setSessionCode);
  const navigate = useNavigate();

  const [codeDraft, setCodeDraft] = useState(session.sessionCode || '345TWJ');

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const generateNewCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let newCode = '';
    for (let i = 0; i < 6; i++) {
      newCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCodeDraft(newCode);
    setSessionCode(newCode);
  };

  return (
    <div className="min-h-screen bg-afc-navy relative overflow-hidden text-afc-ivory">
      <div className="fixed inset-0 bg-gradient-celestial pointer-events-none" />
      <div className="bg-particles" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-gold-glow">
              <Cross className="w-6 h-6 text-afc-navy" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-cinzel text-xl font-bold text-gold-gradient">
                Quizmaster Command Portal
              </h1>
              <p className="font-outfit text-afc-ivory-muted/70 text-xs">
                {BRAND.churchName} • {BRAND.areaName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/stage"
              target="_blank"
              className="px-4 py-2 rounded-xl glass text-afc-gold font-outfit text-xs font-bold hover:border-afc-gold/40 flex items-center gap-1.5 transition-all"
            >
              <Tv className="w-4 h-4" />
              <span>Launch Stage Screen ↗</span>
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl glass text-afc-ivory-muted/70 font-outfit text-xs hover:text-afc-crimson-light hover:border-afc-crimson/30 transition-all flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        {/* Engine Mode Switch Banner (PRD Section 3.3) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 rounded-3xl border border-afc-gold/30 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-afc-gold" />
              <span className="font-cinzel text-xs font-bold uppercase tracking-wider text-afc-gold">
                Tournament Engine Mode
              </span>
            </div>
            <h3 className="font-cinzel text-lg font-bold text-white">
              {session.engineMode === 'legacy_board' ? 'Ekiti Area Legacy Pick-a-Number Board' : 'WECA Digital Live Quiz (APOQUIZ-Style)'}
            </h3>
            <p className="font-outfit text-xs text-afc-ivory-muted/70 max-w-xl mt-0.5">
              {session.engineMode === 'legacy_board'
                ? 'Standard format for Ekiti Area Inter-Zonal Bible Challenges: 16-number grid, live operator judgment, and 60s Ultimate Challenge.'
                : 'Advanced digital format: devices for each Zone podium, speed-weighted automatic scoring, and live Audience companion app with prediction.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            {/* Mode toggle button */}
            <div className="p-1 rounded-2xl bg-black/40 border border-afc-gold/30 flex items-center">
              <button
                onClick={() => setEngineMode('legacy_board')}
                className={`px-3 py-1.5 rounded-xl font-outfit text-xs font-bold transition-all ${
                  session.engineMode === 'legacy_board'
                    ? 'bg-afc-gold text-afc-navy shadow-md'
                    : 'text-afc-ivory-muted hover:text-white'
                }`}
              >
                Legacy Board
              </button>
              <button
                onClick={() => setEngineMode('digital_live')}
                className={`px-3 py-1.5 rounded-xl font-outfit text-xs font-bold transition-all ${
                  session.engineMode === 'digital_live'
                    ? 'bg-afc-gold text-afc-navy shadow-md'
                    : 'text-afc-ivory-muted hover:text-white'
                }`}
              >
                Digital Live
              </button>
            </div>

            {/* Session Code Display */}
            <div className="flex items-center gap-2 glass px-3 py-1.5 rounded-xl border border-afc-gold/20">
              <span className="text-[10px] text-afc-ivory-muted uppercase font-bold">Code:</span>
              <span className="font-mono text-sm font-black text-afc-gold">{session.sessionCode || '345TWJ'}</span>
              <button
                onClick={generateNewCode}
                title="Generate new session code"
                className="text-afc-ivory-muted hover:text-afc-gold"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((mod, i) => (
            <motion.div
              key={mod.path}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
            >
              <Link
                to={mod.path}
                className={`block admin-card p-6 h-full transition-all hover:scale-[1.02] hover:border-afc-gold/50 ${
                  mod.priority ? 'md:col-span-2 lg:col-span-1 ring-1 ring-afc-gold/20 shadow-gold-glow' : ''
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${mod.color} flex items-center justify-center mb-4 shadow-md`}>
                  <mod.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-cinzel text-afc-ivory text-base font-bold mb-2 tracking-wider">
                  {mod.title}
                </h3>
                <p className="font-outfit text-afc-ivory-muted/70 text-xs leading-relaxed">
                  {mod.desc}
                </p>
                {mod.priority && (
                  <div className="mt-4 inline-block px-3 py-1 rounded-full bg-afc-gold/10 border border-afc-gold/30">
                    <p className="font-outfit text-afc-gold text-[10px] font-bold uppercase tracking-wider">
                      Primary Live Console
                    </p>
                  </div>
                )}
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Quick Links & Connected Surfaces */}
        <div className="mt-8 glass-card p-6 rounded-3xl border border-afc-gold/20">
          <h3 className="font-cinzel text-afc-gold text-xs font-bold uppercase tracking-wider mb-4">
            Live Application Surfaces
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              to="/stage"
              target="_blank"
              className="p-3 rounded-2xl glass border border-afc-gold/20 hover:border-afc-gold flex items-center gap-3 text-left transition-all"
            >
              <Tv className="w-5 h-5 text-afc-gold" />
              <div>
                <div className="font-cinzel text-xs font-bold text-white">Stage Projector (/stage)</div>
                <div className="text-[10px] text-afc-ivory-muted/60">Main auditorium display</div>
              </div>
            </Link>

            <Link
              to={`/play?session=${session.sessionCode || '345TWJ'}`}
              target="_blank"
              className="p-3 rounded-2xl glass border border-emerald-500/20 hover:border-emerald-500 flex items-center gap-3 text-left transition-all"
            >
              <Smartphone className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="font-cinzel text-xs font-bold text-white">Team Client (/play)</div>
                <div className="text-[10px] text-afc-ivory-muted/60">Podium laptops & tablets</div>
              </div>
            </Link>

            <Link
              to={`/join?session=${session.sessionCode || '345TWJ'}`}
              target="_blank"
              className="p-3 rounded-2xl glass border border-blue-500/20 hover:border-blue-500 flex items-center gap-3 text-left transition-all"
            >
              <Users className="w-5 h-5 text-blue-400" />
              <div>
                <div className="font-cinzel text-xs font-bold text-white">Audience App (/join)</div>
                <div className="text-[10px] text-afc-ivory-muted/60">Congregational trivia & prediction</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
