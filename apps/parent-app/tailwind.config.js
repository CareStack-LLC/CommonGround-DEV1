/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // CommonGround Design System - Matching Web
        // Sage Green - Primary (Trust, Success, Mom's custody)
        sage: {
          50: '#E8F0EC',
          100: '#D1E1D9',
          200: '#B3CDB9',
          300: '#8FB399',
          400: '#6B9B7A',
          500: '#4A6C58', // Main sage
          600: '#3A5646',
          700: '#2D4437',
          800: '#203228',
          900: '#142019',
        },
        // Slate Blue - Secondary (Stability, Dad's custody)
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569', // Main slate
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        // Amber - ARIA Guardian, attention, warmth
        amber: {
          50: '#FEF7ED',
          100: '#FDE8D0',
          200: '#FBD1A2',
          300: '#E8C4A0',
          400: '#D4A574', // Main amber
          500: '#C08B5D',
          600: '#A47246',
          700: '#7F5636',
          800: '#5A3C26',
          900: '#362316',
        },
        // Warm backgrounds
        sand: {
          50: '#FFFCF9',
          100: '#FFF8F3',
          200: '#F5F0E8', // Main sand (background)
          300: '#E8E0D4',
          400: '#D4C9B8',
        },
        cream: '#FFFBF5', // Card surfaces
        // Legacy primary mapped to sage for compatibility
        primary: {
          50: '#E8F0EC',
          100: '#D1E1D9',
          200: '#B3CDB9',
          300: '#8FB399',
          400: '#6B9B7A',
          500: '#4A6C58',
          600: '#3A5646',
          700: '#2D4437',
          800: '#203228',
          900: '#142019',
        },
        // Legacy secondary kept as slate
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        // Status colors
        success: {
          50: '#E8F0EC',
          100: '#D1E1D9',
          500: '#4A6C58', // Use sage for success
          600: '#3A5646',
        },
        warning: {
          50: '#FEF7ED',
          100: '#FDE8D0',
          500: '#D4A574', // Use amber for warnings
          600: '#C08B5D',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#C53030', // Web uses this red
          600: '#B91C1C',
        },
        // Custody colors
        custody: {
          mom: '#4A6C58', // Sage green
          dad: '#475569', // Slate blue
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Merriweather', 'Georgia', 'serif'],
      },
      borderRadius: {
        'card': '1.5rem', // 24px for cards
        'button': '9999px', // Pill buttons
      },
      boxShadow: {
        'card': '0 4px 12px -2px rgba(74, 108, 88, 0.1)',
        'card-hover': '0 8px 24px -4px rgba(74, 108, 88, 0.15)',
        'elevated': '0 8px 24px -4px rgba(74, 108, 88, 0.12)',
      },
    },
  },
  plugins: [],
};
