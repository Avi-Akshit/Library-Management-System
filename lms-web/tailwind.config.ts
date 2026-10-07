import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F3EFE4",
        "paper-alt": "#F8F5EC",
        "paper-line": "#C9C0AC",
        ink: "#1C1B19",
        "ink-muted": "#6E6A61",
        stacks: "#463527",
        "stacks-line": "#6B5539",
        "stacks-text": "#EDE6D3",
        brass: "#B8934A",
        "brass-deep": "#9C7A2E",
        "status-available-bg": "#F8F5EC",
        "status-available-text": "#3E6B4A",
        "status-reserved-bg": "#F8F5EC",
        "status-reserved-text": "#35507A",
        "status-overdue-bg": "#F8F5EC",
        "status-overdue-text": "#9C3B2E",
      },
      fontFamily: {
        serif: ["ui-serif", "Georgia", "Cambria", '"Times New Roman"', "serif"],
        sans: ["ui-monospace", '"SFMono-Regular"', "Consolas", '"Liberation Mono"', "monospace"],
      },
      borderRadius: {
        badge: "2px",
        btn: "0px",
        card: "0px",
      },
    },
  },
  plugins: [],
} satisfies Config;
