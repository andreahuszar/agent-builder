import type { Config } from "tailwindcss";
import tailwindAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // Safelist colors used dynamically for team member avatars
  safelist: [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-orange-500',
    'bg-purple-500',
    'bg-purple-600',
    'bg-pink-500',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    // Override default Tailwind colors with Xelix brand colors
    colors: {
      // Core colors
      black: "#222222",
      white: "#ffffff",
      transparent: "transparent",
      current: "currentColor",
      
      // Xelix Gray Scale
      gray: {
        50: "#f7f7f7",
        100: "#f0f0f0",
        200: "#e3e3e3",
        300: "#d1d1d1",
        400: "#bdbdbd",
        500: "#aaaaaa",
        600: "#969696",
        700: "#818181",
        800: "#6a6a6a",
        900: "#585858",
        950: "#333333",
      },
      
      // Xelix Purple Scale (Primary Brand Color)
      purple: {
        50: "#f6f3ff",
        100: "#efe8ff",
        200: "#e1d4ff",
        300: "#cbb2ff",
        400: "#b387fe",
        500: "#9d56fc",
        600: "#9133f4",
        700: "#8221e0",
        800: "#6d1bbc",
        900: "#5a1899", // Main brand color
        950: "#380d68",
      },
      
      // Xelix Blue Scale
      blue: {
        50: "#f3f7fc",
        100: "#e5eff9",
        200: "#c6ddf1",
        300: "#94c1e5",
        400: "#5ba2d5",
        500: "#4793cc",
        600: "#266aa3",
        700: "#205584",
        800: "#1e496e",
        900: "#1e3e5c",
        950: "#14283d",
      },
      
      // Xelix Green Scale
      green: {
        50: "#f5f9f4",
        100: "#e5f3e5",
        200: "#cde6cc",
        300: "#a3d2a3",
        400: "#73b573",
        500: "#519c51",
        600: "#3d7c3d",
        700: "#336233",
        800: "#2c4f2c",
        900: "#254226",
        950: "#102311",
      },
      
      // Xelix Orange Scale
      orange: {
        50: "#fffbea",
        100: "#fff2c5",
        200: "#ffe685",
        300: "#ffd246",
        400: "#ffbd1b",
        500: "#ff9900",
        600: "#e27200",
        700: "#bb4d02",
        800: "#983b08",
        900: "#7c310b",
        950: "#481700",
      },
      
      // Xelix Red Scale
      red: {
        50: "#fff1f1",
        100: "#ffe0e0",
        200: "#ffc7c7",
        300: "#ffa0a0",
        400: "#ff6969",
        500: "#fa3939",
        600: "#e71b1b",
        700: "#d61414",
        800: "#a11313",
        900: "#851717",
        950: "#490606",
      },
      
      // Xelix Pink Scale
      pink: {
        50: "#fff4fd",
        100: "#ffe8fc",
        200: "#fdd1f6",
        300: "#fbacec",
        400: "#f77bde",
        500: "#eb3fc7",
        600: "#d029a9",
        700: "#ac1f88",
        800: "#8d1b6f",
        900: "#731c59",
        950: "#4d0539",
      },
      
      // Semantic brand colors
      brand: {
        primary: "#5a1899",      // purple-900
        secondary: "#9133f4",    // purple-600
        accent: "#eb3fc7",       // pink-500
        
        // Navigation gradient colors
        gradient: {
          start: "#0b0b45",      // Deep navy
          middle: "#3b0f73",     // Deep purple
          end: "#380d68",        // purple-950
        },
      },
    },
    extend: {
      colors: {
        // Keep CSS variable-based colors for theming</        
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
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(180deg, #0b0b45 0%, #3b0f73 52.08%, #380d68 100%)',
        'brand-gradient-hover': 'linear-gradient(180deg, #0b0b45 0%, #3b0f73 52.08%, #210840 100%)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        fadeIn: "fadeIn 0.3s ease-in-out",
        slideDown: "slideDown 0.3s ease-out",
      },
    },
  },
  plugins: [tailwindAnimate],
};

export default config;