import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/templates/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gfp: {
          bg: {
            primary: "var(--gfp-bg-primary)",
            secondary: "var(--gfp-bg-secondary)",
          },
          text: {
            primary: "var(--gfp-text-primary)",
            secondary: "var(--gfp-text-secondary)",
          },
          accent: {
            DEFAULT: "var(--gfp-accent)",
            hover: "var(--gfp-accent-hover)",
          },
        },
      },
    },
  },
  plugins: [],
};
export default config;
