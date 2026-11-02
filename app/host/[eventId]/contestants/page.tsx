'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Event, Contestant } from '@/lib/types';
import { rpcHostCreateContestant, rpcHostResetContestantPin } from '@/lib/rpc';
import { HostHeader } from '@/components/host/HostHeader';
import { HostNavTabs } from '@/components/host/HostNavTabs';
import { usePresenceHost } from '@/lib/realtime/usePresenceSync';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

export default function ContestantsManagementPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const supabase = useMemo(() => createClient(), []);

  const [event, setEvent] = useState<Event | null>(null);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Contestant Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addGroup, setAddGroup] = useState('');
  const [addSeat, setAddSeat] = useState<number>(1);
  const [addPin, setAddPin] = useState('');
  const [addPhotoFile, setAddPhotoFile] = useState<File | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // PIN Reveal Confirmation Modal (Shown ONCE after adding or resetting)
  const [pinRevealModal, setPinRevealModal] = useState<{
    isOpen: boolean;
    name: string;
    seat: number;
    pin: string;
  }>({
    isOpen: false,
    name: '',
    seat: 1,
    pin: '',
  });
  const [copiedPin, setCopiedPin] = useState(false);

  // Reset PIN Modal
  const [resetPinTarget, setResetPinTarget] = useState<Contestant | null>(null);
  const [resetPinValue, setResetPinValue] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Edit Contestant Modal
  const [editTarget, setEditTarget] = useState<Contestant | null>(null);
  const [editName, setEditName] = useState('');
  const [editGroup, setEditGroup] = useState('');
  const [editSeat, setEditSeat] = useState<number>(1);
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Remove Contestant Modal
  const [removeTarget, setRemoveTarget] = useState<Contestant | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const fetchContestants = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: evData, error: evErr } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
      if (evErr) throw evErr;
      setEvent(evData as Event);

      const { data: cData, error: cErr } = await supabase
        .from('contestants')
        .select('*')
        .eq('event_id', eventId)
        .order('seat_no', { ascending: true });
      if (cErr) throw cErr;
      setContestants((cData as Contestant[]) || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load contestants';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [eventId, supabase]);

  useEffect(() => {
    fetchContestants();

    // Presence channel to track connected contestants
    const channel = supabase.channel(`presence:${eventId}`);
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const active = new Set<string>();
        Object.values(state).forEach((presences) => {
          presences.forEach((item) => {
            const p = item as unknown as { contestant_id?: string };
            if (p.contestant_id) active.add(p.contestant_id);
          });
        });
        setConnectedIds(active);
      })
      .subscribe();

    // Table change listener
    const tableChannel = supabase
      .channel(`contestants-changes:${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contestants', filter: `event_id=eq.${eventId}` },
        () => {
          supabase
            .from('contestants')
            .select('*')
            .eq('event_id', eventId)
            .order('seat_no', { ascending: true })
            .then(({ data }) => setContestants((data as Contestant[]) || []));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(tableChannel);
    };
  }, [eventId, fetchContestants, supabase]);

  // Compute next available seat
  const takenSeats = useMemo(() => new Set(contestants.map((c) => c.seat_no)), [contestants]);
  const availableSeats = useMemo(() => {
    const list: number[] = [];
    for (let s = 1; s <= 8; s++) {
      if (!takenSeats.has(s)) list.push(s);
    }
    return list;
  }, [takenSeats]);

  function generateRandomPin() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  function openAddModal() {
    setError(null);
    setAddName('');
    setAddGroup('');
    setAddSeat(availableSeats[0] || 1);
    setAddPin(generateRandomPin());
    setAddPhotoFile(null);
    setAddModalOpen(true);
  }

  async function uploadPhoto(file: File): Promise<string | null> {
    if (file.size > 1024 * 1024) {
      throw new Error('Photo must be less than 1 MB');
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
      throw new Error('Photo must be JPG, PNG, or WebP');
    }
    const filePath = `contestants/${eventId}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from('media')
      .upload(filePath, file, { upsert: true });

    if (uploadErr) {
      console.warn('Storage upload error, continuing without photo:', uploadErr);
      return null;
    }
    const { data: pubData } = supabase.storage.from('media').getPublicUrl(filePath);
    return pubData.publicUrl;
  }

  async function handleAddContestant(e: React.FormEvent) {
    e.preventDefault();
    if (!addName.trim()) return;
    if (!/^[0-9]{4}$/.test(addPin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }

    setIsAdding(true);
    setError(null);

    try {
      let photoUrl: string | null = null;
      if (addPhotoFile) {
        photoUrl = await uploadPhoto(addPhotoFile);
      }

      const res = await rpcHostCreateContestant(
        eventId,
        addName.trim(),
        addGroup.trim() || null,
        addSeat,
        addPin,
        supabase
      );

      if (!res.ok) {
        setError(res.message);
        setIsAdding(false);
        return;
      }

      // If photo was uploaded, update the contestant row
      if (photoUrl && res.data) {
        await supabase
          .from('contestants')
          .update({ photo_url: photoUrl })
          .eq('id', res.data);
      }

      const createdName = addName.trim();
      const createdSeat = addSeat;
      const createdPin = addPin;

      setAddModalOpen(false);
      setIsAdding(false);
      fetchContestants();

      // Show PIN ONCE modal
      setPinRevealModal({
        isOpen: true,
        name: createdName,
        seat: createdSeat,
        pin: createdPin,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error adding contestant';
      setError(msg);
      setIsAdding(false);
    }
  }

  async function handleResetPin(e: React.FormEvent) {
    e.preventDefault();
    if (!resetPinTarget) return;
    if (!/^[0-9]{4}$/.test(resetPinValue)) {
      setError('PIN must be exactly 4 digits');
      return;
    }

    setIsResetting(true);
    setError(null);

    const res = await rpcHostResetContestantPin(
      resetPinTarget.id,
      resetPinValue,
      supabase
    );

    setIsResetting(false);
    if (res.ok) {
      const targetName = resetPinTarget.name;
      const targetSeat = resetPinTarget.seat_no;
      const newPin = resetPinValue;

      setResetPinTarget(null);
      fetchContestants();

      // Show PIN ONCE modal
      setPinRevealModal({
        isOpen: true,
        name: targetName,
        seat: targetSeat,
        pin: newPin,
      });
    } else {
      setError(res.message);
    }
  }

  async function handleEditContestant(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget || !editName.trim()) return;

    setIsEditing(true);
    setError(null);

    try {
      let photoUrl = editTarget.photo_url;
      if (editPhotoFile) {
        const uploaded = await uploadPhoto(editPhotoFile);
        if (uploaded) photoUrl = uploaded;
      }

      const { error: updateErr } = await supabase
        .from('contestants')
        .update({
          name: editName.trim(),
          group_label: editGroup.trim() || null,
          seat_no: editSeat,
          photo_url: photoUrl,
        })
        .eq('id', editTarget.id);

      setIsEditing(false);
      if (updateErr) {
        setError(updateErr.message);
      } else {
        setEditTarget(null);
        fetchContestants();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating contestant';
      setError(msg);
      setIsEditing(false);
    }
  }

  async function handleRemoveContestant() {
    if (!removeTarget) return;
    setIsRemoving(true);
    const { error: delErr } = await supabase
      .from('contestants')
      .delete()
      .eq('id', removeTarget.id);

    setIsRemoving(false);
    if (delErr) {
      setError(delErr.message);
    } else {
      setRemoveTarget(null);
      fetchContestants();
    }
  }

  function handleCopyPin() {
    navigator.clipboard.writeText(pinRevealModal.pin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  }

  const isLive = event?.status === 'live';
  const { inSyncCount, totalTrackedCount, laggingDevices } = usePresenceHost(eventId, 0);

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      <HostHeader
        eventName={event?.name}
        eventStatus={event?.status}
        joinCode={event?.join_code}
        eventId={eventId}
        inSyncCount={inSyncCount}
        totalTrackedCount={totalTrackedCount}
        laggingDevices={laggingDevices}
      />
      <HostNavTabs eventId={eventId} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-navy-700/15 pb-4">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-navy-900">
              Contestants
            </h1>
            <p className="text-ink-500 text-sm mt-1">
              Add 2 to 8 contestants with seat assignments and 4-digit security PINs.
            </p>
          </div>
          <Button
            variant="gold"
            size="md"
            onClick={openAddModal}
            disabled={contestants.length >= 8 || isLive}
            title={
              isLive
                ? 'Cannot add contestants while contest is live'
                : contestants.length >= 8
                ? 'Maximum of 8 contestants reached'
                : ''
            }
          >
            + Add Contestant ({contestants.length}/8)
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

        {isLive && (
          <div className="p-3 bg-gold-500/15 border border-gold-500/30 rounded-btn text-xs sm:text-sm text-navy-900 font-medium">
            Note: Contestant names, seats, and removal are locked while the event is live. Reset PIN is still available.
          </div>
        )}

        {/* Contestants Table */}
        {isLoading ? (
          <div className="py-20 flex justify-center text-ink-500 font-medium text-sm">
            Loading contestants…
          </div>
        ) : contestants.length === 0 ? (
          <Card className="text-center py-16 px-4 bg-white border border-dashed border-navy-700/20">
            <h3 className="font-display text-2xl font-semibold text-navy-900 mb-2">
              No Contestants Added
            </h3>
            <p className="text-ink-500 text-sm max-w-md mx-auto mb-6">
              Add between 2 and 8 contestants to compete in the live Bible quiz.
            </p>
            <Button variant="gold" onClick={openAddModal}>
              Add Contestant #1
            </Button>
          </Card>
        ) : (
          <Card className="bg-white p-0 overflow-hidden border border-navy-700/15 shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-cream-100 border-b border-navy-700/15 text-navy-900 font-semibold uppercase text-xs tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Seat</th>
                    <th className="py-3 px-4">Contestant</th>
                    <th className="py-3 px-4">Group / Branch</th>
                    <th className="py-3 px-4">Claimed</th>
                    <th className="py-3 px-4">Connection</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700/10">
                  {contestants.map((c) => {
                    const isConnected = connectedIds.has(c.id);
                    const isClaimed = !!c.auth_user_id;

                    return (
                      <tr key={c.id} className="hover:bg-cream-50 transition-colors">
                        <td className="py-4 px-4 font-mono font-bold text-navy-900 text-base">
                          #{c.seat_no}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-cream-100 border border-navy-700/15 flex items-center justify-center overflow-hidden shrink-0 font-bold text-navy-900">
                              {c.photo_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={c.photo_url}
                                  alt={c.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                c.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <span className="font-semibold text-navy-900 text-base">
                              {c.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-ink-500">
                          {c.group_label || '—'}
                        </td>
                        <td className="py-4 px-4">
                          {isClaimed ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-success bg-success/10 px-2.5 py-0.5 rounded-chip">
                              ✓ Claimed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-500 bg-cream-100 px-2.5 py-0.5 rounded-chip">
                              — Not claimed
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          {isConnected ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                              Connected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500">
                              <span className="w-2 h-2 rounded-full bg-ink-500/40" />
                              Offline
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right space-x-2">
                          <Button
                            variant="ghost"
                            size="md"
                            disabled={isLive}
                            onClick={() => {
                              setEditTarget(c);
                              setEditName(c.name);
                              setEditGroup(c.group_label || '');
                              setEditSeat(c.seat_no);
                              setEditPhotoFile(null);
                            }}
                            className="text-xs min-h-[32px] px-2.5 py-1"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="md"
                            onClick={() => {
                              setResetPinTarget(c);
                              setResetPinValue(generateRandomPin());
                            }}
                            className="text-xs min-h-[32px] px-2.5 py-1 text-gold-500 hover:text-navy-900"
                          >
                            Reset PIN
                          </Button>
                          <Button
                            variant="ghost"
                            size="md"
                            disabled={isLive}
                            onClick={() => setRemoveTarget(c)}
                            className="text-xs min-h-[32px] px-2.5 py-1 text-danger hover:bg-danger/10 border-danger/20"
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </main>

      {/* Add Contestant Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add Contestant"
      >
        <form onSubmit={handleAddContestant} className="flex flex-col gap-4">
          <Input
            label="Contestant Full Name"
            placeholder="e.g. Samuel Adekunle"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Branch / Assembly / Group Label (Optional)"
            placeholder="e.g. Ado-Ekiti Central Youth"
            value={addGroup}
            onChange={(e) => setAddGroup(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-900">Seat Number</label>
              <select
                value={addSeat}
                onChange={(e) => setAddSeat(parseInt(e.target.value, 10))}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-btn bg-white border border-navy-700/20 text-ink-900 font-semibold focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                {availableSeats.map((s) => (
                  <option key={s} value={s}>
                    Seat #{s}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="4-Digit Security PIN"
              value={addPin}
              onChange={(e) => setAddPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="e.g. 4821"
              maxLength={4}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink-900">
              Optional Photo (Max 1 MB)
            </label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setAddPhotoFile(e.target.files?.[0] || null)}
              className="text-xs text-ink-500 file:mr-3 file:py-2 file:px-4 file:rounded-btn file:border-0 file:text-xs file:font-semibold file:bg-cream-100 file:text-navy-900 hover:file:bg-cream-50"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gold"
              isLoading={isAdding}
              disabled={!addName.trim() || addPin.length !== 4}
            >
              Add Contestant
            </Button>
          </div>
        </form>
      </Modal>

      {/* PIN Confirmation Dialog (Shown ONCE) */}
      <Modal
        isOpen={pinRevealModal.isOpen}
        onClose={() => setPinRevealModal((prev) => ({ ...prev, isOpen: false }))}
        title="Security PIN Created"
      >
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <p className="text-sm text-ink-500">
            Please give this PIN directly to <strong className="text-navy-900">{pinRevealModal.name}</strong> (Seat #{pinRevealModal.seat}).
            For security, the PIN hash is stored in PostgreSQL and cannot be retrieved again.
          </p>

          <div className="w-full bg-cream-100 border border-gold-500/40 rounded-card p-6 flex flex-col items-center">
            <p className="text-xs uppercase tracking-widest text-ink-500 font-bold mb-1">
              4-Digit PIN
            </p>
            <p className="font-mono text-5xl font-extrabold text-navy-900 tracking-widest">
              {pinRevealModal.pin}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full pt-2">
            <Button
              variant="ghost"
              onClick={handleCopyPin}
              className="flex-1"
            >
              {copiedPin ? '✓ Copied PIN' : 'Copy PIN'}
            </Button>
            <Button
              variant="gold"
              onClick={() => setPinRevealModal((prev) => ({ ...prev, isOpen: false }))}
              className="flex-1"
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reset PIN Modal */}
      <Modal
        isOpen={!!resetPinTarget}
        onClose={() => setResetPinTarget(null)}
        title="Reset Contestant PIN"
      >
        <form onSubmit={handleResetPin} className="flex flex-col gap-4">
          <p className="text-sm text-ink-500">
            Resetting the PIN for <strong className="text-navy-900">{resetPinTarget?.name}</strong> (Seat #{resetPinTarget?.seat_no}) will clear any lockout count and un-claim their active session.
          </p>

          <Input
            label="New 4-Digit PIN"
            value={resetPinValue}
            onChange={(e) => setResetPinValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="e.g. 5912"
            maxLength={4}
            required
            autoFocus
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setResetPinTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gold"
              isLoading={isResetting}
              disabled={resetPinValue.length !== 4}
            >
              Confirm New PIN
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Contestant Modal */}
      <Modal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit Contestant"
      >
        <form onSubmit={handleEditContestant} className="flex flex-col gap-4">
          <Input
            label="Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Group / Branch (Optional)"
            value={editGroup}
            onChange={(e) => setEditGroup(e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink-900">Seat Number</label>
            <select
              value={editSeat}
              onChange={(e) => setEditSeat(parseInt(e.target.value, 10))}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-btn bg-white border border-navy-700/20 text-ink-900 font-semibold focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              <option value={editTarget?.seat_no}>
                Seat #{editTarget?.seat_no} (Current)
              </option>
              {availableSeats.map((s) => (
                <option key={s} value={s}>
                  Seat #{s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink-900">
              Replace Photo (Max 1 MB)
            </label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setEditPhotoFile(e.target.files?.[0] || null)}
              className="text-xs text-ink-500 file:mr-3 file:py-2 file:px-4 file:rounded-btn file:border-0 file:text-xs file:font-semibold file:bg-cream-100 file:text-navy-900 hover:file:bg-cream-50"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isEditing}
              disabled={!editName.trim()}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Remove Contestant Modal */}
      <Modal
        isOpen={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title="Remove Contestant"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-500">
            Are you sure you want to remove <strong className="text-navy-900">{removeTarget?.name}</strong> from Seat #{removeTarget?.seat_no}? All associated scores will be deleted.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRemoveTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              isLoading={isRemoving}
              onClick={handleRemoveContestant}
            >
              Remove Contestant
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
