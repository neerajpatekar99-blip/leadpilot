import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        claude: {
          bg: "#0a0a0a",
          card: "#171717",
          border: "#262626",
          text: "#ededed",
          accent: "#D97757",
          accentHover: "#C86445",
          muted: "#a3a3a3"
        }
      },
      fontFamily: {
        sans: ['"Cormorant Garamond"', 'serif'],
        serif: ['"Cormorant Garamond"', 'serif'],
      }
    },
  },
  plugins: [],
};
export default config;
