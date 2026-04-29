'use client';

import { Header } from '@/components/header';
import { BottomNav } from '@/components/bottom-nav';

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-cream max-w-lg mx-auto">
      <div className="px-5 pt-4 pb-20">
        <Header />
        <h1 className="font-display font-light text-2xl tracking-tight mb-1">Reports</h1>
        <p className="font-mono text-[9px] tracking-wider uppercase text-ink-3 mb-4">Coming in Unit 6</p>
      </div>
      <BottomNav />
    </div>
  );
}
