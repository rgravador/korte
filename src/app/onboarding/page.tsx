'use client';

import { useStore } from '@/store';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ItemType, TimeRange } from '@/lib/types';
import { apiRegister, apiHydrate } from '@/lib/api';
import { OperatingHoursEditor } from '@/components/operating-hours-editor';
import { UsernameInput } from '@/components/username-input';

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
    <div className="flex gap-1.5 mb-6" role="progressbar" aria-valuenow={current} aria-valuemin={0} aria-valuemax={total} aria-label={`Step ${current + 1} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-colors ${
            i <= current ? 'bg-primary' : 'bg-line'
          }`}
        />
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const { isOnboarded, currentUser, hydrateFromRemote } = useStore();
  const router = useRouter();

  const [step, setStep] = useState<Step>('welcome');

  // Facility info
  const [facilityName, setFacilityName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerUsername, setOwnerUsername] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hoursRanges, setHoursRanges] = useState<TimeRange[]>([{ start: 6, end: 22 }]);

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

  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState('');

  const handleFinish = async () => {
    setRegistering(true);
    setRegisterError('');

    const sorted = [...hoursRanges].sort((a, b) => a.start - b.start);

    try {
      console.debug('[onboarding] Registering via API...');
      const result = await apiRegister({
        name: facilityName,
        subdomain,
        operatingHoursStart: sorted[0].start,
        operatingHoursEnd: sorted[sorted.length - 1].end,
        ownerName,
        ownerEmail,
        ownerUsername,
        ownerPassword,
        courts,
        items: allItems,
      });

      if (result?.tenant && result?.user) {
        console.debug('[onboarding] API OK, hydrating...');
        const data = await apiHydrate(result.tenant.id);
        if (data) {
          hydrateFromRemote(data);
          useStore.setState({ currentUser: result.user, isOnboarded: true });
          router.push('/dashboard');
          return;
        }
        // Hydrate failed but tenant was created — still navigate
        useStore.setState({ currentUser: result.user, isOnboarded: true });
        router.push('/dashboard');
        return;
      }

      console.error('[onboarding] API registration failed');
      setRegisterError('Could not save to server. Check your connection and try again.');
    } catch (err) {
      console.error('[onboarding] Registration error:', err);
      setRegisterError('Network error. Check your connection and try again.');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="px-5 pt-8 pb-12">

        {/* Welcome */}
        {step === 'welcome' && (
          <div className="min-h-[80vh] flex flex-col justify-center">
            <div className="font-sans font-bold text-lg tracking-tight mb-8">
              Court<span className="text-primary">.</span>
            </div>

            <h1 className="font-sans font-bold text-4xl leading-tight tracking-tight mb-3">
              Set up your<br />
              <span className="text-primary font-serif italic">pickleball facility.</span>
            </h1>

            <p className="text-ink-2 text-sm mb-2 max-w-[32ch]">
              Get your courts online in under 5 minutes. Staff can start managing bookings right away.
            </p>

            <p className="font-sans text-xs text-ink-3 mb-8">
              No credit card required · Free during setup
            </p>

            <button
              onClick={() => setStep('facility')}
              className="w-full bg-primary text-white py-4 rounded-xl font-sans text-sm font-medium flex justify-between items-center px-5"
            >
              <span>Get Started</span>
              <span className="font-sans">&rarr;</span>
            </button>

          </div>
        )}

        {/* Facility Info */}
        {step === 'facility' && (
          <>
            <StepIndicator current={0} total={4} />

            <h1 className="font-sans font-bold text-2xl tracking-tight mb-1">
              Your <span className="text-primary font-serif italic">facility.</span>
            </h1>
            <p className="font-sans text-xs text-ink-3 mb-6">
              Step 1 of 4 · Basic info
            </p>

            <div className="space-y-4">
              <div>
                <label className="font-sans text-xs text-ink-3 block mb-1.5">Facility name</label>
                <input
                  type="text"
                  placeholder="e.g. QC Pickle Hub"
                  value={facilityName}
                  onChange={(e) => setFacilityName(e.target.value)}
                  className="w-full bg-white rounded-xl px-4 py-3 text-sm font-sans border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                {subdomain && (
                  <p className="font-sans text-xs text-ink-3 mt-1.5">
                    Your URL: <span className="text-ink">{subdomain}.courtbooks.app</span>
                  </p>
                )}
              </div>

              <div>
                <label className="font-sans text-xs text-ink-3 block mb-1.5">Your name</label>
                <input
                  type="text"
                  placeholder="e.g. Marco Reyes"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full bg-white rounded-xl px-4 py-3 text-sm font-sans border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="font-sans text-xs text-ink-3 block mb-1.5">Email</label>
                <input
                  type="email"
                  placeholder="marco@qcpicklehub.com"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className="w-full bg-white rounded-xl px-4 py-3 text-sm font-sans border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="h-px bg-line my-1" />

              <div className="font-sans text-xs text-ink-3">Login credentials</div>

              <div>
                <label className="font-sans text-xs text-ink-3 block mb-1.5">Username</label>
                <UsernameInput
                  value={ownerUsername}
                  onChange={setOwnerUsername}
                  placeholder="e.g. marco"
                  className="bg-white rounded-xl px-4 py-3 pr-10 text-sm font-sans border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="font-sans text-xs text-ink-3 block mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 6 characters"
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full bg-white rounded-xl px-4 py-3 pr-12 text-sm font-sans border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink-2 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={1.5}>
                        <path d="M1 10s3.5-6 9-6c1.5 0 2.9.4 4.1 1M19 10s-1.4 2.4-3.7 4M7.6 14.4A9.5 9.5 0 011 10" />
                        <path d="M12.4 12.4A3 3 0 017.6 7.6" />
                        <path d="M2 2l16 16" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={1.5}>
                        <path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
                        <circle cx="10" cy="10" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="h-px bg-line my-1" />

              <div className="text-xs text-ink-3 mb-1.5">Operating hours</div>
              <OperatingHoursEditor ranges={hoursRanges} onChange={setHoursRanges} />
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep('welcome')}
                className="flex-1 bg-surface-3 text-ink-2 py-3 rounded-xl font-sans text-xs font-medium"
              >
                Back
              </button>
              <button
                onClick={() => setStep('courts')}
                disabled={!facilityName.trim() || !ownerName.trim() || !ownerUsername.trim() || ownerPassword.length < 6}
                className="flex-1 bg-primary text-white py-3 rounded-xl font-sans text-xs font-medium disabled:opacity-40"
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

            <h1 className="font-sans font-bold text-2xl tracking-tight mb-1">
              Your <span className="text-primary font-serif italic">courts.</span>
            </h1>
            <p className="font-sans text-xs text-ink-3 mb-6">
              Step 2 of 4 · How many pickleball courts?
            </p>

            <div className="space-y-2">
              {courts.map((court, index) => (
                <div key={index} className="bg-white rounded-[16px] shadow-card p-3 flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="font-sans text-xs text-ink-3 block mb-1">Name</label>
                    <input
                      type="text"
                      value={court.name}
                      onChange={(e) => updateCourt(index, 'name', e.target.value)}
                      className="w-full bg-surface-3 rounded-xl px-3 py-2.5 text-sm font-sans border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="w-28">
                    <label className="font-sans text-xs text-ink-3 block mb-1">₱/hour</label>
                    <input
                      type="number"
                      value={court.hourlyRate}
                      onChange={(e) => updateCourt(index, 'hourlyRate', e.target.value)}
                      className="w-full bg-surface-3 rounded-xl px-3 py-2.5 text-sm font-sans border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  {courts.length > 1 && (
                    <button
                      onClick={() => removeCourt(index)}
                      className="w-8 h-8 flex items-center justify-center text-warn font-sans text-sm"
                      aria-label="Remove court"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={addCourt}
              className="w-full mt-3 border border-dashed border-line text-ink-3 py-3 rounded-[16px] font-sans text-xs"
            >
              + Add another court
            </button>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep('facility')}
                className="flex-1 bg-surface-3 text-ink-2 py-3 rounded-xl font-sans text-xs font-medium"
              >
                Back
              </button>
              <button
                onClick={() => setStep('items')}
                className="flex-1 bg-primary text-white py-3 rounded-xl font-sans text-xs font-medium"
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

            <h1 className="font-sans font-bold text-2xl tracking-tight mb-1">
              Rentals & <span className="text-primary font-serif italic">extras.</span>
            </h1>
            <p className="font-sans text-xs text-ink-3 mb-2">
              Step 3 of 4 · Equipment and items to sell
            </p>
            <p className="text-ink-2 text-xs mb-5">
              Select items your facility offers. Staff can add these when creating bookings. You can always change this later.
            </p>

            <div className="font-sans text-xs text-ink-3 mb-2">Suggested items</div>
            <div className="space-y-1.5 mb-4">
              {SUGGESTED_ITEMS.map((item, index) => {
                const isSelected = selectedItems.has(index);
                return (
                  <button
                    key={index}
                    onClick={() => toggleSuggestedItem(index)}
                    className={`w-full bg-white rounded-[16px] shadow-card p-3 flex justify-between items-center text-left transition-colors ${
                      isSelected ? 'ring-1 ring-primary' : ''
                    }`}
                  >
                    <div>
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="font-sans text-xs text-ink-3">
                        ₱{item.price} · {item.type === 'rental' ? 'Rental' : 'Sale'}
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-primary border-primary' : 'border-line'
                      }`}
                    >
                      {isSelected && (
                        <svg viewBox="0 0 16 16" className="w-3 h-3 text-white">
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
                <div className="font-sans text-xs text-ink-3 mb-2">Your items</div>
                <div className="space-y-1.5 mb-4">
                  {customItems.map((item, index) => (
                    <div key={index} className="bg-white rounded-[16px] shadow-card p-3 flex justify-between items-center">
                      <div>
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="font-sans text-xs text-ink-3">₱{item.price} · {item.type}</div>
                      </div>
                      <button
                        onClick={() => setCustomItems(customItems.filter((_, i) => i !== index))}
                        className="text-warn font-sans text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {showAddCustom ? (
              <div className="bg-white rounded-[16px] shadow-card p-3 space-y-2 mb-4">
                <input
                  type="text"
                  placeholder="Item name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-surface-3 rounded-xl px-3 py-2.5 text-sm font-sans border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <input
                  type="number"
                  placeholder="Price (₱)"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="w-full bg-surface-3 rounded-xl px-3 py-2.5 text-sm font-sans border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <div className="flex gap-1.5">
                  {(['rental', 'sale'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setCustomType(t)}
                      className={`flex-1 font-sans text-xs py-2 rounded-xl ${
                        customType === t ? 'bg-primary text-white' : 'border border-line text-ink-2'
                      }`}
                    >
                      {t === 'rental' ? 'Rental' : 'Sale'}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={addCustomItem} className="flex-1 bg-primary text-white py-2.5 rounded-xl font-sans text-xs font-medium">Add</button>
                  <button onClick={() => setShowAddCustom(false)} className="flex-1 bg-surface-3 text-ink-2 py-2.5 rounded-xl font-sans text-xs font-medium">Cancel</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddCustom(true)}
                className="w-full border border-dashed border-line text-ink-3 py-3 rounded-[16px] font-sans text-xs mb-4"
              >
                + Add custom item
              </button>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setStep('courts')}
                className="flex-1 bg-surface-3 text-ink-2 py-3 rounded-xl font-sans text-xs font-medium"
              >
                Back
              </button>
              <button
                onClick={() => setStep('review')}
                className="flex-1 bg-primary text-white py-3 rounded-xl font-sans text-xs font-medium"
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

            <h1 className="font-sans font-bold text-2xl tracking-tight mb-1">
              Ready to <span className="text-primary font-serif italic">launch.</span>
            </h1>
            <p className="font-sans text-xs text-ink-3 mb-6">
              Step 4 of 4 · Review your setup
            </p>

            {/* Facility summary */}
            <div className="bg-white rounded-[16px] shadow-card p-4 mb-3">
              <div className="font-sans text-xs font-semibold text-ink-3 mb-2">Facility</div>
              <div className="font-sans text-lg font-semibold mb-1">{facilityName}</div>
              <div className="font-sans text-xs text-ink-3">
                {subdomain}.courtbooks.app
              </div>
              <div className="font-sans text-xs text-ink-3 mt-1">
                Owner: {ownerName} · {ownerEmail}
              </div>
              <div className="font-sans text-xs text-ink-3 mt-1">
                Login: <span className="text-ink">@{ownerUsername}</span>
              </div>
            </div>

            {/* Courts summary */}
            <div className="bg-white rounded-[16px] shadow-card p-4 mb-3">
              <div className="font-sans text-xs font-semibold text-ink-3 mb-2">
                {courts.length} Court{courts.length !== 1 ? 's' : ''}
              </div>
              {courts.map((court, i) => (
                <div key={i} className="flex justify-between py-1.5 border-b border-line-2 last:border-0">
                  <span className="text-sm">{court.name}</span>
                  <span className="font-sans text-xs text-ink-3">₱{court.hourlyRate}/hr</span>
                </div>
              ))}
            </div>

            {/* Items summary */}
            <div className="bg-white rounded-[16px] shadow-card p-4 mb-6">
              <div className="font-sans text-xs font-semibold text-ink-3 mb-2">
                {allItems.length} Item{allItems.length !== 1 ? 's' : ''}
              </div>
              {allItems.length === 0 ? (
                <div className="text-xs text-ink-3">No items — you can add them later in Settings</div>
              ) : (
                allItems.map((item, i) => (
                  <div key={i} className="flex justify-between py-1.5 border-b border-line-2 last:border-0">
                    <span className="text-sm">{item.name}</span>
                    <span className="font-sans text-xs text-ink-3">₱{item.price} · {item.type}</span>
                  </div>
                ))
              )}
            </div>

            {registerError && (
              <div className="bg-warn/10 border border-warn/30 rounded-xl p-3 mb-4">
                <p className="text-xs text-warn">{registerError}</p>
              </div>
            )}

            <button
              onClick={handleFinish}
              disabled={registering}
              className="w-full bg-primary text-white py-4 rounded-xl font-sans text-sm font-medium flex justify-between items-center px-5 disabled:opacity-50"
            >
              <span>{registering ? 'Creating...' : `Launch ${facilityName || 'your facility'}`}</span>
              {!registering && <span className="font-sans">&rarr;</span>}
            </button>

            <button
              onClick={() => setStep('items')}
              disabled={registering}
              className="w-full mt-3 bg-surface-3 text-ink-2 py-3 rounded-xl font-sans text-xs font-medium disabled:opacity-50"
            >
              Back
            </button>
          </>
        )}

      </div>
    </div>
  );
}
