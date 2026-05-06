/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Menlo', 'monospace'],
      },
      colors: {
        ink: {
          900: '#0f172a',
          700: '#334155',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
          200: '#e2e8f0',
          100: '#f1f5f9',
          50:  '#f8fafc',
        },
        accent: {
          DEFAULT: '#059669',
          dark:    '#047857',
          light:   '#d1fae5',
        },
        warn: {
          DEFAULT: '#d97706',
          light:   '#fef3c7',
        },
        bad: {
          DEFAULT: '#dc2626',
          light:   '#fee2e2',
        },
      },
    },
  },
  plugins: [],
}
