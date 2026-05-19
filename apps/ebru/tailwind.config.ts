import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: "#C9A84C",
          light: "#E8CC7A",
          dark: "#8B6914",
          muted: "rgba(201,168,76,0.15)",
        },
        turquoise: {
          DEFAULT: "#2EC4B6",
          dark: "#1A9E92",
          muted: "rgba(46,196,182,0.12)",
        },
        ebru: {
          bg: "#050505",
          card: "#0C0C0C",
          border: "rgba(201,168,76,0.18)",
        },
      },
      fontFamily: {
        cormorant: ["Cormorant Garamond", "Georgia", "serif"],
        inter: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "swirl-slow": "swirl 20s ease-in-out infinite",
        "swirl-mid": "swirl 14s ease-in-out infinite reverse",
        "swirl-fast": "swirl 10s ease-in-out infinite",
        "fade-in": "fadeIn 1.2s ease-out forwards",
        "fade-up": "fadeUp 1s ease-out forwards",
        "pulse-gold": "pulseGold 3s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        swirl: {
          "0%, 100%": { transform: "translate(0,0) rotate(0deg) scale(1)" },
          "25%": { transform: "translate(40px,-30px) rotate(90deg) scale(1.08)" },
          "50%": { transform: "translate(-20px,50px) rotate(180deg) scale(0.92)" },
          "75%": { transform: "translate(-40px,-20px) rotate(270deg) scale(1.05)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(30px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulseGold: {
          "0%, 100%": { boxShadow: "0 0 12px rgba(201,168,76,0.3)" },
          "50%": { boxShadow: "0 0 32px rgba(201,168,76,0.6), 0 0 60px rgba(201,168,76,0.2)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      backgroundImage: {
        "gold-gradient": "linear-gradient(135deg, #C9A84C 0%, #E8CC7A 50%, #8B6914 100%)",
        "turquoise-gradient": "linear-gradient(135deg, #1A9E92 0%, #2EC4B6 50%, #4EDDD5 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
