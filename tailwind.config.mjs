/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        bg2: 'var(--bg2)',
        panel: 'var(--panel)',
        'panel-2': 'var(--panel2)',
        'panel-3': 'var(--panel3)',
        ink: 'var(--ink)',
        'ink-dim': 'var(--ink-dim)',
        'ink-faint': 'var(--ink-faint)',
        paper: 'var(--paper)',
        line: 'var(--line)',
        'line-2': 'var(--line2)',
        amber: {
          DEFAULT: 'var(--amber)',
          soft: 'var(--amber-soft)',
        },
        orange: 'var(--orange)',
        teal: {
          DEFAULT: 'var(--teal)',
          soft: 'var(--teal-soft)',
        },
        sky: 'var(--sky)',
        acid: 'var(--acid)',
        violet: 'var(--violet)',
        rose: 'var(--rose)',
        green: 'var(--green)',
        gold: 'var(--gold)',
        cat: {
          tech: 'var(--cat-tech)',
          geopolitics: 'var(--cat-geopolitics)',
          society: 'var(--cat-society)',
          music: 'var(--cat-music)',
          movies: 'var(--cat-movies)',
          events: 'var(--cat-events)',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        ui: ['Space Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        heading: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        body: ['Space Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        content: '72rem',
        prose: '44rem',
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
