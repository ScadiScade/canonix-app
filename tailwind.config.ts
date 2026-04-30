import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        ink: "var(--foreground)",
        "ink-2": "var(--ink-2)",
        "ink-3": "var(--ink-3)",
        accent: "var(--accent)",
        "accent-light": "var(--accent-light)",
      },
      fontFamily: {
        serif: ["Georgia", "Fraunces", "serif"],
        mono: ["Geist Mono", "monospace"],
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "14px",
        xl: "20px",
      },
      spacing: {
        topbar: "52px",
        sidebar: "272px",
      },
    },
  },
  plugins: [],
};
export default config;
