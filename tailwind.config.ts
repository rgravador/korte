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
        paper: '#FCFAF5',
        'paper-2': '#F0EBDF',
        cream: '#F6F2E9',
        'cream-2': '#EFE9DB',
        ink: '#1A1715',
        'ink-2': '#4A4540',
        'ink-3': '#8A847D',
        'ink-4': '#BDB6AB',
        line: '#D9D2C2',
        'line-2': '#E8E1D0',
        accent: '#F2C94C',
        'accent-deep': '#E2B43E',
        'accent-soft': '#FBEBB0',
        signal: '#2D5A3F',
        warn: '#A33A2A',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-geist-sans)', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '14px',
        pill: '999px',
      },
    },
  },
  plugins: [],
};
export default config;
