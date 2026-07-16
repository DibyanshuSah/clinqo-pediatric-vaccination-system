/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#F9FAFB",
        surface: "#FFFFFF",
        primary: "#111827",
        secondary: "#4B5563",
        accent: {
          DEFAULT: "#0F766E",
          hover: "#0C5F58",
          soft: "#F0FDFA"
        },
        border: "#E5E7EB",
        status: {
          completed: {
            bg: "#ECFDF5",
            text: "#047857"
          },
          pending: {
            bg: "#F3F4F6",
            text: "#6B7280"
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
        card: '8px',
        btn: '8px',
      }
    },
  },
  plugins: [],
}
