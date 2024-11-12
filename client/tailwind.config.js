/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  // Enable dark mode using a class strategy.
  // Add `class="dark"` to the `<html>` element to activate dark mode.
  darkMode: 'class',

  // Configure files to scan for Tailwind classes.
  // This includes all JavaScript/JSX components and the main HTML file.
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],

  // Define and extend the default Tailwind theme.
  theme: {
    // Custom color palette for the social network's branding.
    // Using CSS variables for easy theming (e.g., in `src/index.css`).
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: 'hsl(var(--color-white))',
      black: 'hsl(var(--color-black))',
      
      // Brand colors
      primary: {
        DEFAULT: 'hsl(var(--color-primary-500))',
        50: 'hsl(var(--color-primary-50))',
        100: 'hsl(var(--color-primary-100))',
        200: 'hsl(var(--color-primary-200))',
        300: 'hsl(var(--color-primary-300))',
        400: 'hsl(var(--color-primary-400))',
        500: 'hsl(var(--color-primary-500))',
        600: 'hsl(var(--color-primary-600))',
        700: 'hsl(var(--color-primary-700))',
        800: 'hsl(var(--color-primary-800))',
        900: 'hsl(var(--color-primary-900))',
      },
      
      // Neutral/Gray shades for text, backgrounds, and borders.
      neutral: {
        50: 'hsl(var(--color-neutral-50))',
        100: 'hsl(var(--color-neutral-100))',
        200: 'hsl(var(--color-neutral-200))',
        300: 'hsl(var(--color-neutral-300))',
        400: 'hsl(var(--color-neutral-400))',
        500: 'hsl(var(--color-neutral-500))',
        600: 'hsl(var(--color-neutral-600))',
        700: 'hsl(var(--color-neutral-700))',
        800: 'hsl(var(--color-neutral-800))',
        900: 'hsl(var(--color-neutral-900))',
      },

      // Semantic colors for UI feedback.
      success: 'hsl(var(--color-success))',
      warning: 'hsl(var(--color-warning))',
      error: 'hsl(var(--color-error))',
    },

    // Extend the default theme with custom values.
    extend: {
      // Custom font families.
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        // Example of adding a secondary font:
        // serif: ['Merriweather', ...defaultTheme.fontFamily.serif],
      },

      // Custom keyframes for animations.
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
        'spinner-rotate': {
          'from': { transform: 'rotate(0deg)' },
          'to': { transform: 'rotate(360deg)' },
        }
      },

      // Custom animation utilities based on the keyframes.
      animation: {
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'fade-in-down': 'fade-in-down 0.5s ease-out forwards',
        'spin-slow': 'spinner-rotate 1.5s linear infinite',
      },

      // Custom box shadows for a more refined UI.
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.07), 0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },

      // Custom spacing for consistent layout dimensions.
      spacing: {
        'header-height': '4rem', // 64px
        'sidebar-width': '16rem', // 256px
      },
    },
  },

  // Register Tailwind CSS plugins.
  plugins: [
    // Provides a basic reset for form styles, making them easier to customize.
    require('@tailwindcss/forms'),
    
    // Adds the `prose` classes for beautiful typographic defaults.
    // Useful for rendering user-generated content like posts.
    require('@tailwindcss/typography'),

    // Adds aspect ratio utilities for maintaining media dimensions.
    // e.g., `aspect-w-16 aspect-h-9` for a video.
    require('@tailwindcss/aspect-ratio'),
  ],
};