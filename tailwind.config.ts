import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
      },
      screens: {
        "2xl": "1200px",
      },
    },
    extend: {
      fontFamily: {
        sans: [
          "var(--font-be-vietnam)",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "var(--font-jetbrains-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        bounty: {
          DEFAULT: "hsl(var(--bounty))",
          surface: "hsl(var(--bounty-surface))",
          border: "hsl(var(--bounty-border))",
          foreground: "hsl(var(--bounty-foreground))",
          onSolid: "hsl(var(--bounty-on-solid))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          surface: "hsl(var(--success-surface))",
          border: "hsl(var(--success-border))",
          foreground: "hsl(var(--success-foreground))",
          onSolid: "hsl(var(--success-on-solid))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "progress-indeterminate": {
          "0%": { transform: "translateX(-100%) scaleX(0.35)" },
          "50%": { transform: "translateX(20%) scaleX(0.6)" },
          "100%": { transform: "translateX(100%) scaleX(0.35)" },
        },
      },
      animation: {
        "progress-indeterminate":
          "progress-indeterminate 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [typography, animate],
};

export default config;
