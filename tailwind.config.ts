import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#05060a",
          800: "#0a0c14",
          700: "#10131f",
          600: "#161a2b",
          500: "#1f2438",
        },
        neon: {
          cyan: "#22e5d6",
          violet: "#8b5cf6",
          magenta: "#ff2bd6",
          lime: "#b6ff3c",
          amber: "#ffb020",
        },
      },
      fontFamily: {
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 24px -4px rgba(34, 229, 214, 0.5)",
        "glow-violet": "0 0 24px -4px rgba(139, 92, 246, 0.55)",
        "glow-magenta": "0 0 24px -4px rgba(255, 43, 214, 0.5)",
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
      },
      keyframes: {
        pulseglow: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        rise: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        pulseglow: "pulseglow 2.4s ease-in-out infinite",
        rise: "rise 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
