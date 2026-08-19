/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#9F0202", // Brand Primary
          50: "#FFF5F5",
          100: "#FFE5E5",
          200: "#FFCACA",
          300: "#FFA3A3",
          400: "#FF7272",
          500: "#E63939",
          600: "#C41C1C",
          700: "#9F0202", // Main Brand
          800: "#7D0101",
          900: "#5A0000",
          950: "#330000",
        },

        secondary: {
          DEFAULT: "#F8F8F8",
          50: "#FFFFFF",
          100: "#FDFDFD",
          200: "#F8F8F8",
          300: "#F1F1F1",
          400: "#E5E5E5",
          500: "#D4D4D4",
          600: "#BDBDBD",
          700: "#9E9E9E",
          800: "#757575",
          900: "#4B5563",
          950: "#1F2937",
        },

        accent: {
          DEFAULT: "#F4B400",
          50: "#FFFBEA",
          100: "#FFF3C4",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F4B400", // Main Accent
          600: "#D99A00",
          700: "#B87D00",
          800: "#8F6200",
          900: "#664500",
        },

        success: {
          DEFAULT: "#16A34A",
          foreground: "#FFFFFF",
        },

        warning: {
          DEFAULT: "#F59E0B",
          foreground: "#111827",
        },

        muted: {
          DEFAULT: "#F5F5F5",
          foreground: "#6B7280",
        },

        background: "#FFFFFF",
        foreground: "#111827",

        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#111827",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
