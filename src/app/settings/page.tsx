'use client';

import { Header } from '@/components/header';
import { BottomNav } from '@/components/bottom-nav';
import { useStore } from '@/store';
import { useState } from 'react';
import { ItemType } from '@/lib/types';
import Link from 'next/link';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="font-mono text-[9px] tracking-wider uppercase text-ink-3 mb-2">{title}</div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { tenant, courts, items, users, isOnline, pendingSync, lastSyncedAt, updateTenant, addCourt, updateCourt, removeCourt, addItem, updateItem, removeItem, createUser } = useStore();

  const [editingFacility, setEditingFacility] = useState(false);

  // Staff management
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffDisplayName, setStaffDisplayName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');

  const tenantUsers = users.filter((u) => u.tenantId === tenant.id);
  const [facilityName, setFacilityName] = useState(tenant.name);
  const [hoursStart, setHoursStart] = useState(tenant.operatingHoursStart);
  const [hoursEnd, setHoursEnd] = useState(tenant.operatingHoursEnd);

  const [showAddCourt, setShowAddCourt] = useState(false);
  const [newCourtName, setNewCourtName] = useState('');
  const [newCourtRate, setNewCourtRate] = useState('');

  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemType, setNewItemType] = useState<ItemType>('rental');

  const handleSaveFacility = () => {
    updateTenant({ name: facilityName, operatingHoursStart: hoursStart, operatingHoursEnd: hoursEnd });
    setEditingFacility(false);
  };

  const handleAddCourt = () => {
    if (!newCourtName.trim() || !newCourtRate) return;
    addCourt({ tenantId: tenant.id, name: newCourtName.trim(), hourlyRate: Number(newCourtRate), isActive: true });
    setNewCourtName('');
    setNewCourtRate('');
    setShowAddCourt(false);
  };

  const handleAddItem = () => {
    if (!newItemName.trim() || !newItemPrice) return;
    addItem({ tenantId: tenant.id, name: newItemName.trim(), price: Number(newItemPrice), type: newItemType, isActive: true });
    setNewItemName('');
    setNewItemPrice('');
    setNewItemType('rental');
    setShowAddItem(false);
  };

  return (
    <div className="min-h-screen bg-cream max-w-lg mx-auto">
      <div className="px-5 pt-4 pb-20">
        <Header />

        <h1 className="font-display font-light text-2xl tracking-tight mb-4">Settings</h1>

        {/* Facility */}
        <Section title="Facility">
          {editingFacility ? (
            <div className="bg-paper rounded-card p-3 space-y-3">
              <div>
                <label className="font-mono text-[8px] text-ink-3 tracking-wider uppercase block mb-1">Name</label>
                <input type="text" value={facilityName} onChange={(e) => setFacilityName(e.target.value)}
                  className="w-full bg-paper-2 rounded-lg px-3 py-2 text-sm font-sans border border-line focus:outline-none focus:border-ink" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-mono text-[8px] text-ink-3 tracking-wider uppercase block mb-1">Opens</label>
                  <input type="number" min={0} max={23} value={hoursStart} onChange={(e) => setHoursStart(Number(e.target.value))}
                    className="w-full bg-paper-2 rounded-lg px-3 py-2 text-sm font-mono border border-line focus:outline-none focus:border-ink" />
                </div>
                <div>
                  <label className="font-mono text-[8px] text-ink-3 tracking-wider uppercase block mb-1">Closes</label>
                  <input type="number" min={1} max={24} value={hoursEnd} onChange={(e) => setHoursEnd(Number(e.target.value))}
                    className="w-full bg-paper-2 rounded-lg px-3 py-2 text-sm font-mono border border-line focus:outline-none focus:border-ink" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSaveFacility} className="flex-1 bg-ink text-paper py-2.5 rounded-lg font-sans text-xs font-medium">Save</button>
                <button onClick={() => setEditingFacility(false)} className="flex-1 border border-line text-ink-3 py-2.5 rounded-lg font-sans text-xs font-medium">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setEditingFacility(true)} className="w-full bg-paper rounded-card p-3 text-left">
              <div className="font-medium text-sm">{tenant.name}</div>
              <div className="font-mono text-[9px] text-ink-3 tracking-wide mt-0.5">
                {tenant.operatingHoursStart}:00 – {tenant.operatingHoursEnd}:00 · {tenant.courtCount} courts
              </div>
            </button>
          )}
        </Section>

        {/* Courts */}
        <Section title="Courts">
          <div className="space-y-1.5">
            {courts.map((court) => (
              <div key={court.id} className="bg-paper rounded-card p-3 flex justify-between items-center">
                <div>
                  <div className="font-medium text-sm">{court.name}</div>
                  <div className="font-mono text-[9px] text-ink-3">₱{court.hourlyRate}/hr</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateCourt(court.id, { isActive: !court.isActive })}
                    className={`font-mono text-[8px] tracking-wider uppercase px-2 py-1 rounded ${
                      court.isActive ? 'bg-status-checked-bg text-signal' : 'bg-paper-2 text-ink-3'
                    }`}
                  >
                    {court.isActive ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => removeCourt(court.id)}
                    className="font-mono text-[8px] tracking-wider uppercase px-2 py-1 rounded text-warn"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {showAddCourt ? (
            <div className="bg-paper rounded-card p-3 mt-2 space-y-2">
              <input type="text" placeholder="Court name" value={newCourtName} onChange={(e) => setNewCourtName(e.target.value)}
                className="w-full bg-paper-2 rounded-lg px-3 py-2 text-sm font-sans border border-line focus:outline-none focus:border-ink" />
              <input type="number" placeholder="Hourly rate (₱)" value={newCourtRate} onChange={(e) => setNewCourtRate(e.target.value)}
                className="w-full bg-paper-2 rounded-lg px-3 py-2 text-sm font-mono border border-line focus:outline-none focus:border-ink" />
              <div className="flex gap-2">
                <button onClick={handleAddCourt} className="flex-1 bg-ink text-paper py-2.5 rounded-lg font-sans text-xs font-medium">Add Court</button>
                <button onClick={() => setShowAddCourt(false)} className="flex-1 border border-line text-ink-3 py-2.5 rounded-lg font-sans text-xs font-medium">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddCourt(true)} className="w-full mt-2 border border-dashed border-line text-ink-3 py-2.5 rounded-card font-mono text-[9px] tracking-wider uppercase">
              + Add court
            </button>
          )}
        </Section>

        {/* Item catalog */}
        <Section title="Item catalog">
          <div className="space-y-1.5">
            {items.map((item) => (
              <div key={item.id} className="bg-paper rounded-card p-3 flex justify-between items-center">
                <div>
                  <div className="font-medium text-sm">{item.name}</div>
                  <div className="font-mono text-[9px] text-ink-3">
                    ₱{item.price} · {item.type === 'rental' ? 'Rental' : 'Sale'}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateItem(item.id, { isActive: !item.isActive })}
                    className={`font-mono text-[8px] tracking-wider uppercase px-2 py-1 rounded ${
                      item.isActive ? 'bg-status-checked-bg text-signal' : 'bg-paper-2 text-ink-3'
                    }`}
                  >
                    {item.isActive ? 'Active' : 'Off'}
                  </button>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="font-mono text-[8px] tracking-wider uppercase px-2 py-1 rounded text-warn"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {showAddItem ? (
            <div className="bg-paper rounded-card p-3 mt-2 space-y-2">
              <input type="text" placeholder="Item name" value={newItemName} onChange={(e) => setNewItemName(e.target.value)}
                className="w-full bg-paper-2 rounded-lg px-3 py-2 text-sm font-sans border border-line focus:outline-none focus:border-ink" />
              <input type="number" placeholder="Price (₱)" value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)}
                className="w-full bg-paper-2 rounded-lg px-3 py-2 text-sm font-mono border border-line focus:outline-none focus:border-ink" />
              <div className="flex gap-1.5">
                {(['rental', 'sale'] as const).map((t) => (
                  <button key={t} onClick={() => setNewItemType(t)}
                    className={`flex-1 font-mono text-[9px] tracking-wider uppercase py-2 rounded-lg ${
                      newItemType === t ? 'bg-ink text-paper' : 'border border-line text-ink-2'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddItem} className="flex-1 bg-ink text-paper py-2.5 rounded-lg font-sans text-xs font-medium">Add Item</button>
                <button onClick={() => setShowAddItem(false)} className="flex-1 border border-line text-ink-3 py-2.5 rounded-lg font-sans text-xs font-medium">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddItem(true)} className="w-full mt-2 border border-dashed border-line text-ink-3 py-2.5 rounded-card font-mono text-[9px] tracking-wider uppercase">
              + Add item
            </button>
          )}
        </Section>

        {/* Staff management */}
        <Section title="Staff accounts">
          <div className="space-y-1.5">
            {tenantUsers.map((user) => (
              <div key={user.id} className="bg-paper rounded-card p-3 flex justify-between items-center">
                <div>
                  <div className="font-medium text-sm">{user.displayName}</div>
                  <div className="font-mono text-[9px] text-ink-3">
                    @{user.username} · {user.role.replace('_', ' ')}
                  </div>
                </div>
                <span className={`font-mono text-[8px] tracking-wider uppercase px-2 py-1 rounded ${
                  user.role === 'tenant_admin' ? 'bg-accent-soft text-accent-deep' : 'bg-status-checked-bg text-signal'
                }`}>
                  {user.role === 'tenant_admin' ? 'Admin' : 'Staff'}
                </span>
              </div>
            ))}
          </div>

          {showAddStaff ? (
            <div className="bg-paper rounded-card p-3 mt-2 space-y-2">
              <input type="text" placeholder="Display name" value={staffDisplayName} onChange={(e) => setStaffDisplayName(e.target.value)}
                className="w-full bg-paper-2 rounded-lg px-3 py-2 text-sm font-sans border border-line focus:outline-none focus:border-ink" />
              <input type="text" placeholder="Username" value={staffUsername} onChange={(e) => setStaffUsername(e.target.value)}
                className="w-full bg-paper-2 rounded-lg px-3 py-2 text-sm font-mono border border-line focus:outline-none focus:border-ink" />
              <input type="email" placeholder="Email" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)}
                className="w-full bg-paper-2 rounded-lg px-3 py-2 text-sm font-sans border border-line focus:outline-none focus:border-ink" />
              <input type="text" placeholder="Password" value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)}
                className="w-full bg-paper-2 rounded-lg px-3 py-2 text-sm font-mono border border-line focus:outline-none focus:border-ink" />
              <div className="flex gap-2">
                <button onClick={() => {
                  if (!staffUsername.trim() || !staffPassword.trim() || !staffDisplayName.trim()) return;
                  createUser({ username: staffUsername.trim(), password: staffPassword.trim(), role: 'tenant_staff', displayName: staffDisplayName.trim(), email: staffEmail.trim() });
                  setStaffUsername(''); setStaffPassword(''); setStaffDisplayName(''); setStaffEmail('');
                  setShowAddStaff(false);
                }} className="flex-1 bg-ink text-paper py-2.5 rounded-lg font-sans text-xs font-medium">Add Staff</button>
                <button onClick={() => setShowAddStaff(false)} className="flex-1 border border-line text-ink-3 py-2.5 rounded-lg font-sans text-xs font-medium">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddStaff(true)} className="w-full mt-2 border border-dashed border-line text-ink-3 py-2.5 rounded-card font-mono text-[9px] tracking-wider uppercase">
              + Add staff member
            </button>
          )}

          <Link href="/checkin" className="w-full bg-paper rounded-card p-3 flex justify-between items-center mt-2 block">
            <div>
              <div className="font-medium text-sm">Staff Check-in View</div>
              <div className="font-mono text-[9px] text-ink-3 tracking-wide">QR scanner and arrival list</div>
            </div>
            <span className="font-mono text-ink-3">→</span>
          </Link>
        </Section>

        {/* Connection */}
        <Section title="Connection">
          <div className="bg-paper rounded-card p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Server</span>
              <span className="font-mono text-[8px] tracking-wider uppercase px-2 py-1 rounded bg-status-checked-bg text-signal">
                Connected
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Network</span>
              <span className={`font-mono text-[8px] tracking-wider uppercase px-2 py-1 rounded ${
                isOnline ? 'bg-status-checked-bg text-signal' : 'bg-status-pending-bg text-status-pending-text'
              }`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            {pendingSync > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm">Pending sync</span>
                <span className="font-mono text-[8px] tracking-wider uppercase px-2 py-1 rounded bg-accent-soft text-status-confirmed-text">
                  {pendingSync} queued
                </span>
              </div>
            )}
            {lastSyncedAt && (
              <div className="font-mono text-[9px] text-ink-3">
                Last synced: {new Date(lastSyncedAt).toLocaleString()}
              </div>
            )}
          </div>
        </Section>

      </div>

      <BottomNav />
    </div>
  );
}
