'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Event } from '@/lib/types';
import { rpcHostCreateEvent } from '@/lib/rpc';
import {
  DEFAULT_EVENT,
  DEFAULT_EVENT_ID,
  DEFAULT_EVENT_CODE,
} from '@/lib/defaultEvent';
import { HostHeader } from '@/components/host/HostHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { EventStatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';

export default function HostEventsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [renameTarget, setRenameTarget] = useState<Event | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Trigger auto-seed in background if database is ready
    try {
      fetch('/api/seed', { method: 'POST' }).catch(() => {});
    } catch {
      // Non-blocking
    }

    try {
      const { data, error: fetchErr } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchErr || !data || data.length === 0) {
        setEvents([DEFAULT_EVENT]);
      } else {
        const loaded = data as Event[];
        if (!loaded.some((e) => e.join_code === DEFAULT_EVENT_CODE || e.id === DEFAULT_EVENT_ID)) {
          setEvents([DEFAULT_EVENT, ...loaded]);
        } else {
          setEvents(loaded);
        }
      }
    } catch {
      setEvents([DEFAULT_EVENT]);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!newEventName.trim()) return;
    setIsCreating(true);

    const res = await rpcHostCreateEvent(newEventName.trim(), supabase);
    setIsCreating(false);

    if (res.ok && res.data) {
      setCreateModalOpen(false);
      setNewEventName('');
      router.push(`/host/${res.data.id}`);
    } else {
      setError(res.ok ? 'Failed to create event' : res.message);
    }
  }

  async function handleRenameEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!renameTarget || !renameValue.trim()) return;
    setIsRenaming(true);

    const { error: updateErr } = await supabase
      .from('events')
      .update({ name: renameValue.trim() })
      .eq('id', renameTarget.id);

    setIsRenaming(false);
    if (!updateErr) {
      setRenameTarget(null);
      setRenameValue('');
      fetchEvents();
    } else {
      setError(updateErr.message);
    }
  }

  async function handleDeleteEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!deleteTarget || deleteConfirmText !== deleteTarget.name) return;
    setIsDeleting(true);

    const { error: delErr } = await supabase
      .from('events')
      .delete()
      .eq('id', deleteTarget.id);

    setIsDeleting(false);
    if (!delErr) {
      setDeleteTarget(null);
      setDeleteConfirmText('');
      fetchEvents();
    } else {
      setError(delErr.message);
    }
  }

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      <HostHeader />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 flex flex-col gap-6">
        {/* Page Title & Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-navy-700/15 pb-4">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-navy-900">
              Competition Events
            </h1>
            <p className="text-ink-500 text-sm mt-1">
              Create, configure, and monitor live Bible Giants events.
            </p>
          </div>
          <Button
            variant="gold"
            size="md"
            onClick={() => setCreateModalOpen(true)}
            className="self-start sm:self-auto"
          >
            + New Event
          </Button>
        </div>

        {error && (
          <div
            role="alert"
            className="p-4 rounded-btn bg-danger/10 border border-danger/30 text-danger text-sm font-medium"
          >
            {error}
          </div>
        )}

        {/* Quick Launch Pre-Configured Live Stage Card */}
        <div className="w-full rounded-card bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 border-2 border-gold-500/50 p-6 sm:p-8 text-cream-50 shadow-soft flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-gold-500 text-navy-950 text-xs font-black uppercase px-2.5 py-0.5 rounded tracking-wider">
                  ⚡ Operational Live Stage
                </span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-cream-50">
                Apostolic Faith Camp Meeting 2026 - Bible Giant
              </h2>
              <p className="text-sm text-gold-200/80 mt-1">
                Ondo & Ekiti Region • 8 Contestant Seats • 3 Rounds • 18 Prepared Questions
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Link href={`/host/${DEFAULT_EVENT_ID}/live`}>
                <Button variant="gold" size="lg" className="shadow-soft">
                  🎮 Live Console
                </Button>
              </Link>
              <Link href={`/screen/${DEFAULT_EVENT_ID}`} target="_blank">
                <Button variant="ghost" size="lg" className="border border-gold-400 text-cream-50 hover:bg-gold-500/10">
                  📺 Projector Screen
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-navy-800">
            <Link
              href={`/host/${DEFAULT_EVENT_ID}/contestants`}
              className="p-3 rounded-btn bg-navy-800/80 hover:bg-navy-800 border border-navy-700/60 text-center transition-colors"
            >
              <span className="text-xl block mb-1">👥</span>
              <span className="text-xs font-semibold text-cream-50 block">Contestants Roster</span>
              <span className="text-[10px] text-gold-300">8 Contestant Seats</span>
            </Link>

            <Link
              href={`/host/${DEFAULT_EVENT_ID}/rounds`}
              className="p-3 rounded-btn bg-navy-800/80 hover:bg-navy-800 border border-navy-700/60 text-center transition-colors"
            >
              <span className="text-xl block mb-1">❓</span>
              <span className="text-xs font-semibold text-cream-50 block">Questions & Rounds</span>
              <span className="text-[10px] text-gold-300">3 Rounds Loaded</span>
            </Link>

            <Link
              href={`/host/${DEFAULT_EVENT_ID}/results`}
              className="p-3 rounded-btn bg-navy-800/80 hover:bg-navy-800 border border-navy-700/60 text-center transition-colors"
            >
              <span className="text-xl block mb-1">🏆</span>
              <span className="text-xs font-semibold text-cream-50 block">Results & Podium</span>
              <span className="text-[10px] text-gold-300">Leaderboard & Export</span>
            </Link>

            <Link
              href={`/host/${DEFAULT_EVENT_ID}`}
              className="p-3 rounded-btn bg-navy-800/80 hover:bg-navy-800 border border-navy-700/60 text-center transition-colors"
            >
              <span className="text-xl block mb-1">⚙️</span>
              <span className="text-xs font-semibold text-cream-50 block">Event Overview</span>
              <span className="text-[10px] text-gold-300">Settings & State</span>
            </Link>
          </div>
        </div>

        {/* Events Content */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-ink-500">
            <svg
              className="animate-spin h-8 w-8 text-gold-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="font-medium text-sm">Loading events…</p>
          </div>
        ) : events.length === 0 ? (
          <Card className="text-center py-16 px-4 bg-white border border-dashed border-navy-700/20">
            <h3 className="font-display text-2xl font-semibold text-navy-900 mb-2">
              No Events Yet
            </h3>
            <p className="text-ink-500 text-sm max-w-md mx-auto mb-6">
              Create your first competition event to set up contestants, question rounds, and launch the live stage.
            </p>
            <Button variant="gold" onClick={() => setCreateModalOpen(true)}>
              Create Your First Event
            </Button>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {events.map((ev) => (
              <Card
                key={ev.id}
                className="bg-white hover:border-gold-500/40 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 sm:p-6"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-navy-900">
                      {ev.name}
                    </h2>
                    <EventStatusBadge status={ev.status} />
                  </div>
                  <div className="flex items-center gap-4 text-xs sm:text-sm text-ink-500">
                    <span>
                      Join code:{' '}
                      <span className="font-mono font-bold text-navy-900 text-base tracking-widest bg-cream-100 px-2 py-0.5 rounded border border-navy-700/10">
                        {ev.join_code}
                      </span>
                    </span>
                    <span>•</span>
                    <span>
                      Created: {new Date(ev.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => {
                      setRenameTarget(ev);
                      setRenameValue(ev.name);
                    }}
                    className="text-xs sm:text-sm"
                  >
                    Rename
                  </Button>
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => {
                      setDeleteTarget(ev);
                      setDeleteConfirmText('');
                    }}
                    className="text-xs sm:text-sm text-danger hover:bg-danger/10 border-danger/20"
                  >
                    Delete
                  </Button>
                  <Link
                    href={`/host/${ev.id}`}
                    className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 text-sm font-semibold rounded-btn bg-navy-900 text-cream-50 hover:bg-navy-700 transition-colors shadow-sm"
                  >
                    Open
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* New Event Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Event"
      >
        <form onSubmit={handleCreateEvent} className="flex flex-col gap-4">
          <Input
            label="Event Name"
            placeholder="e.g. Ondo & Ekiti Regional Final 2026"
            value={newEventName}
            onChange={(e) => setNewEventName(e.target.value)}
            required
            autoFocus
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gold"
              isLoading={isCreating}
              disabled={!newEventName.trim()}
            >
              Create Event
            </Button>
          </div>
        </form>
      </Modal>

      {/* Rename Event Modal */}
      <Modal
        isOpen={!!renameTarget}
        onClose={() => setRenameTarget(null)}
        title="Rename Event"
      >
        <form onSubmit={handleRenameEvent} className="flex flex-col gap-4">
          <Input
            label="New Event Name"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            required
            autoFocus
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRenameTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isRenaming}
              disabled={!renameValue.trim()}
            >
              Save Name
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Event Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Event"
      >
        <form onSubmit={handleDeleteEvent} className="flex flex-col gap-4">
          <p className="text-sm text-ink-500">
            This action cannot be undone. All rounds, questions, contestant scores, and audience predictions for{' '}
            <strong className="text-navy-900">{deleteTarget?.name}</strong> will be permanently deleted.
          </p>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink-900">
              Type <span className="font-semibold underline">{deleteTarget?.name}</span> to confirm:
            </label>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={deleteTarget?.name}
              required
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              isLoading={isDeleting}
              disabled={deleteConfirmText !== deleteTarget?.name}
            >
              Delete Event
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

