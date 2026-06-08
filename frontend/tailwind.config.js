/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e8faf0',
          100: '#c5f0d8',
          200: '#9ee4bc',
          300: '#6ed79b',
          400: '#38c878',
          500: '#03c75a',
          600: '#02a848',
          700: '#028a3d',
        },
        works: {
          bg: '#f4f5f7',
          sidebar: '#ffffff',
          border: '#e5e8eb',
          hover: '#f0f1f3',
          text: '#111111',
          muted: '#767676',
          subtle: '#939393',
        },
      },
      fontFamily: {
        sans: ['Pretendard', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.08)',
        sidebar: '1px 0 0 rgba(0,0,0,0.06)',
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
};
