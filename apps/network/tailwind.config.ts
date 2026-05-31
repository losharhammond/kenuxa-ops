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
        // KENUXA NETWORK — Surface layers (dark-first)
        bg:      "#07080f",
        surface: "#0d0f1a",
        panel:   "#111624",
        hover:   "#161b2e",

        // Brand — NETWORK Orange (distinct from CORE violet)
        orange: {
          DEFAULT: "#FF6524",
          light:   "#FF8B5E",
          dim:     "rgba(255,101,36,0.15)",
          glow:    "rgba(255,101,36,0.25)",
        },

        // Secondary brand
        amber:   { DEFAULT: "#F59E0B", dim: "rgba(245,158,11,0.15)" },
        emerald: { DEFAULT: "#10b981", dim: "rgba(16,185,129,0.15)" },
        blue:    { DEFAULT: "#3B82F6", dim: "rgba(59,130,246,0.12)" },
        red:     { DEFAULT: "#ef4444", dim: "rgba(239,68,68,0.15)" },
        violet:  { DEFAULT: "#7c3aed" },

        // Text
        "text-base":  "#f1f5f9",
        "text-muted": "#64748b",
        "text-dim":   "#374151",

        // Borders
        "border-base":   "rgba(255,255,255,0.07)",
        "border-hover":  "rgba(255,255,255,0.14)",
        "border-active": "rgba(255,101,36,0.45)",
      },
      backgroundImage: {
        "gradient-network": "linear-gradient(135deg, #FF6524 0%, #FF8B5E 50%, #F59E0B 100%)",
        "gradient-hero":    "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,101,36,0.25) 0%, transparent 70%)",
        "gradient-card":    "linear-gradient(135deg, rgba(255,101,36,0.08), rgba(245,158,11,0.04))",
        "gradient-success": "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))",
        "gradient-radial":  "radial-gradient(var(--tw-gradient-stops))",
      },
      boxShadow: {
        "glow-orange": "0 0 40px rgba(255,101,36,0.3), 0 0 80px rgba(255,101,36,0.12)",
        "glow-sm":     "0 0 16px rgba(255,101,36,0.2)",
        "glow-green":  "0 0 24px rgba(16,185,129,0.2)",
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
        "spin-slow":      "spin 20s linear infinite",
        "slide-up":       "slide-up 0.4s ease-out",
        "fade-in":        "fade-in 0.3s ease-out",
      },
      keyframes: {
        "pulse-glow":     { "0%, 100%": { opacity: "0.4" }, "50%": { opacity: "1" } },
        "float":          { "0%, 100%": { transform: "translateY(0px)" }, "50%": { transform: "translateY(-8px)" } },
        "gradient-shift": { "0%": { backgroundPosition: "0% 50%" }, "50%": { backgroundPosition: "100% 50%" }, "100%": { backgroundPosition: "0% 50%" } },
        "slide-up":       { "0%": { opacity: "0", transform: "translateY(16px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "fade-in":        { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
      },
      fontFamily: {
        sans: ["'Inter'", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["'JetBrains Mono'", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
