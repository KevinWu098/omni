import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                chart: {
                    "1": "hsl(var(--chart-1))",
                    "2": "hsl(var(--chart-2))",
                    "3": "hsl(var(--chart-3))",
                    "4": "hsl(var(--chart-4))",
                    "5": "hsl(var(--chart-5))",
                },
                dp: {
                    text: "rgba(255,255,255,0.75)",
                    outline: "rgba(255,255,255,0.25)",
                    headingText: "#FFFFFF",
                    card: "#2D2D2D",
                    hoverCard: "#3C3C3C",
                    primary: "#69D2FF",
                    primary2: "#49B5E2",
                    inputLabelColor: "rgba(255,255,255,0.5)",
                    outlineNotSelected: "#3B3B3B",
                    nonEmergency: "#47FF85",
                    critical: "#F40000",
                    background: "#1E1E1E",
                    inputText: "#9F9F9F",
                    medium: "#FABC1F",
                    backgroundHover: "#222222",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            transitionDuration: {
                5000: "5000ms",
            },
            spacing: {
                "15": "60px",
                "30": "120px",
            },
            fontSize: {
                xxs: ["10px", "12px"],
            },
        },
    },
    plugins: [
        require("tailwindcss-animate"),
    ],
};
export default config;
