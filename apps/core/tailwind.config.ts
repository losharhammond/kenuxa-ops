import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core background layers
        bg:      "#07080f",
        surface: "#0d0f1a",
        panel:   "#111624",

        // Brand
        violet:  { DEFAULT: "#7c3aed", light: "#a78bfa", dim: "rgba(124,58,237,0.15)" },
        indigo:  { DEFAULT: "#4f46e5" },
        cyan:    { DEFAULT: "#06b6d4", dim: "rgba(6,182,212,0.12)" },

        // Semantic
        emerald: { DEFAULT: "#10b981" },
        amber:   { DEFAULT: "#f59e0b" },
        red:     { DEFAULT: "#ef4444" },

        // Text
        dim:  "#374151",
      },
      backgroundImage: {
        "gradient-radial":  "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":   "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "gradient-core":    "linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #06b6d4 100%)",
        "gradient-hero":    "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(124,58,237,0.3) 0%, transparent 70%)",
        "gradient-card":    "linear-gradient(135deg, rgba(124,58,237,0.1), rgba(79,70,229,0.05))",
      },
      boxShadow: {
        "glow-violet": "0 0 40px rgba(124,58,237,0.25), 0 0 80px rgba(124,58,237,0.1)",
        "glow-cyan":   "0 0 40px rgba(6,182,212,0.2)",
        "glow-sm":     "0 0 16px rgba(124,58,237,0.2)",
        "panel":       "0 4px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.04) inset",
        "card":        "0 2px 16px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.03) inset",
      },
      borderColor: {
        DEFAULT: "rgba(255,255,255,0.07)",
      },
      animation: {
        "pulse-glow":     "pulse-glow 3s ease-in-out infinite",
        "float":          "float 6s ease-in-out infinite",
        "gradient-shift": "gradient-shift 8s ease infinite",
        "scan":           "scan 4s linear infinite",
        "spin-slow":      "spin 20s linear infinite",
        "blink":          "blink 1s step-end infinite",
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
