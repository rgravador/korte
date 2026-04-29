'use client';

export function Header() {
  return (
    <div className="flex justify-between items-center mb-4">
      <div className="font-display font-normal italic text-lg tracking-tight">
        Court<span className="text-accent-deep not-italic">.</span>
      </div>
      <div className="w-7 h-7 rounded-full bg-ink text-paper flex items-center justify-center font-mono text-[10px] font-medium">
        MR
      </div>
    </div>
  );
}
