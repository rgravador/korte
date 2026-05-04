'use client';

import { useStore } from '@/store';

/**
 * Sport filter pill bar. Renders when tenant has 2+ active sports.
 * Hidden automatically for single-sport tenants (R9).
 */
export function SportFilter() {
  const sports = useStore((s) => s.sports);
  const selectedSportId = useStore((s) => s.selectedSportId);
  const setSelectedSport = useStore((s) => s.setSelectedSport);

  const activeSports = sports.filter((s) => s.isActive);

  // R9: hidden when single sport or no sports
  if (activeSports.length < 2) return null;

  return (
    <div className="flex gap-1.5 overflow-x-auto hide-scrollbar mb-4">
      {activeSports.map((sport) => {
        const isActive = sport.id === selectedSportId;
        return (
          <button
            key={sport.id}
            onClick={() => setSelectedSport(sport.id)}
            className={`text-xs font-semibold px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-primary text-white'
                : 'bg-surface-3 text-ink-3 hover:bg-line'
            }`}
          >
            {sport.name}
          </button>
        );
      })}
    </div>
  );
}
