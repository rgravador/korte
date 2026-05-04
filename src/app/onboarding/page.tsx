'use client';

import { useStore } from '@/store';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ItemType, TimeRange, PRESET_SPORTS } from '@/lib/types';
import { apiRegister, apiHydrate } from '@/lib/api';
import { OperatingHoursEditor } from '@/components/operating-hours-editor';
import { UsernameInput } from '@/components/username-input';

type Step = 'welcome' | 'facility' | 'sports' | 'sport-setup' | 'items' | 'review';

interface SportSetup {
  name: string;
  operatingHoursRanges: TimeRange[];
  courts: { name: string; hourlyRate: number }[];
}

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

  // Sports selection
  const [selectedSports, setSelectedSports] = useState<{ name: string }[]>([]);
  const [customSportName, setCustomSportName] = useState('');

  // Sport setup (sequential per sport: hours + courts)
  const [sportSetups, setSportSetups] = useState<SportSetup[]>([]);
  const [currentSportSetupIndex, setCurrentSportSetupIndex] = useState(0);

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

  // ── Sports helpers ──────────────────────────────────────────

  const togglePresetSport = (sportName: string) => {
    setSelectedSports((prev) => {
      const exists = prev.some((s) => s.name === sportName);
      if (exists) {
        return prev.filter((s) => s.name !== sportName);
      }
      return [...prev, { name: sportName }];
    });
  };

  const addCustomSport = () => {
    const trimmed = customSportName.trim();
    if (!trimmed) return;
    const alreadySelected = selectedSports.some(
      (s) => s.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (alreadySelected) return;
    setSelectedSports((prev) => [...prev, { name: trimmed }]);
    setCustomSportName('');
  };

  const initSportSetups = () => {
    const setups: SportSetup[] = selectedSports.map((sport) => {
      const existing = sportSetups.find((s) => s.name === sport.name);
      if (existing) return existing;
      return {
        name: sport.name,
        operatingHoursRanges: [{ start: 6, end: 22 }],
        courts: [{ name: `Court 1`, hourlyRate: 400 }],
      };
    });
    setSportSetups(setups);
    setCurrentSportSetupIndex(0);
  };

  // ── Sport-setup helpers ─────────────────────────────────────

  const currentSetup = sportSetups[currentSportSetupIndex] as SportSetup | undefined;

  const updateCurrentSetupHours = (ranges: TimeRange[]) => {
    setSportSetups((prev) => {
      const updated = [...prev];
      updated[currentSportSetupIndex] = { ...updated[currentSportSetupIndex], operatingHoursRanges: ranges };
      return updated;
    });
  };

  const addCourtToCurrentSetup = () => {
    setSportSetups((prev) => {
      const updated = [...prev];
      const setup = updated[currentSportSetupIndex];
      updated[currentSportSetupIndex] = {
        ...setup,
        courts: [...setup.courts, { name: `Court ${setup.courts.length + 1}`, hourlyRate: 400 }],
      };
      return updated;
    });
  };

  const updateCourtInCurrentSetup = (courtIndex: number, field: 'name' | 'hourlyRate', value: string | number) => {
    setSportSetups((prev) => {
      const updated = [...prev];
      const setup = updated[currentSportSetupIndex];
      const courts = [...setup.courts];
      if (field === 'name') {
        courts[courtIndex] = { ...courts[courtIndex], name: value as string };
      } else {
        courts[courtIndex] = { ...courts[courtIndex], hourlyRate: Number(value) };
      }
      updated[currentSportSetupIndex] = { ...setup, courts };
      return updated;
    });
  };

  const removeCourtFromCurrentSetup = (courtIndex: number) => {
    setSportSetups((prev) => {
      const updated = [...prev];
      const setup = updated[currentSportSetupIndex];
      if (setup.courts.length <= 1) return prev;
      updated[currentSportSetupIndex] = {
        ...setup,
        courts: setup.courts.filter((_, i) => i !== courtIndex),
      };
      return updated;
    });
  };

  // ── Items helpers ───────────────────────────────────────────

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

  // ── Registration ────────────────────────────────────────────

  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState('');

  const handleFinish = async () => {
    setRegistering(true);
    setRegisterError('');

    const sports = sportSetups.map((s) => ({
      name: s.name,
      operatingHoursRanges: s.operatingHoursRanges,
      courts: s.courts,
    }));

    // Backward compat: use first sport's first range for legacy fields
    const firstRange = sports[0]?.operatingHoursRanges[0];
    const operatingHoursStart = firstRange?.start ?? 6;
    const operatingHoursEnd = firstRange?.end ?? 22;

    try {
      console.debug('[onboarding] Registering via API...');
      const result = await apiRegister({
        name: facilityName,
        subdomain,
        operatingHoursStart,
        operatingHoursEnd,
        ownerName,
        ownerEmail,
        ownerUsername,
        ownerPassword,
        courts: sports.flatMap((s) => s.courts),
        items: allItems,
        sports,
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
              <span className="text-primary font-serif italic">sports facility.</span>
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
            <StepIndicator current={0} total={5} />

            <h1 className="font-sans font-bold text-2xl tracking-tight mb-1">
              Your <span className="text-primary font-serif italic">facility.</span>
            </h1>
            <p className="font-sans text-xs text-ink-3 mb-6">
              Step 1 of 5 · Basic info
            </p>

            <div className="space-y-4">
              <div>
                <label className="font-sans text-xs text-ink-3 block mb-1.5">Facility name</label>
                <input
                  type="text"
                  placeholder="e.g. QC Sports Hub"
                  value={facilityName}
                  onChange={(e) => setFacilityName(e.target.value)}
                  className="w-full bg-surface rounded-xl px-4 py-3 text-sm font-sans border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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
                  className="w-full bg-surface rounded-xl px-4 py-3 text-sm font-sans border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="font-sans text-xs text-ink-3 block mb-1.5">Email</label>
                <input
                  type="email"
                  placeholder="marco@qcsportshub.com"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className="w-full bg-surface rounded-xl px-4 py-3 text-sm font-sans border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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
                  className="bg-surface rounded-xl px-4 py-3 pr-10 text-sm font-sans border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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
                    className="w-full bg-surface rounded-xl px-4 py-3 pr-12 text-sm font-sans border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep('welcome')}
                className="flex-1 bg-surface-3 text-ink-2 py-3 rounded-xl font-sans text-xs font-medium"
              >
                Back
              </button>
              <button
                onClick={() => setStep('sports')}
                disabled={!facilityName.trim() || !ownerName.trim() || !ownerUsername.trim() || ownerPassword.length < 6}
                className="flex-1 bg-primary text-white py-3 rounded-xl font-sans text-xs font-medium disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </>
        )}

        {/* Sports Selection */}
        {step === 'sports' && (
          <>
            <StepIndicator current={1} total={5} />

            <h1 className="font-sans font-bold text-2xl tracking-tight mb-1">
              Your <span className="text-primary font-serif italic">sports.</span>
            </h1>
            <p className="font-sans text-xs text-ink-3 mb-2">
              Step 2 of 5 · Which sports does your facility offer?
            </p>
            <p className="text-ink-2 text-xs mb-5">
              Select one or more sports. You&apos;ll configure hours and courts for each one next.
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
              {PRESET_SPORTS.map((sport) => {
                const isSelected = selectedSports.some((s) => s.name === sport);
                return (
                  <button
                    key={sport}
                    onClick={() => togglePresetSport(sport)}
                    className={`px-4 py-2.5 rounded-xl font-sans text-sm transition-colors ${
                      isSelected
                        ? 'bg-primary text-white'
                        : 'bg-surface border border-line text-ink-2 hover:border-primary'
                    }`}
                  >
                    {sport}
                  </button>
                );
              })}
            </div>

            {/* Custom sport input */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Other sport name"
                value={customSportName}
                onChange={(e) => setCustomSportName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomSport();
                  }
                }}
                className="flex-1 bg-surface rounded-xl px-4 py-3 text-sm font-sans border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={addCustomSport}
                disabled={!customSportName.trim()}
                className="bg-surface-3 text-ink-2 px-4 py-3 rounded-xl font-sans text-xs font-medium disabled:opacity-40"
              >
                Add
              </button>
            </div>

            {/* Show custom sports that aren't in presets */}
            {selectedSports.filter((s) => !(PRESET_SPORTS as readonly string[]).includes(s.name)).length > 0 && (
              <div className="mb-4">
                <div className="font-sans text-xs text-ink-3 mb-2">Custom sports</div>
                <div className="flex flex-wrap gap-2">
                  {selectedSports
                    .filter((s) => !(PRESET_SPORTS as readonly string[]).includes(s.name))
                    .map((sport) => (
                      <button
                        key={sport.name}
                        onClick={() => setSelectedSports((prev) => prev.filter((s) => s.name !== sport.name))}
                        className="px-4 py-2.5 rounded-xl font-sans text-sm bg-primary text-white flex items-center gap-2"
                      >
                        {sport.name}
                        <span className="text-white/70">&times;</span>
                      </button>
                    ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep('facility')}
                className="flex-1 bg-surface-3 text-ink-2 py-3 rounded-xl font-sans text-xs font-medium"
              >
                Back
              </button>
              <button
                onClick={() => {
                  initSportSetups();
                  setStep('sport-setup');
                }}
                disabled={selectedSports.length < 1}
                className="flex-1 bg-primary text-white py-3 rounded-xl font-sans text-xs font-medium disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </>
        )}

        {/* Sport Setup (sequential, per sport) */}
        {step === 'sport-setup' && currentSetup && (
          <>
            <StepIndicator current={2} total={5} />

            <h1 className="font-sans font-bold text-2xl tracking-tight mb-1">
              Set up <span className="text-primary font-serif italic">{currentSetup.name}.</span>
            </h1>
            <p className="font-sans text-xs text-ink-3 mb-6">
              Step 3 of 5 · Sport {currentSportSetupIndex + 1} of {sportSetups.length}
            </p>

            {/* Operating hours for this sport */}
            <div className="mb-6">
              <div className="text-xs text-ink-3 mb-1.5">Operating hours</div>
              <OperatingHoursEditor
                ranges={currentSetup.operatingHoursRanges}
                onChange={updateCurrentSetupHours}
              />
            </div>

            {/* Courts for this sport */}
            <div className="font-sans text-xs text-ink-3 mb-2">Courts</div>
            <div className="space-y-2">
              {currentSetup.courts.map((court, index) => (
                <div key={index} className="bg-surface rounded-[16px] shadow-card p-3 flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="font-sans text-xs text-ink-3 block mb-1">Name</label>
                    <input
                      type="text"
                      value={court.name}
                      onChange={(e) => updateCourtInCurrentSetup(index, 'name', e.target.value)}
                      className="w-full bg-surface-3 rounded-xl px-3 py-2.5 text-sm font-sans border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="w-28">
                    <label className="font-sans text-xs text-ink-3 block mb-1">&#8369;/hour</label>
                    <input
                      type="number"
                      value={court.hourlyRate}
                      onChange={(e) => updateCourtInCurrentSetup(index, 'hourlyRate', e.target.value)}
                      className="w-full bg-surface-3 rounded-xl px-3 py-2.5 text-sm font-sans border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  {currentSetup.courts.length > 1 && (
                    <button
                      onClick={() => removeCourtFromCurrentSetup(index)}
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
              onClick={addCourtToCurrentSetup}
              className="w-full mt-3 border border-dashed border-line text-ink-3 py-3 rounded-[16px] font-sans text-xs"
            >
              + Add another court
            </button>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  if (currentSportSetupIndex > 0) {
                    setCurrentSportSetupIndex(currentSportSetupIndex - 1);
                  } else {
                    setStep('sports');
                  }
                }}
                className="flex-1 bg-surface-3 text-ink-2 py-3 rounded-xl font-sans text-xs font-medium"
              >
                Back
              </button>
              <button
                onClick={() => {
                  if (currentSportSetupIndex < sportSetups.length - 1) {
                    setCurrentSportSetupIndex(currentSportSetupIndex + 1);
                  } else {
                    setStep('items');
                  }
                }}
                className="flex-1 bg-primary text-white py-3 rounded-xl font-sans text-xs font-medium"
              >
                {currentSportSetupIndex < sportSetups.length - 1 ? 'Next sport' : 'Next'}
              </button>
            </div>
          </>
        )}

        {/* Items */}
        {step === 'items' && (
          <>
            <StepIndicator current={3} total={5} />

            <h1 className="font-sans font-bold text-2xl tracking-tight mb-1">
              Rentals & <span className="text-primary font-serif italic">extras.</span>
            </h1>
            <p className="font-sans text-xs text-ink-3 mb-2">
              Step 4 of 5 · Equipment and items to sell
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
                    className={`w-full bg-surface rounded-[16px] shadow-card p-3 flex justify-between items-center text-left transition-colors ${
                      isSelected ? 'ring-1 ring-primary' : ''
                    }`}
                  >
                    <div>
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="font-sans text-xs text-ink-3">
                        &#8369;{item.price} · {item.type === 'rental' ? 'Rental' : 'Sale'}
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
                    <div key={index} className="bg-surface rounded-[16px] shadow-card p-3 flex justify-between items-center">
                      <div>
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="font-sans text-xs text-ink-3">&#8369;{item.price} · {item.type}</div>
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
              <div className="bg-surface rounded-[16px] shadow-card p-3 space-y-2 mb-4">
                <input
                  type="text"
                  placeholder="Item name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-surface-3 rounded-xl px-3 py-2.5 text-sm font-sans border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <input
                  type="number"
                  placeholder="Price (&#8369;)"
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
                onClick={() => {
                  setCurrentSportSetupIndex(sportSetups.length - 1);
                  setStep('sport-setup');
                }}
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
            <StepIndicator current={4} total={5} />

            <h1 className="font-sans font-bold text-2xl tracking-tight mb-1">
              Ready to <span className="text-primary font-serif italic">launch.</span>
            </h1>
            <p className="font-sans text-xs text-ink-3 mb-6">
              Step 5 of 5 · Review your setup
            </p>

            {/* Facility summary */}
            <div className="bg-surface rounded-[16px] shadow-card p-4 mb-3">
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

            {/* Sports summary — grouped by sport */}
            {sportSetups.map((sport, sportIndex) => (
              <div key={sportIndex} className="bg-surface rounded-[16px] shadow-card p-4 mb-3">
                <div className="font-sans text-xs font-semibold text-ink-3 mb-2">{sport.name}</div>

                <div className="font-sans text-xs text-ink-3 mb-2">
                  Hours: {sport.operatingHoursRanges.map((r) => `${r.start}:00 – ${r.end}:00`).join(', ')}
                </div>

                <div className="font-sans text-xs text-ink-3 mb-1">
                  {sport.courts.length} Court{sport.courts.length !== 1 ? 's' : ''}
                </div>
                {sport.courts.map((court, i) => (
                  <div key={i} className="flex justify-between py-1.5 border-b border-line-2 last:border-0">
                    <span className="text-sm">{court.name}</span>
                    <span className="font-sans text-xs text-ink-3">&#8369;{court.hourlyRate}/hr</span>
                  </div>
                ))}
              </div>
            ))}

            {/* Items summary */}
            <div className="bg-surface rounded-[16px] shadow-card p-4 mb-6">
              <div className="font-sans text-xs font-semibold text-ink-3 mb-2">
                {allItems.length} Item{allItems.length !== 1 ? 's' : ''}
              </div>
              {allItems.length === 0 ? (
                <div className="text-xs text-ink-3">No items — you can add them later in Settings</div>
              ) : (
                allItems.map((item, i) => (
                  <div key={i} className="flex justify-between py-1.5 border-b border-line-2 last:border-0">
                    <span className="text-sm">{item.name}</span>
                    <span className="font-sans text-xs text-ink-3">&#8369;{item.price} · {item.type}</span>
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
