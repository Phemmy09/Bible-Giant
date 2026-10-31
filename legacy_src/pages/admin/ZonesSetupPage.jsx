import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, RotateCcw, Users, AlertTriangle, Edit3, Save, X, UserCheck, Shield } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { ZONE_COLORS, VALIDATION } from '@/lib/constants';

export default function ZonesSetupPage() {
  const { zones, addZone, removeZone, resetAllScores, setTopicLabel, activeRound, resetBoard, connectedTeams, updateTeamRoster } = useGameStore();
  const [newZoneName, setNewZoneName] = useState('');
  const [confirmResetScores, setConfirmResetScores] = useState(false);
  const [confirmResetBoard, setConfirmResetBoard] = useState(false);
  const [editingRosterZoneId, setEditingRosterZoneId] = useState(null);
  const [rosterForm, setRosterForm] = useState({ player1: '', player2: '', branch: '' });

  const activeZones = zones.filter(z => !z.archived);

  const startEditRoster = (zone) => {
    const team = connectedTeams[zone.id] || {};
    const players = team.players || [];
    setEditingRosterZoneId(zone.id);
    setRosterForm({
      player1: players[0] || '',
      player2: players[1] || '',
      branch: team.branch || '',
    });
  };

  const saveRoster = () => {
    if (!editingRosterZoneId) return;
    updateTeamRoster(editingRosterZoneId, {
      players: [rosterForm.player1.trim() || 'Player 1', rosterForm.player2.trim() || 'Player 2'],
      branch: rosterForm.branch.trim(),
    });
    setEditingRosterZoneId(null);
  };

  const handleAddZone = () => {
    if (!newZoneName.trim() || newZoneName.length > VALIDATION.zoneNameMax) return;
    addZone(newZoneName.trim());
    setNewZoneName('');
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
          <h1 className="font-cinzel text-xl font-bold text-gold-gradient">Zones & Round Setup</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Zone Roster */}
          <div className="glass-card p-6">
            <h3 className="font-cinzel text-afc-gold text-sm tracking-wider mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" /> Zone Roster
            </h3>
            <p className="font-outfit text-afc-ivory-muted/40 text-xs mb-4">
              {activeZones.length} / {VALIDATION.maxZones} zones configured
            </p>

            {/* Add zone input */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value.toUpperCase())}
                maxLength={VALIDATION.zoneNameMax}
                placeholder="Zone name (e.g., IDO)"
                className="flex-1 bg-afc-navy-mid/60 border border-afc-gold/20 rounded-lg px-3 py-2 text-afc-ivory font-outfit text-sm focus:border-afc-gold/50 focus:outline-none uppercase"
                onKeyDown={(e) => e.key === 'Enter' && handleAddZone()}
              />
              <button
                onClick={handleAddZone}
                disabled={!newZoneName.trim() || activeZones.length >= VALIDATION.maxZones}
                className="px-4 py-2 rounded-lg bg-gradient-gold text-afc-navy font-cinzel text-sm font-semibold hover:shadow-gold-intense disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Zone list */}
            <div className="space-y-2">
              <AnimatePresence>
                {activeZones.map((zone, i) => {
                  const team = connectedTeams[zone.id] || {};
                  const players = team.players || [];
                  const isEditingThis = editingRosterZoneId === zone.id;

                  return (
                    <motion.div
                      key={zone.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="p-3 rounded-xl bg-afc-navy-mid/40 border border-afc-gold/10 space-y-2"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: ZONE_COLORS[i % ZONE_COLORS.length].bg }}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-cinzel text-afc-ivory text-sm font-semibold truncate block">
                            {zone.name}
                          </span>
                          {team.branch && (
                            <span className="font-outfit text-[11px] text-afc-ivory-muted/50 truncate block">
                              Branch: {team.branch}
                            </span>
                          )}
                        </div>
                        <span className="font-cinzel text-afc-gold text-sm font-bold">{zone.score} pts</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => isEditingThis ? setEditingRosterZoneId(null) : startEditRoster(zone)}
                            title="Configure Team Representatives"
                            className="p-1.5 rounded-lg hover:bg-afc-gold/10 text-afc-ivory-muted/40 hover:text-afc-gold transition-all"
                          >
                            <Users className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removeZone(zone.id)}
                            className="p-1.5 rounded-lg hover:bg-afc-crimson/10 text-afc-ivory-muted/30 hover:text-afc-crimson-light transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Display Players Tag */}
                      {players.length > 0 && !isEditingThis && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/5">
                          <span className="text-[10px] font-outfit text-afc-gold uppercase tracking-wider">Reps:</span>
                          {players.map((p, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] font-outfit text-afc-ivory/80"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Inline Roster Form */}
                      <AnimatePresence>
                        {isEditingThis && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="pt-2 border-t border-afc-gold/20 space-y-2 text-xs"
                          >
                            <p className="font-cinzel text-[11px] text-afc-gold font-bold">
                              Two Named Representatives
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] text-afc-ivory-muted/50 mb-0.5">Player 1</label>
                                <input
                                  type="text"
                                  value={rosterForm.player1}
                                  onChange={(e) => setRosterForm(f => ({ ...f, player1: e.target.value }))}
                                  placeholder="Bro. Samuel"
                                  className="w-full bg-afc-navy border border-afc-gold/20 rounded px-2 py-1 text-xs text-white focus:border-afc-gold focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-afc-ivory-muted/50 mb-0.5">Player 2</label>
                                <input
                                  type="text"
                                  value={rosterForm.player2}
                                  onChange={(e) => setRosterForm(f => ({ ...f, player2: e.target.value }))}
                                  placeholder="Sis. Deborah"
                                  className="w-full bg-afc-navy border border-afc-gold/20 rounded px-2 py-1 text-xs text-white focus:border-afc-gold focus:outline-none"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] text-afc-ivory-muted/50 mb-0.5">Local Assembly / Branch</label>
                              <input
                                type="text"
                                value={rosterForm.branch}
                                onChange={(e) => setRosterForm(f => ({ ...f, branch: e.target.value }))}
                                placeholder="e.g. Ado Central Assembly"
                                className="w-full bg-afc-navy border border-afc-gold/20 rounded px-2 py-1 text-xs text-white focus:border-afc-gold focus:outline-none"
                              />
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={saveRoster}
                                className="px-3 py-1 rounded bg-afc-gold text-afc-navy font-bold text-xs flex items-center gap-1 hover:shadow-md"
                              >
                                <Save className="w-3 h-3" /> Save Roster
                              </button>
                              <button
                                onClick={() => setEditingRosterZoneId(null)}
                                className="px-3 py-1 rounded glass text-afc-ivory-muted/60 text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {/* Score Reset */}
            <div className="glass-card p-6">
              <h3 className="font-cinzel text-afc-gold text-sm tracking-wider mb-4">Score Management</h3>

              {!confirmResetScores ? (
                <button
                  onClick={() => setConfirmResetScores(true)}
                  className="w-full py-3 rounded-xl glass text-afc-ivory-muted/60 font-outfit text-sm hover:text-afc-crimson-light hover:border-afc-crimson/30 transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> Reset All Scores to 0
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    <p className="font-outfit text-sm">This will reset ALL zone scores to 0!</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { resetAllScores(); setConfirmResetScores(false); }}
                      className="flex-1 py-2 rounded-lg bg-afc-crimson/20 text-afc-crimson-light font-outfit text-sm border border-afc-crimson/30"
                    >
                      Confirm Reset
                    </button>
                    <button
                      onClick={() => setConfirmResetScores(false)}
                      className="flex-1 py-2 rounded-lg glass text-afc-ivory-muted/50 font-outfit text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Round Board Reset */}
            <div className="glass-card p-6">
              <h3 className="font-cinzel text-afc-gold text-sm tracking-wider mb-4">Round Board Reset</h3>
              <p className="font-outfit text-afc-ivory-muted/40 text-xs mb-3">
                Re-enable all tiles for the current round without affecting scores or other rounds.
              </p>

              {!confirmResetBoard ? (
                <button
                  onClick={() => setConfirmResetBoard(true)}
                  className="w-full py-3 rounded-xl glass text-afc-ivory-muted/60 font-outfit text-sm hover:text-amber-400 hover:border-amber-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> Reset Current Board
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => { resetBoard(); setConfirmResetBoard(false); }}
                    className="flex-1 py-2 rounded-lg bg-amber-500/20 text-amber-400 font-outfit text-sm border border-amber-500/30"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmResetBoard(false)}
                    className="flex-1 py-2 rounded-lg glass text-afc-ivory-muted/50 font-outfit text-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Topic Label */}
            <div className="glass-card p-6">
              <h3 className="font-cinzel text-afc-gold text-sm tracking-wider mb-4">Topic / Book Label</h3>
              <p className="font-outfit text-afc-ivory-muted/40 text-xs mb-3">
                Current: <span className="text-afc-gold/60">{activeRound?.topicLabel || 'Not set'}</span>
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  defaultValue={activeRound?.topicLabel || ''}
                  onChange={(e) => setTopicLabel(e.target.value)}
                  placeholder="e.g., Genesis Book"
                  className="flex-1 bg-afc-navy-mid/60 border border-afc-gold/20 rounded-lg px-3 py-2 text-afc-ivory font-outfit text-sm focus:border-afc-gold/50 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
