/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['"Syne"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        torn: {
          bg:       '#0a0c0f',
          surface:  '#111318',
          border:   '#1e2330',
          accent:   '#e8c547',
          'accent-dim': '#a88d2f',
          muted:    '#3a3f4d',
          text:     '#c8ccd8',
          'text-dim': '#5a6070',
          success:  '#4ade80',
          danger:   '#f87171',
        },
      },
    },
  },
  plugins: [],
}
