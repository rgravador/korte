'use client';

import { useStore } from '@/store';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ItemType } from '@/lib/types';
import { setupTenantOnline, isSupabaseConfigured } from '@/lib/sync';

type Step = 'welcome' | 'facility' | 'courts' | 'items' | 'review';

const SUGGESTED_ITEMS = [
  { name: 'Paddle Rental', price: 100, type: 'rental' as ItemType },
  { name: 'Shoe Rental', price: 80, type: 'rental' as ItemType },
  { name: 'Towel Rental', price: 50, type: 'rental' as ItemType },
  { name: 'Pickleball (Franklin X-40)', price: 250, type: 'sale' as ItemType },
  { name: 'Grip Tape', price: 150, type: 'sale' as ItemType },
  { name: 'Bottled Water', price: 35, type: 'sale' as ItemType },
];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-1.5 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-colors ${
            i <= current ? 'bg-ink' : 'bg-line'
          }`}
        />
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const { setupTenant, isOnboarded, currentUser } = useStore();
  const router = useRouter();

  const [step, setStep] = useState<Step>('welcome');

  // Facility info
  const [facilityName, setFacilityName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [hoursStart, setHoursStart] = useState(6);
  const [hoursEnd, setHoursEnd] = useState(22);

  // Courts
  const [courts, setCourts] = useState<{ name: string; hourlyRate: number }[]>([
    { name: 'Court 1', hourlyRate: 400 },
  ]);

  // Items
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [customItems, setCustomItems] = useState<{ name: string; price: number; type: ItemType }[]>([]);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customType, setCustomType] = useState<ItemType>('rental');

  // Redirect if already onboarded and logged in
  useEffect(() => {
    if (isOnboarded && currentUser) {
      router.replace('/dashboard');
    }
  }, [isOnboarded, currentUser, router]);

  const subdomain = facilityName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 20);

  const addCourt = () => {
    setCourts([...courts, { name: `Court ${courts.length + 1}`, hourlyRate: 400 }]);
  };

  const updateCourt = (index: number, field: 'name' | 'hourlyRate', value: string | number) => {
    const updated = [...courts];
    if (field === 'name') {
      updated[index] = { ...updated[index], name: value as string };
    } else {
      updated[index] = { ...updated[index], hourlyRate: Number(value) };
    }
    setCourts(updated);
  };

  const removeCourt = (index: number) => {
    if (courts.length <= 1) return;
    setCourts(courts.filter((_, i) => i !== index));
  };

  const toggleSuggestedItem = (index: number) => {
    const next = new Set(selectedItems);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedItems(next);
  };

  const addCustomItem = () => {
    if (!customName.trim() || !customPrice) return;
    setCustomItems([...customItems, { name: customName.trim(), price: Number(customPrice), type: customType }]);
    setCustomName('');
    setCustomPrice('');
    setShowAddCustom(false);
  };

  const allItems = [
    ...Array.from(selectedItems).map((i) => SUGGESTED_ITEMS[i]),
    ...customItems,
  ];

  const handleFinish = async () => {
    // Save locally first (instant, works offline)
    setupTenant({
      name: facilityName,
      ownerName,
      ownerEmail,
      subdomain,
      operatingHoursStart: hoursStart,
      operatingHoursEnd: hoursEnd,
      courts,
      items: allItems,
    });

    // Persist to Supabase if online + configured
    if (isSupabaseConfigured) {
      await setupTenantOnline({
        name: facilityName,
        subdomain,
        operatingHoursStart: hoursStart,
        operatingHoursEnd: hoursEnd,
        ownerName,
        ownerEmail,
        ownerPassword: 'admin123', // default password for new tenants
        courts,
        items: allItems,
      });
    }

    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-cream max-w-lg mx-auto">
      <div className="px-5 pt-8 pb-12">

        {/* Welcome */}
        {step === 'welcome' && (
          <div className="min-h-[80vh] flex flex-col justify-center">
            <div className="font-display font-normal italic text-lg tracking-tight mb-8">
              Court<span className="text-accent-deep not-italic">.</span>
            </div>

            <h1 className="font-display font-light text-4xl leading-tight tracking-tight mb-3">
              Set up your<br />
              <em className="text-accent-deep">pickleball facility.</em>
            </h1>

            <p className="text-ink-2 text-sm mb-2 max-w-[32ch]">
              Get your courts online in under 5 minutes. Staff can start managing bookings right away.
            </p>

            <p className="font-mono text-[9px] text-ink-3 tracking-wider uppercase mb-8">
              No credit card required · Free during setup
            </p>

            <button
              onClick={() => setStep('facility')}
              className="w-full bg-ink text-paper py-4 rounded-lg font-sans text-sm font-medium flex justify-between items-center px-5"
            >
              <span>Get Started</span>
              <span className="font-mono">→</span>
            </button>

            <button
              onClick={() => {
                useStore.getState().resetData();
                router.push('/dashboard');
              }}
              className="w-full mt-3 text-ink-3 py-3 font-mono text-[10px] tracking-wider uppercase"
            >
              Load demo data instead
            </button>
          </div>
        )}

        {/* Facility Info */}
        {step === 'facility' && (
          <>
            <StepIndicator current={0} total={4} />

            <h1 className="font-display font-light text-2xl tracking-tight mb-1">
              Your <em className="text-accent-deep">facility.</em>
            </h1>
            <p className="font-mono text-[9px] text-ink-3 tracking-wider uppercase mb-6">
              Step 1 of 4 · Basic info
            </p>

            <div className="space-y-4">
              <div>
                <label className="font-mono text-[8px] text-ink-3 tracking-wider uppercase block mb-1.5">Facility name</label>
                <input
                  type="text"
                  placeholder="e.g. QC Pickle Hub"
                  value={facilityName}
                  onChange={(e) => setFacilityName(e.target.value)}
                  className="w-full bg-paper rounded-lg px-4 py-3 text-sm font-sans border border-line focus:outline-none focus:border-ink"
                />
                {subdomain && (
                  <p className="font-mono text-[9px] text-ink-3 mt-1.5">
                    Your URL: <span className="text-ink">{subdomain}.courtbooks.app</span>
                  </p>
                )}
              </div>

              <div>
                <label className="font-mono text-[8px] text-ink-3 tracking-wider uppercase block mb-1.5">Your name</label>
                <input
                  type="text"
                  placeholder="e.g. Marco Reyes"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full bg-paper rounded-lg px-4 py-3 text-sm font-sans border border-line focus:outline-none focus:border-ink"
                />
              </div>

              <div>
                <label className="font-mono text-[8px] text-ink-3 tracking-wider uppercase block mb-1.5">Email</label>
                <input
                  type="email"
                  placeholder="marco@qcpicklehub.com"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className="w-full bg-paper rounded-lg px-4 py-3 text-sm font-sans border border-line focus:outline-none focus:border-ink"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-mono text-[8px] text-ink-3 tracking-wider uppercase block mb-1.5">Opens at</label>
                  <select
                    value={hoursStart}
                    onChange={(e) => setHoursStart(Number(e.target.value))}
                    className="w-full bg-paper rounded-lg px-4 py-3 text-sm font-mono border border-line focus:outline-none focus:border-ink"
                  >
                    {Array.from({ length: 18 }, (_, i) => i + 4).map((h) => (
                      <option key={h} value={h}>{h}:00</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-mono text-[8px] text-ink-3 tracking-wider uppercase block mb-1.5">Closes at</label>
                  <select
                    value={hoursEnd}
                    onChange={(e) => setHoursEnd(Number(e.target.value))}
                    className="w-full bg-paper rounded-lg px-4 py-3 text-sm font-mono border border-line focus:outline-none focus:border-ink"
                  >
                    {Array.from({ length: 18 }, (_, i) => i + 7).map((h) => (
                      <option key={h} value={h}>{h}:00</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep('welcome')}
                className="flex-1 border border-line text-ink-3 py-3 rounded-lg font-sans text-xs font-medium"
              >
                Back
              </button>
              <button
                onClick={() => setStep('courts')}
                disabled={!facilityName.trim() || !ownerName.trim()}
                className="flex-1 bg-ink text-paper py-3 rounded-lg font-sans text-xs font-medium disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </>
        )}

        {/* Courts */}
        {step === 'courts' && (
          <>
            <StepIndicator current={1} total={4} />

            <h1 className="font-display font-light text-2xl tracking-tight mb-1">
              Your <em className="text-accent-deep">courts.</em>
            </h1>
            <p className="font-mono text-[9px] text-ink-3 tracking-wider uppercase mb-6">
              Step 2 of 4 · How many pickleball courts?
            </p>

            <div className="space-y-2">
              {courts.map((court, index) => (
                <div key={index} className="bg-paper rounded-card p-3 flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="font-mono text-[8px] text-ink-3 tracking-wider uppercase block mb-1">Name</label>
                    <input
                      type="text"
                      value={court.name}
                      onChange={(e) => updateCourt(index, 'name', e.target.value)}
                      className="w-full bg-paper-2 rounded-lg px-3 py-2.5 text-sm font-sans border border-line focus:outline-none focus:border-ink"
                    />
                  </div>
                  <div className="w-28">
                    <label className="font-mono text-[8px] text-ink-3 tracking-wider uppercase block mb-1">₱/hour</label>
                    <input
                      type="number"
                      value={court.hourlyRate}
                      onChange={(e) => updateCourt(index, 'hourlyRate', e.target.value)}
                      className="w-full bg-paper-2 rounded-lg px-3 py-2.5 text-sm font-mono border border-line focus:outline-none focus:border-ink"
                    />
                  </div>
                  {courts.length > 1 && (
                    <button
                      onClick={() => removeCourt(index)}
                      className="text-warn font-mono text-[9px] tracking-wider uppercase pb-2.5"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={addCourt}
              className="w-full mt-3 border border-dashed border-line text-ink-3 py-3 rounded-card font-mono text-[9px] tracking-wider uppercase"
            >
              + Add another court
            </button>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep('facility')}
                className="flex-1 border border-line text-ink-3 py-3 rounded-lg font-sans text-xs font-medium"
              >
                Back
              </button>
              <button
                onClick={() => setStep('items')}
                className="flex-1 bg-ink text-paper py-3 rounded-lg font-sans text-xs font-medium"
              >
                Next
              </button>
            </div>
          </>
        )}

        {/* Items */}
        {step === 'items' && (
          <>
            <StepIndicator current={2} total={4} />

            <h1 className="font-display font-light text-2xl tracking-tight mb-1">
              Rentals & <em className="text-accent-deep">extras.</em>
            </h1>
            <p className="font-mono text-[9px] text-ink-3 tracking-wider uppercase mb-2">
              Step 3 of 4 · Equipment and items to sell
            </p>
            <p className="text-ink-2 text-xs mb-5">
              Select items your facility offers. Staff can add these when creating bookings. You can always change this later.
            </p>

            <div className="font-mono text-[9px] text-ink-3 tracking-wider uppercase mb-2">Suggested items</div>
            <div className="space-y-1.5 mb-4">
              {SUGGESTED_ITEMS.map((item, index) => {
                const isSelected = selectedItems.has(index);
                return (
                  <button
                    key={index}
                    onClick={() => toggleSuggestedItem(index)}
                    className={`w-full bg-paper rounded-card p-3 flex justify-between items-center text-left transition-colors ${
                      isSelected ? 'ring-1 ring-ink' : ''
                    }`}
                  >
                    <div>
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="font-mono text-[9px] text-ink-3">
                        ₱{item.price} · {item.type === 'rental' ? 'Rental' : 'Sale'}
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-ink border-ink' : 'border-line'
                      }`}
                    >
                      {isSelected && (
                        <svg viewBox="0 0 16 16" className="w-3 h-3 text-paper">
                          <path d="M3 8l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom items */}
            {customItems.length > 0 && (
              <>
                <div className="font-mono text-[9px] text-ink-3 tracking-wider uppercase mb-2">Your items</div>
                <div className="space-y-1.5 mb-4">
                  {customItems.map((item, index) => (
                    <div key={index} className="bg-paper rounded-card p-3 flex justify-between items-center">
                      <div>
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="font-mono text-[9px] text-ink-3">₱{item.price} · {item.type}</div>
                      </div>
                      <button
                        onClick={() => setCustomItems(customItems.filter((_, i) => i !== index))}
                        className="text-warn font-mono text-[9px]"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {showAddCustom ? (
              <div className="bg-paper rounded-card p-3 space-y-2 mb-4">
                <input
                  type="text"
                  placeholder="Item name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-paper-2 rounded-lg px-3 py-2.5 text-sm font-sans border border-line focus:outline-none focus:border-ink"
                />
                <input
                  type="number"
                  placeholder="Price (₱)"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="w-full bg-paper-2 rounded-lg px-3 py-2.5 text-sm font-mono border border-line focus:outline-none focus:border-ink"
                />
                <div className="flex gap-1.5">
                  {(['rental', 'sale'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setCustomType(t)}
                      className={`flex-1 font-mono text-[9px] tracking-wider uppercase py-2 rounded-lg ${
                        customType === t ? 'bg-ink text-paper' : 'border border-line text-ink-2'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={addCustomItem} className="flex-1 bg-ink text-paper py-2.5 rounded-lg font-sans text-xs font-medium">Add</button>
                  <button onClick={() => setShowAddCustom(false)} className="flex-1 border border-line text-ink-3 py-2.5 rounded-lg font-sans text-xs font-medium">Cancel</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddCustom(true)}
                className="w-full border border-dashed border-line text-ink-3 py-3 rounded-card font-mono text-[9px] tracking-wider uppercase mb-4"
              >
                + Add custom item
              </button>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setStep('courts')}
                className="flex-1 border border-line text-ink-3 py-3 rounded-lg font-sans text-xs font-medium"
              >
                Back
              </button>
              <button
                onClick={() => setStep('review')}
                className="flex-1 bg-ink text-paper py-3 rounded-lg font-sans text-xs font-medium"
              >
                Next
              </button>
            </div>
          </>
        )}

        {/* Review */}
        {step === 'review' && (
          <>
            <StepIndicator current={3} total={4} />

            <h1 className="font-display font-light text-2xl tracking-tight mb-1">
              Ready to <em className="text-accent-deep">launch.</em>
            </h1>
            <p className="font-mono text-[9px] text-ink-3 tracking-wider uppercase mb-6">
              Step 4 of 4 · Review your setup
            </p>

            {/* Facility summary */}
            <div className="bg-paper rounded-card p-4 mb-3">
              <div className="font-mono text-[8px] text-ink-3 tracking-wider uppercase mb-2">Facility</div>
              <div className="font-display text-lg font-light mb-1">{facilityName}</div>
              <div className="font-mono text-[9px] text-ink-3">
                {subdomain}.courtbooks.app · {hoursStart}:00–{hoursEnd}:00
              </div>
              <div className="font-mono text-[9px] text-ink-3 mt-1">
                Owner: {ownerName} · {ownerEmail}
              </div>
            </div>

            {/* Courts summary */}
            <div className="bg-paper rounded-card p-4 mb-3">
              <div className="font-mono text-[8px] text-ink-3 tracking-wider uppercase mb-2">
                {courts.length} Court{courts.length !== 1 ? 's' : ''}
              </div>
              {courts.map((court, i) => (
                <div key={i} className="flex justify-between py-1.5 border-b border-line-2 last:border-0">
                  <span className="text-sm">{court.name}</span>
                  <span className="font-mono text-[10px] text-ink-3">₱{court.hourlyRate}/hr</span>
                </div>
              ))}
            </div>

            {/* Items summary */}
            <div className="bg-paper rounded-card p-4 mb-6">
              <div className="font-mono text-[8px] text-ink-3 tracking-wider uppercase mb-2">
                {allItems.length} Item{allItems.length !== 1 ? 's' : ''}
              </div>
              {allItems.length === 0 ? (
                <div className="text-xs text-ink-3">No items — you can add them later in Settings</div>
              ) : (
                allItems.map((item, i) => (
                  <div key={i} className="flex justify-between py-1.5 border-b border-line-2 last:border-0">
                    <span className="text-sm">{item.name}</span>
                    <span className="font-mono text-[10px] text-ink-3">₱{item.price} · {item.type}</span>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={handleFinish}
              className="w-full bg-ink text-paper py-4 rounded-lg font-sans text-sm font-medium flex justify-between items-center px-5"
            >
              <span>Launch {facilityName || 'your facility'}</span>
              <span className="font-mono">→</span>
            </button>

            <button
              onClick={() => setStep('items')}
              className="w-full mt-3 border border-line text-ink-3 py-3 rounded-lg font-sans text-xs font-medium"
            >
              Back
            </button>
          </>
        )}

      </div>
    </div>
  );
}
