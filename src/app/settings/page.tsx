'use client';

import { AppShell } from '@/components/app-shell';
import { useStore } from '@/store';
import { useState } from 'react';
import { ItemType, TimeRange, getTimeRanges, PRESET_SPORTS } from '@/lib/types';
import { toast } from '@/components/toast';
import Link from 'next/link';
import { OperatingHoursEditor, OperatingHoursDisplay } from '@/components/operating-hours-editor';
import { UsernameInput } from '@/components/username-input';
import { apiUpdateUser } from '@/lib/api';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="text-xs font-semibold text-ink-3 mb-2">{title}</div>
      {children}
    </div>
  );
}

/* ── Sport Config Sub-View ── */
function SportConfigView({
  sportId,
  onBack,
  showBack = true,
}: {
  sportId: string;
  onBack: () => void;
  showBack?: boolean;
}) {
  const { sports, courts, items, updateSport, removeSport, addCourt, updateCourt, removeCourt, addItem, updateItem, removeItem } = useStore();
  const sport = sports.find((s) => s.id === sportId);

  const [editingName, setEditingName] = useState(false);
  const [sportName, setSportName] = useState(sport?.name ?? '');
  const [editingHours, setEditingHours] = useState(false);
  const [hoursRanges, setHoursRanges] = useState<TimeRange[]>(sport?.operatingHoursRanges ?? [{ start: 6, end: 22 }]);

  const [showAddCourt, setShowAddCourt] = useState(false);
  const sportCourts = courts.filter((c) => c.sportId === sportId);
  const [newCourtName, setNewCourtName] = useState(`Court ${sportCourts.length + 1}`);
  const [newCourtRate, setNewCourtRate] = useState('');

  const [editingCourtId, setEditingCourtId] = useState<string | null>(null);
  const [editCourtName, setEditCourtName] = useState('');
  const [editCourtRate, setEditCourtRate] = useState('');

  const sportItems = items.filter((i) => i.sportId === sportId);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemType, setNewItemType] = useState<ItemType>('rental');

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemPrice, setEditItemPrice] = useState('');

  if (!sport) return null;

  const handleSaveHours = async () => {
    try {
      await updateSport(sportId, { operatingHoursRanges: hoursRanges });
      toast.success('Operating hours updated');
    } catch {
      toast.error('Could not save operating hours.');
    }
  };

  const handleSaveName = async () => {
    if (!sportName.trim()) return;
    try {
      await updateSport(sportId, { name: sportName.trim() });
      setEditingName(false);
    } catch {
      toast.error('Could not save sport name.');
    }
  };

  const handleAddCourt = async () => {
    if (!newCourtName.trim() || !newCourtRate) return;
    try {
      await addCourt({ sportId, name: newCourtName.trim(), hourlyRate: Number(newCourtRate), isActive: true });
      setNewCourtRate('');
      setShowAddCourt(false);
    } catch {
      toast.error('Could not add court.');
    }
  };

  const handleRemoveSport = async () => {
    if (sportCourts.length > 0) {
      toast.error(`Remove or reassign the ${sportCourts.length} court${sportCourts.length > 1 ? 's' : ''} before removing this sport.`);
      return;
    }
    try {
      await removeSport(sportId);
      onBack();
    } catch {
      toast.error('Could not remove sport.');
    }
  };

  return (
    <>
      {/* Back button */}
      {showBack && (
        <button onClick={onBack} className="flex items-center gap-2 text-ink-3 hover:text-ink mb-4 transition-colors">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
            <path d="M10 4l-4 4 4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-xs font-medium">Back to Settings</span>
        </button>
      )}

      {/* Sport name */}
      {editingName ? (
        <div className="flex gap-2 mb-5">
          <input
            value={sportName}
            onChange={(e) => setSportName(e.target.value)}
            className="flex-1 bg-surface-3 rounded-xl px-3 py-2 text-lg font-display font-bold border border-line focus:outline-none focus:border-primary"
          />
          <button onClick={handleSaveName} className="bg-primary hover:bg-primary-deep text-white px-4 py-3 rounded-xl text-xs font-semibold transition-colors">Save</button>
          <button onClick={() => { setEditingName(false); setSportName(sport.name); }} className="bg-surface-3 text-ink-3 px-4 py-3 rounded-xl text-xs font-semibold hover:bg-surface-2 transition-colors">Cancel</button>
        </div>
      ) : (
        <button onClick={() => setEditingName(true)} className="mb-5">
          <h2 className="font-display font-bold text-2xl text-ink hover:text-primary transition-colors">{sport.name}</h2>
        </button>
      )}

      {/* Operating Hours */}
      <Section title="Operating Hours">
        {editingHours ? (
          <div className="bg-surface rounded-xl shadow-card p-3 space-y-3">
            <OperatingHoursEditor ranges={hoursRanges} onChange={setHoursRanges} />
            <div className="flex gap-2">
              <button onClick={async () => { await handleSaveHours(); setEditingHours(false); }} className="flex-1 bg-primary hover:bg-primary-deep text-white py-3 rounded-xl text-xs font-semibold transition-colors">
                Save Hours
              </button>
              <button onClick={() => { setHoursRanges(sport.operatingHoursRanges ?? [{ start: 6, end: 22 }]); setEditingHours(false); }} className="flex-1 bg-surface-3 text-ink-2 py-3 rounded-xl text-xs font-semibold hover:bg-surface-2 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setEditingHours(true)} className="w-full bg-surface rounded-xl shadow-card p-3 text-left">
            <div className="space-y-1">
              {(sport.operatingHoursRanges ?? [{ start: 6, end: 22 }]).map((range, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="font-medium text-sm"><OperatingHoursDisplay ranges={[range]} /></span>
                </div>
              ))}
            </div>
            <div className="text-xs text-ink-3 mt-1.5">Tap to edit hours or add open windows</div>
          </button>
        )}
      </Section>

      {/* Courts for this sport */}
      <Section title={`Courts (${sportCourts.length})`}>
        <div className="space-y-1.5">
          {sportCourts.map((court) => (
            editingCourtId === court.id ? (
              <div key={court.id} className="bg-surface rounded-xl shadow-card p-3 space-y-2">
                <input type="text" value={editCourtName} onChange={(e) => setEditCourtName(e.target.value)}
                  className="w-full bg-surface-3 rounded-xl px-3 py-2 text-sm border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                <input type="number" placeholder="Hourly rate (₱)" value={editCourtRate} onChange={(e) => setEditCourtRate(e.target.value)}
                  className="w-full bg-surface-3 rounded-xl px-3 py-2 text-sm border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                <div className="flex gap-2">
                  <button onClick={async () => {
                    const updates: Record<string, unknown> = {};
                    if (editCourtName.trim() && editCourtName.trim() !== court.name) updates.name = editCourtName.trim();
                    if (editCourtRate && Number(editCourtRate) !== court.hourlyRate) updates.hourlyRate = Number(editCourtRate);
                    if (Object.keys(updates).length > 0) {
                      try { await updateCourt(court.id, updates); } catch { toast.error('Could not update court.'); }
                    }
                    setEditingCourtId(null);
                  }} className="flex-1 bg-primary hover:bg-primary-deep text-white py-3 rounded-xl text-xs font-semibold transition-colors">Save</button>
                  <button onClick={() => setEditingCourtId(null)} className="flex-1 bg-surface-3 text-ink-2 py-3 rounded-xl text-xs font-semibold hover:bg-surface-2 transition-colors">Cancel</button>
                </div>
              </div>
            ) : (
              <div key={court.id} className="bg-surface rounded-xl shadow-card p-3 flex justify-between items-center">
                <button onClick={() => { setEditingCourtId(court.id); setEditCourtName(court.name); setEditCourtRate(String(court.hourlyRate)); }} className="text-left">
                  <div className="font-medium text-sm">{court.name}</div>
                  <div className="text-xs text-ink-3">₱{court.hourlyRate}/hr</div>
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateCourt(court.id, { isActive: !court.isActive })}
                    className={`text-xs px-2 py-1 rounded ${court.isActive ? 'bg-signal-soft text-signal-text' : 'bg-surface-3 text-ink-3'}`}
                  >
                    {court.isActive ? 'Active' : 'Off'}
                  </button>
                  <button onClick={() => removeCourt(court.id)} className="text-xs px-2 py-1 rounded text-warn">Remove</button>
                </div>
              </div>
            )
          ))}
        </div>

        {showAddCourt ? (
          <div className="bg-surface rounded-xl shadow-card p-3 mt-2 space-y-2">
            <input type="text" placeholder="Court name" value={newCourtName} onChange={(e) => setNewCourtName(e.target.value)}
              className="w-full bg-surface-3 rounded-xl px-3 py-2 text-sm border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            <input type="number" placeholder="Hourly rate (₱)" value={newCourtRate} onChange={(e) => setNewCourtRate(e.target.value)}
              className="w-full bg-surface-3 rounded-xl px-3 py-2 text-sm border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            <div className="flex gap-2">
              <button onClick={handleAddCourt} className="flex-1 bg-primary hover:bg-primary-deep text-white py-3 rounded-xl text-xs font-semibold transition-colors">Add Court</button>
              <button onClick={() => setShowAddCourt(false)} className="flex-1 bg-surface-3 text-ink-2 py-3 rounded-xl text-xs font-semibold hover:bg-surface-2 transition-colors">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => { setNewCourtName(`Court ${sportCourts.length + 1}`); setShowAddCourt(true); }} className="w-full mt-2 border border-dashed border-line text-ink-3 py-3 rounded-xl text-xs font-semibold hover:border-primary hover:text-primary transition-colors">
            + Add court
          </button>
        )}
      </Section>

      {/* Item catalog for this sport */}
      <Section title={`Item catalog (${sportItems.length})`}>
        <div className="space-y-1.5">
          {sportItems.map((item) => (
            editingItemId === item.id ? (
              <div key={item.id} className="bg-surface rounded-xl shadow-card p-3 space-y-2">
                <input type="text" value={editItemName} onChange={(e) => setEditItemName(e.target.value)}
                  className="w-full bg-surface-3 rounded-xl px-3 py-2 text-sm border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                <input type="number" placeholder="Price (₱)" value={editItemPrice} onChange={(e) => setEditItemPrice(e.target.value)}
                  className="w-full bg-surface-3 rounded-xl px-3 py-2 text-sm border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                <div className="flex gap-2">
                  <button onClick={async () => {
                    const updates: Record<string, unknown> = {};
                    if (editItemName.trim() && editItemName.trim() !== item.name) updates.name = editItemName.trim();
                    if (editItemPrice && Number(editItemPrice) !== item.price) updates.price = Number(editItemPrice);
                    if (Object.keys(updates).length > 0) {
                      try { await updateItem(item.id, updates); } catch { toast.error('Could not update item.'); }
                    }
                    setEditingItemId(null);
                  }} className="flex-1 bg-primary hover:bg-primary-deep text-white py-3 rounded-xl text-xs font-semibold transition-colors">Save</button>
                  <button onClick={() => setEditingItemId(null)} className="flex-1 bg-surface-3 text-ink-2 py-3 rounded-xl text-xs font-semibold hover:bg-surface-2 transition-colors">Cancel</button>
                </div>
              </div>
            ) : (
              <div key={item.id} className="bg-surface rounded-xl shadow-card p-3 flex justify-between items-center">
                <button onClick={() => { setEditingItemId(item.id); setEditItemName(item.name); setEditItemPrice(String(item.price)); }} className="text-left">
                  <div className="font-medium text-sm">{item.name}</div>
                  <div className="text-xs text-ink-3">₱{item.price} · {item.type === 'rental' ? 'Rental' : 'Sale'}</div>
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateItem(item.id, { isActive: !item.isActive })}
                    className={`text-xs px-2 py-1 rounded ${item.isActive ? 'bg-signal-soft text-signal-text' : 'bg-surface-3 text-ink-3'}`}
                  >
                    {item.isActive ? 'Active' : 'Off'}
                  </button>
                  <button onClick={() => removeItem(item.id)} className="text-xs px-2 py-1 rounded text-warn">Remove</button>
                </div>
              </div>
            )
          ))}
        </div>

        {showAddItem ? (
          <div className="bg-surface rounded-xl shadow-card p-3 mt-2 space-y-2">
            <input type="text" placeholder="Item name" value={newItemName} onChange={(e) => setNewItemName(e.target.value)}
              className="w-full bg-surface-3 rounded-xl px-3 py-2 text-sm border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            <input type="number" placeholder="Price (₱)" value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)}
              className="w-full bg-surface-3 rounded-xl px-3 py-2 text-sm border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            <div className="flex gap-1.5">
              {(['rental', 'sale'] as const).map((t) => (
                <button key={t} onClick={() => setNewItemType(t)}
                  className={`flex-1 text-xs py-3 rounded-xl font-semibold transition-colors ${newItemType === t ? 'bg-primary text-white' : 'border border-line text-ink-2 hover:bg-surface-2'}`}
                >
                  {t === 'rental' ? 'Rental' : 'Sale'}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={async () => {
                if (!newItemName.trim() || !newItemPrice) return;
                try {
                  await addItem({ sportId, name: newItemName.trim(), price: Number(newItemPrice), type: newItemType, isActive: true });
                  setNewItemName(''); setNewItemPrice(''); setNewItemType('rental'); setShowAddItem(false);
                } catch { toast.error('Could not add item.'); }
              }} className="flex-1 bg-primary hover:bg-primary-deep text-white py-3 rounded-xl text-xs font-semibold transition-colors">Add Item</button>
              <button onClick={() => setShowAddItem(false)} className="flex-1 bg-surface-3 text-ink-2 py-3 rounded-xl text-xs font-semibold hover:bg-surface-2 transition-colors">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAddItem(true)} className="w-full mt-2 border border-dashed border-line text-ink-3 py-3 rounded-xl text-xs font-semibold hover:border-primary hover:text-primary transition-colors">
            + Add item
          </button>
        )}
      </Section>

      {/* Danger zone */}
      <button onClick={handleRemoveSport} className="text-xs text-warn hover:text-warn-text transition-colors">
        Remove {sport.name}
      </button>
    </>
  );
}

/* ── Main Settings Page ── */
export default function SettingsPage() {
  const { tenant, sports, courts, users, currentUser, isOnline, pendingSync, lastSyncedAt, updateTenant, addSport, createUser, refreshFromServer } = useStore();

  const [selectedSettingsSport, setSelectedSettingsSport] = useState<string | null>(null);
  const [editingFacility, setEditingFacility] = useState(false);
  const [facilityName, setFacilityName] = useState(tenant.name);

  // Payment policy
  const [editingPayment, setEditingPayment] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'full' | 'downpayment'>(tenant.paymentMode);
  const [downpaymentPerHour, setDownpaymentPerHour] = useState(String(tenant.downpaymentPerHour || ''));

  // Staff management
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffDisplayName, setStaffDisplayName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const tenantUsers = users.filter((u) => u.tenantId === tenant.id);
  const isAdmin = currentUser?.role === 'tenant_admin' || currentUser?.role === 'system_admin';

  // Add sport
  const [showAddSport, setShowAddSport] = useState(false);
  const [newSportName, setNewSportName] = useState('');

  const handleSaveFacility = async () => {
    try {
      await updateTenant({ name: facilityName });
      setEditingFacility(false);
    } catch {
      toast.error('Could not save facility name.');
    }
  };

  const handleAddSport = async (name: string) => {
    try {
      const id = await addSport({ name, operatingHoursRanges: [{ start: 6, end: 22 }] });
      setShowAddSport(false);
      setNewSportName('');
      setSelectedSettingsSport(id); // R21: immediately open config
    } catch {
      toast.error('Could not add sport.');
    }
  };

  const activeSports = sports.filter((s) => s.isActive);
  const isSingleSport = activeSports.length <= 1;

  // R22: Single-sport — show sport config inline (render SportConfigView directly)
  if (selectedSettingsSport || (isSingleSport && activeSports.length === 1 && !selectedSettingsSport)) {
    const sportIdToShow = selectedSettingsSport ?? activeSports[0]?.id;
    if (sportIdToShow && !isSingleSport) {
      // Multi-sport with a sport selected — show just the sport config
      return (
        <AppShell>
          <h1 className="font-display font-bold text-2xl md:text-3xl tracking-tight mb-5 text-ink">Settings</h1>
          <SportConfigView sportId={sportIdToShow} onBack={() => setSelectedSettingsSport(null)} />
        </AppShell>
      );
    }
  }

  return (
    <AppShell>
      <h1 className="font-display font-bold text-2xl md:text-3xl tracking-tight mb-5 md:mb-6 text-ink">Settings</h1>

      {/* Facility */}
      <Section title="Facility">
        {editingFacility ? (
          <div className="bg-surface rounded-xl shadow-card p-3 space-y-3">
            <div>
              <label className="text-xs text-ink-3 block mb-1">Name</label>
              <input type="text" value={facilityName} onChange={(e) => setFacilityName(e.target.value)}
                className="w-full bg-surface-3 rounded-xl px-3 py-2 text-sm border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveFacility} className="flex-1 bg-primary hover:bg-primary-deep text-white py-3 rounded-xl text-xs font-semibold transition-colors">Save</button>
              <button onClick={() => setEditingFacility(false)} className="flex-1 bg-surface-3 text-ink-2 py-3 rounded-xl text-xs font-semibold hover:bg-surface-2 transition-colors">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setEditingFacility(true)} className="w-full bg-surface rounded-xl shadow-card p-3 text-left">
            <div className="font-medium text-sm">{tenant.name}</div>
          </button>
        )}
      </Section>

      {/* Payment Policy */}
      <Section title="Payment policy">
        {editingPayment ? (
          <div className="bg-surface rounded-xl shadow-card p-3 space-y-3">
            <div className="flex gap-1.5">
              {(['full', 'downpayment'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setPaymentMode(mode);
                    if (mode === 'full') setDownpaymentPerHour('');
                  }}
                  className={`flex-1 text-xs py-3 rounded-xl font-semibold transition-colors ${
                    paymentMode === mode
                      ? 'bg-primary text-white'
                      : 'border border-line text-ink-2 hover:bg-surface-2'
                  }`}
                >
                  {mode === 'full' ? 'Full payment' : 'Downpayment'}
                </button>
              ))}
            </div>
            {paymentMode === 'downpayment' && (
              <div>
                <label className="text-xs text-ink-3 block mb-1">Downpayment per hour (₱)</label>
                <input
                  type="number"
                  value={downpaymentPerHour}
                  onChange={(e) => setDownpaymentPerHour(e.target.value)}
                  placeholder="e.g. 100"
                  className="w-full bg-surface-3 rounded-xl px-3 py-2 text-sm border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <p className="text-xs text-ink-3 mt-1.5">Remaining balance is collected at check-in.</p>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    await updateTenant({
                      paymentMode,
                      downpaymentPerHour: paymentMode === 'full' ? 0 : Number(downpaymentPerHour) || 0,
                    });
                    setEditingPayment(false);
                    toast.success('Payment policy updated');
                  } catch {
                    toast.error('Could not update payment policy.');
                  }
                }}
                className="flex-1 bg-primary hover:bg-primary-deep text-white py-3 rounded-xl text-xs font-semibold transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setPaymentMode(tenant.paymentMode);
                  setDownpaymentPerHour(String(tenant.downpaymentPerHour || ''));
                  setEditingPayment(false);
                }}
                className="flex-1 bg-surface-3 text-ink-2 py-3 rounded-xl text-xs font-semibold hover:bg-surface-2 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setEditingPayment(true)} className="w-full bg-surface rounded-xl shadow-card p-3 text-left">
            <div className="font-medium text-sm">
              {tenant.paymentMode === 'full' ? 'Full payment' : `Downpayment — ₱${tenant.downpaymentPerHour}/hr`}
            </div>
            <div className="text-xs text-ink-3 mt-1">
              {tenant.paymentMode === 'full'
                ? 'Full amount collected before confirming'
                : 'Balance collected at check-in'}
            </div>
            <div className="text-xs text-ink-3 mt-1.5">Tap to edit payment policy</div>
          </button>
        )}
      </Section>

      {/* Sports (R18, R19, R20, R22) */}
      {isSingleSport && activeSports.length === 1 ? (
        /* Single sport — inline config + add sport */
        <>
          <SportConfigView sportId={activeSports[0].id} onBack={() => {}} showBack={false} />
          <Section title="Add another sport">
            {showAddSport ? (
              <div className="bg-surface rounded-xl shadow-card p-3 space-y-2">
                <div className="text-xs text-ink-3 mb-1">Select or type a sport</div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {PRESET_SPORTS.filter((p) => !sports.some((s) => s.name === p)).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handleAddSport(preset)}
                      className="text-xs px-3 py-1.5 rounded-full bg-surface-3 text-ink-3 hover:bg-primary hover:text-white transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="Custom sport name" value={newSportName} onChange={(e) => setNewSportName(e.target.value)}
                    className="flex-1 bg-surface-3 rounded-xl px-3 py-2 text-sm border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                  <button onClick={() => newSportName.trim() && handleAddSport(newSportName.trim())} className="bg-primary hover:bg-primary-deep text-white px-4 py-3 rounded-xl text-xs font-semibold transition-colors">Add</button>
                </div>
                <button onClick={() => setShowAddSport(false)} className="w-full text-xs text-ink-3 py-1">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setShowAddSport(true)} className="w-full border border-dashed border-line text-ink-3 py-3 rounded-xl text-xs font-semibold hover:border-primary hover:text-primary transition-colors">
                + Add sport
              </button>
            )}
          </Section>
        </>
      ) : (
        /* Multi-sport — sport cards */
        <Section title="Sports">
          <div className="space-y-1.5">
            {activeSports.map((sport) => {
              const courtCount = courts.filter((c) => c.sportId === sport.id).length;
              return (
                <button
                  key={sport.id}
                  onClick={() => setSelectedSettingsSport(sport.id)}
                  className="w-full bg-surface rounded-xl shadow-card p-3 text-left hover:bg-surface-3 transition-colors flex justify-between items-center"
                >
                  <div>
                    <div className="font-medium text-sm">{sport.name}</div>
                    <div className="text-xs text-ink-3 mt-0.5">
                      {courtCount} court{courtCount !== 1 ? 's' : ''} · <OperatingHoursDisplay ranges={getTimeRanges(sport)} />
                    </div>
                  </div>
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-ink-4">
                    <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              );
            })}
          </div>

          {showAddSport ? (
            <div className="bg-surface rounded-xl shadow-card p-3 mt-2 space-y-2">
              <div className="text-xs text-ink-3 mb-1">Select or type a sport</div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {PRESET_SPORTS.filter((p) => !sports.some((s) => s.name === p)).map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleAddSport(preset)}
                    className="text-xs px-3 py-1.5 rounded-full bg-surface-3 text-ink-3 hover:bg-primary hover:text-white transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="Custom sport name" value={newSportName} onChange={(e) => setNewSportName(e.target.value)}
                  className="flex-1 bg-surface-3 rounded-xl px-3 py-2 text-sm border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                <button onClick={() => newSportName.trim() && handleAddSport(newSportName.trim())} className="bg-primary hover:bg-primary-deep text-white px-4 py-3 rounded-xl text-xs font-semibold transition-colors">Add</button>
              </div>
              <button onClick={() => setShowAddSport(false)} className="w-full text-xs text-ink-3 py-1">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setShowAddSport(true)} className="w-full mt-2 border border-dashed border-line text-ink-3 py-3 rounded-xl text-xs font-semibold hover:border-primary hover:text-primary transition-colors">
              + Add sport
            </button>
          )}
        </Section>
      )}

      {/* Staff management */}
      <Section title="Staff accounts">
        <div className="space-y-1.5">
          {tenantUsers.map((user) => (
            editingUserId === user.id && isAdmin ? (
              <div key={user.id} className="bg-surface rounded-xl shadow-card p-3 space-y-2">
                <div className="text-xs text-ink-3 mb-1">@{user.username} · {user.role === 'tenant_admin' ? 'Admin' : 'Staff'}</div>
                <input type="text" placeholder="Display name" value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)}
                  className="w-full bg-surface-3 rounded-xl px-3 py-2 text-sm border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                <input type="email" placeholder="Email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-surface-3 rounded-xl px-3 py-2 text-sm border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                <input type="text" placeholder="New password (leave blank to keep)" value={editPassword} onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full bg-surface-3 rounded-xl px-3 py-2 text-sm border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                <div className="flex gap-2">
                  <button onClick={async () => {
                    const updates: { userId: string; displayName?: string; email?: string; password?: string } = { userId: user.id };
                    if (editDisplayName.trim() && editDisplayName.trim() !== user.displayName) updates.displayName = editDisplayName.trim();
                    if (editEmail.trim() !== user.email) updates.email = editEmail.trim();
                    if (editPassword.trim()) updates.password = editPassword.trim();
                    if (Object.keys(updates).length > 1) {
                      try {
                        const success = await apiUpdateUser(updates);
                        if (success) {
                          toast.success('Staff updated');
                          await refreshFromServer();
                        } else {
                          toast.error('Could not update staff.');
                        }
                      } catch { toast.error('Could not update staff.'); }
                    }
                    setEditingUserId(null);
                    setEditPassword('');
                  }} className="flex-1 bg-primary hover:bg-primary-deep text-white py-3 rounded-xl text-xs font-semibold transition-colors">Save</button>
                  <button onClick={() => { setEditingUserId(null); setEditPassword(''); }} className="flex-1 bg-surface-3 text-ink-2 py-3 rounded-xl text-xs font-semibold hover:bg-surface-2 transition-colors">Cancel</button>
                </div>
              </div>
            ) : (
              <button
                key={user.id}
                onClick={() => {
                  if (!isAdmin) return;
                  setEditingUserId(user.id);
                  setEditDisplayName(user.displayName);
                  setEditEmail(user.email);
                  setEditPassword('');
                }}
                className={`w-full bg-surface rounded-xl shadow-card p-3 flex justify-between items-center text-left ${isAdmin ? 'hover:bg-surface-3 transition-colors' : ''}`}
              >
                <div>
                  <div className="font-medium text-sm">{user.displayName}</div>
                  <div className="text-xs text-ink-3">@{user.username} · {user.role.replace('_', ' ')}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${user.role === 'tenant_admin' ? 'bg-primary-soft text-primary-deep' : 'bg-signal-soft text-signal-text'}`}>
                  {user.role === 'tenant_admin' ? 'Admin' : 'Staff'}
                </span>
              </button>
            )
          ))}
        </div>

        {isAdmin && (
          showAddStaff ? (
            <div className="bg-surface rounded-xl shadow-card p-3 mt-2 space-y-2">
              <input type="text" placeholder="Display name" value={staffDisplayName} onChange={(e) => setStaffDisplayName(e.target.value)}
                className="w-full bg-surface-3 rounded-xl px-3 py-2 text-sm border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              <UsernameInput
                value={staffUsername}
                onChange={setStaffUsername}
                placeholder="Username"
                className="bg-surface-3 rounded-xl px-3 py-2 pr-10 text-sm border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <input type="email" placeholder="Email" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)}
                className="w-full bg-surface-3 rounded-xl px-3 py-2 text-sm border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              <input type="text" placeholder="Password" value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)}
                className="w-full bg-surface-3 rounded-xl px-3 py-2 text-sm border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              <div className="flex gap-2">
                <button onClick={() => {
                  if (!staffUsername.trim() || !staffPassword.trim() || !staffDisplayName.trim()) return;
                  createUser({ username: staffUsername.trim(), password: staffPassword.trim(), role: 'tenant_staff', displayName: staffDisplayName.trim(), email: staffEmail.trim() });
                  setStaffUsername(''); setStaffPassword(''); setStaffDisplayName(''); setStaffEmail('');
                  setShowAddStaff(false);
                }} className="flex-1 bg-primary hover:bg-primary-deep text-white py-3 rounded-xl text-xs font-semibold transition-colors">Add Staff</button>
                <button onClick={() => setShowAddStaff(false)} className="flex-1 bg-surface-3 text-ink-2 py-3 rounded-xl text-xs font-semibold hover:bg-surface-2 transition-colors">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddStaff(true)} className="w-full mt-2 border border-dashed border-line text-ink-3 py-3 rounded-xl text-xs font-semibold hover:border-primary hover:text-primary transition-colors">
              + Add staff member
            </button>
          )
        )}

      </Section>

      {/* Quick links */}
      <Section title="More">
        <div className="space-y-1.5">
          <Link href="/members" className="w-full bg-surface rounded-xl shadow-card p-3 flex justify-between items-center">
            <div>
              <div className="font-medium text-sm">Members</div>
              <div className="text-xs text-ink-3">Manage your member roster</div>
            </div>
            <span className="text-ink-3">&rarr;</span>
          </Link>
          {(currentUser?.role === 'tenant_admin' || currentUser?.role === 'system_admin') && (
            <Link href="/billing" className="w-full bg-surface rounded-xl shadow-card p-3 flex justify-between items-center">
              <div>
                <div className="font-medium text-sm">Billing</div>
                <div className="text-xs text-ink-3">Plan, payment, and account status</div>
              </div>
              <span className="text-ink-3">&rarr;</span>
            </Link>
          )}
        </div>
      </Section>

      {/* Connection */}
      <Section title="Connection">
        <div className="bg-surface rounded-xl shadow-card p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">Server</span>
            <span className="text-xs px-2 py-1 rounded bg-signal-soft text-signal-text">Connected</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Network</span>
            <span className={`text-xs px-2 py-1 rounded ${isOnline ? 'bg-signal-soft text-signal-text' : 'bg-pending-bg text-pending-text'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          {pendingSync > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm">Pending sync</span>
              <span className="text-xs px-2 py-1 rounded bg-primary-soft text-primary-deep">{pendingSync} queued</span>
            </div>
          )}
          {lastSyncedAt && (
            <div className="text-xs text-ink-3">Last synced: {new Date(lastSyncedAt).toLocaleString()}</div>
          )}
        </div>
      </Section>
    </AppShell>
  );
}
