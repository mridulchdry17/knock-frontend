import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

/**
 * Tokens map 1:1 to CSS custom properties in app/styles/theme.css so
 * theme switches happen via [data-theme="dark"] on <html>, no class swap.
 */
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        "paper-2": "var(--paper-2)",
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        "ink-3": "var(--ink-3)",
        line: "var(--line)",
        "line-2": "var(--line-2)",
        ember: "var(--ember)",
        "ember-tint": "var(--ember-tint)",
        flint: "var(--flint)",
        "flint-hover": "var(--flint-hover)",
        "flint-press": "var(--flint-press)",
        bordeaux: "var(--bordeaux)",
        "bordeaux-tint": "var(--bordeaux-tint)",
        moss: "var(--moss)",
        "moss-tint": "var(--moss-tint)",
        ochre: "var(--ochre)",
        "ochre-tint": "var(--ochre-tint)",
        focus: "var(--focus)",
      },
      borderColor: {
        DEFAULT: "var(--line)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Inter", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        // locked type scale
        caption: ["12px", { lineHeight: "16px", fontWeight: "500", letterSpacing: "0.04em" }],
        small: ["13px", { lineHeight: "20px", fontWeight: "400" }],
        body: ["15px", { lineHeight: "24px", fontWeight: "400" }],
        h3: ["16px", { lineHeight: "24px", fontWeight: "600" }],
        h2: ["20px", { lineHeight: "28px", fontWeight: "600" }],
        h1: ["28px", { lineHeight: "36px", fontWeight: "600" }],
        display: ["44px", { lineHeight: "52px", fontWeight: "600" }],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
      },
      spacing: {
        gutter: "32px",
        card: "20px",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 240ms cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
