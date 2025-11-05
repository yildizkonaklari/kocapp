/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2563eb", // mavi ton
        secondary: "#1e293b", // koyu gri
        accent: "#38bdf8", // açık mavi
        success: "#22c55e",
        danger: "#ef4444",
        warning: "#facc15",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"]
      },
      boxShadow: {
        soft: "0 4px 12px rgba(0,0,0,0.08)"
      }
    },
  },
  plugins: [],
};
