/** @type {import('tailwindcss').Config} */
module.exports = {
  /**
   * Content files to scan for Tailwind classes.
   * This configuration ensures that any classes used in your React components
   * and the main HTML file are included in the final CSS build.
   */
  content: [
    "./public/index.html",
    "./src/client/**/*.{js,jsx,ts,tsx}",
  ],

  /**
   * Theme configuration for the project.
   * We extend the default Tailwind theme to add custom colors, fonts,
   * and animations that align with our social network's brand identity.
   */
  theme: {
    extend: {
      /**
       * Custom color palette.
       * Using semantic names for colors makes the theme easier to manage and
       * apply consistently across the application.
       */
      colors: {
        primary: {
          light: '#60a5fa',   // blue-400
          DEFAULT: '#3b82f6', // blue-500
          dark: '#2563eb',    // blue-600
        },
        secondary: {
          light: '#fca5a5',   // red-300
          DEFAULT: '#f87171', // red-400
          dark: '#ef4444',    // red-500
        },
        background: '#f1f5f9', // slate-100
        surface: '#ffffff',    // white
        'on-surface': '#1e293b', // slate-800
        'on-surface-variant': '#64748b', // slate-500
        border: '#e2e8f0',     // slate-200
        success: '#22c55e',    // green-500
        warning: '#f59e0b',    // amber-500
        error: '#ef4444',      // red-500
      },

      /**
       * Custom font families.
       * 'Inter' is a clean, modern sans-serif font suitable for UIs.
       * Ensure this font is imported in your project (e.g., via Google Fonts in index.html).
       */
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },

      /**
       * Custom animations and keyframes.
       * Useful for adding subtle, engaging micro-interactions to the UI.
       */
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-down': {
          '0%': {
            opacity: '0',
            transform: 'translateY(-10px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'pulse-bg': {
          '0%, 100%': { backgroundColor: 'rgba(203, 213, 225, 0.5)' }, // slate-300 with opacity
          '50%': { backgroundColor: 'rgba(226, 232, 240, 0.5)' }, // slate-200 with opacity
        }
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-in-down': 'fade-in-down 0.5s ease-out forwards',
        'pulse-bg': 'pulse-bg 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },

  /**
   * Tailwind CSS plugins.
   * These add extra utilities and base styles for common patterns.
   */
  plugins: [
    // Provides sensible defaults for form elements.
    require('@tailwindcss/forms'),
    // Adds a `prose` class for styling blocks of rich text content.
    require('@tailwindcss/typography'),
    // Adds utilities for maintaining aspect ratios.
    require('@tailwindcss/aspect-ratio'),
  ],
};