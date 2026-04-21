/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        stash: {
          brandFrom: '#f48fb1',
          brandTo: '#ce93d8',
          expired: '#ef5350',
          urgent: '#ffa726',
          soon: '#f9a825',
          safe: '#ce93d8',
          unknown: '#bdbdbd',
          unopened: '#66bb6a',
          bgFrom: '#fff5f7',
          bgTo: '#fefefe',
          card: '#ffffff',
          text: '#4a3742',
          muted: '#8f7b87',
          line: '#f3dce6',
        },
      },
      borderRadius: {
        stash: '16px',
        'stash-lg': '24px',
      },
      boxShadow: {
        soft: '0 6px 16px rgba(244, 143, 177, 0.18)',
      },
    },
  },
  plugins: [],
};
