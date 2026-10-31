import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Eye, EyeOff, Lock, ScrollText, Clock, User } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useGameStore } from '@/stores/gameStore';

export default function SecurityPage() {
  const { changePassword } = useAuthStore();
  const { auditLog } = useGameStore();
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [message, setMessage] = useState('');
  const [msgType, setMsgType] = useState(''); // 'success' | 'error'

  const handleChangePassword = () => {
    if (newPwd !== confirmPwd) {
      setMessage('New passwords do not match.');
      setMsgType('error');
      return;
    }
    const result = changePassword(currentPwd, newPwd);
    setMessage(result.error || result.message || 'Done');
    setMsgType(result.success ? 'success' : 'error');
    if (result.success) {
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
    }
  };

  return (
    <div className="min-h-screen bg-afc-navy relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-celestial pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/admin" className="text-afc-ivory-muted/50 hover:text-afc-gold transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-cinzel text-xl font-bold text-gold-gradient">Security & Settings</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Change Password */}
          <div className="glass-card p-6">
            <h3 className="font-cinzel text-afc-gold text-sm tracking-wider mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4" /> Change Master Password
            </h3>

            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  placeholder="Current password"
                  className="w-full bg-afc-navy-mid/60 border border-afc-gold/20 rounded-lg px-3 py-2 text-afc-ivory font-outfit text-sm focus:border-afc-gold/50 focus:outline-none"
                />
              </div>
              <input
                type={showPwd ? 'text' : 'password'}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="New password (min 12 chars, upper, lower, number, symbol)"
                className="w-full bg-afc-navy-mid/60 border border-afc-gold/20 rounded-lg px-3 py-2 text-afc-ivory font-outfit text-sm focus:border-afc-gold/50 focus:outline-none"
              />
              <input
                type={showPwd ? 'text' : 'password'}
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="Confirm new password"
                className="w-full bg-afc-navy-mid/60 border border-afc-gold/20 rounded-lg px-3 py-2 text-afc-ivory font-outfit text-sm focus:border-afc-gold/50 focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPwd(!showPwd)}
                  className="text-afc-ivory-muted/40 hover:text-afc-gold transition-colors flex items-center gap-1 text-xs"
                >
                  {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showPwd ? 'Hide' : 'Show'}
                </button>
              </div>

              {message && (
                <p className={`font-outfit text-sm ${msgType === 'success' ? 'text-afc-emerald-light' : 'text-afc-crimson-light'}`}>
                  {message}
                </p>
              )}

              <button
                onClick={handleChangePassword}
                disabled={!currentPwd || !newPwd || !confirmPwd}
                className="w-full py-3 rounded-xl bg-gradient-gold text-afc-navy font-cinzel font-bold tracking-wider hover:shadow-gold-intense disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Change Password
              </button>
            </div>
          </div>

          {/* Audit Log */}
          <div className="glass-card p-6">
            <h3 className="font-cinzel text-afc-gold text-sm tracking-wider mb-4 flex items-center gap-2">
              <ScrollText className="w-4 h-4" /> Audit Log
            </h3>

            <div className="space-y-2 max-h-[500px] overflow-y-auto no-scrollbar">
              {auditLog.length === 0 ? (
                <p className="font-outfit text-afc-ivory-muted/20 text-sm text-center py-8">
                  No audit entries yet
                </p>
              ) : (
                auditLog.map((entry) => (
                  <div key={entry.id} className="py-2 px-3 rounded-lg bg-afc-navy-mid/30 border-l-2 border-afc-gold/20">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-3 h-3 text-afc-gold/40" />
                      <span className="font-outfit text-afc-ivory-muted/50 text-xs">{entry.actor}</span>
                      <Clock className="w-3 h-3 text-afc-ivory-muted/20 ml-auto" />
                      <span className="font-outfit text-afc-ivory-muted/20 text-xs">
                        {new Date(entry.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="font-outfit text-afc-ivory text-xs">
                      <span className="text-afc-gold/60 font-semibold">{entry.action.replace(/_/g, ' ')}</span>
                    </p>
                    {entry.details && Object.keys(entry.details).length > 0 && (
                      <p className="font-outfit text-afc-ivory-muted/30 text-xs mt-0.5 truncate">
                        {JSON.stringify(entry.details)}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
