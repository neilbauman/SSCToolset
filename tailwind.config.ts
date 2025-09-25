import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f7ff",
          100: "#dceeff",
          200: "#baddff",
          300: "#8ac6ff",
          400: "#59a9ff",
          500: "#2c8aff",
          600: "#116be6",
          700: "#0a52b4",
          800: "#0a448f",
          900: "#0b3a75"
        }
      }
    }
  },
  plugins: []
} satisfies Config;
