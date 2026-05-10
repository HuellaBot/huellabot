import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg:    '#e2eced',
          teal:  '#43c0af',
          navy:  '#013847',
          blue:  '#71b5d8',
          sand:  '#cda37b',
          // Shades of teal for hover/active states
          50:    '#f0faf9',
          100:   '#d0f2ee',
          200:   '#a1e6dd',
          300:   '#72d3cb',
          400:   '#43c0af',
          500:   '#34a898',
          600:   '#26897b',
          700:   '#1a6b60',
          800:   '#013847',
          900:   '#012530',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
