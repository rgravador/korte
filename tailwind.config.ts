import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        'primary-deep': '#2563EB',
        'primary-soft': '#DBEAFE',
        'primary-faint': '#EFF6FF',
        surface: '#FFFFFF',
        'surface-2': '#F8FAFC',
        'surface-3': '#F1F5F9',
        ink: '#0F172A',
        'ink-2': '#334155',
        'ink-3': '#64748B',
        'ink-4': '#94A3B8',
        line: '#E2E8F0',
        'line-2': '#F1F5F9',
        signal: '#10B981',
        'signal-soft': '#D1FAE5',
        'signal-text': '#065F46',
        warn: '#EF4444',
        'warn-soft': '#FEE2E2',
        'warn-text': '#991B1B',
        amber: '#F59E0B',
        'amber-soft': '#FEF3C7',
        'amber-text': '#92400E',
        'pending-bg': '#FFF7ED',
        'pending-text': '#C2410C',
      },
      fontFamily: {
        sans: ['Inter', 'var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        pill: '999px',
        button: '12px',
        tag: '8px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08)',
        dropdown: '0 10px 25px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.06)',
        sheet: '0 -4px 25px rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [],
};
export default config;
