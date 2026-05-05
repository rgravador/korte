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
        // Dark mode defaults — navy surfaces, light text
        primary: '#C8962E',
        'primary-deep': '#E8B84A',
        'primary-soft': '#C8962E20',
        'primary-faint': '#C8962E10',
        surface: '#111D32',
        'surface-2': '#0A1628',
        'surface-3': '#162540',
        ink: '#F0F2F5',
        'ink-2': '#C8D0DC',
        'ink-3': '#8494AE',
        'ink-4': '#4E6180',
        line: '#1E3050',
        'line-2': '#162540',
        navy: {
          900: '#060D1A',
          800: '#0A1628',
          700: '#111D32',
          600: '#1A3060',
          500: '#234E80',
        },
        gold: '#C8962E',
        'gold-soft': '#E8C56B',
        signal: '#34D399',
        'signal-soft': '#10B98120',
        'signal-text': '#6EE7B7',
        warn: '#F87171',
        'warn-soft': '#DC354520',
        'warn-text': '#FCA5A5',
        amber: '#FBBF24',
        'amber-soft': '#F59E0B20',
        'amber-text': '#FDE68A',
        'pending-bg': '#C8962E15',
        'pending-text': '#E8C56B',
      },
      fontFamily: {
        sans: ['var(--font-sans)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        pill: '999px',
        button: '12px',
        tag: '8px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.4)',
        dropdown: '0 10px 25px rgba(0,0,0,0.5), 0 4px 10px rgba(0,0,0,0.3)',
        sheet: '0 -4px 25px rgba(0,0,0,0.5)',
      },
    },
  },
  safelist: [
    // Court color classes used dynamically in schedule grid
    { pattern: /bg-(emerald|sky|violet|rose|amber|cyan|orange|pink|lime|teal)-\d+\/(15|20|25)/ },
    { pattern: /text-(emerald|sky|violet|rose|amber|cyan|orange|pink|lime|teal)-400/ },
    { pattern: /border-(emerald|sky|violet|rose|amber|cyan|orange|pink|lime|teal)-500\/40/ },
    { pattern: /bg-(emerald|sky|violet|rose|amber|cyan|orange|pink|lime|teal)-400/ },
  ],
  plugins: [],
};
export default config;
