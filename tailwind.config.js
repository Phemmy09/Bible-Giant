/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'navy-950': '#07142A',
        'navy-900': '#0B1F3A',
        'navy-700': '#1C3A63',
        'gold-500': '#C9A24B',
        'gold-300': '#E3CB8B',
        'cream-50': '#FFFDF7',
        'cream-100': '#FAF6EC',
        'ink-900': '#1B2330',
        'ink-500': '#5B6677',
        success: '#2E7D5B',
        danger: '#B3402F',
        warning: '#B7791F',
      },
      fontFamily: {
        display: ['var(--font-cormorant)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        btn: '12px',
        chip: '999px',
      },
      boxShadow: {
        soft: '0 6px 24px rgba(11, 31, 58, 0.10)',
      },
    },
  },
  plugins: [],
};
