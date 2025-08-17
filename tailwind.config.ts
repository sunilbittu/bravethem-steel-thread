import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0B0B0C",
        cloud: "#F8F8F9",
        steel: "#1a1a1d",
        aura: "#6E56CF",
        cherry: "#D21F3C",
      },
      boxShadow: {
        soft: "0 8px 24px rgba(0,0,0,0.25)",
      },
      borderRadius: {
        "2xl": "1rem",
      }
    },
  },
  plugins: [],
};
export default config;
