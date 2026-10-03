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
        brand: {
          50: "#EEF2FD",
          100: "#DCE5FB",
          200: "#B9CBF7",
          300: "#8EABF2",
          400: "#5E86EC",
          500: "#3B6BE3",
          600: "#2446D6",
          700: "#1C37A8",
          800: "#172C84",
          900: "#12235F",
        },
        tomato: {
          50: "#FDF0EC",
          500: "#E5482E",
          600: "#C93A21",
        },
        mustard: {
          100: "#FDF1D6",
          400: "#F4B63A",
        },
        gray: {
          50: "#F6F7FB",
          100: "#E9EBF3",
          200: "#D6DAE7",
          300: "#B2B8CB",
          400: "#8A91A8",
          500: "#666D85",
          600: "#4C5269",
          700: "#363B4F",
          800: "#23273A",
          900: "#1B1F3B",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "2px",
        DEFAULT: "4px",
        md: "4px",
        lg: "4px",
        xl: "6px",
        "2xl": "8px",
        "3xl": "8px",
      },
      boxShadow: {
        sm: "none",
        DEFAULT: "none",
        md: "none",
        lg: "none",
        xl: "none",
        "2xl": "none",
      },
    },
  },
  plugins: [],
};

export default config;
