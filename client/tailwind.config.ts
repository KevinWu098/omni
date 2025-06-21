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
                o: {
                    background: {
                        DEFAULT: "#121111",
                        light: "#1A1919",
                    },
                    base: {
                        background: "#1F1E1E",
                        foreground: "#222121",
                    },
                    outline: "#2F2F2F",
                    muted: {
                        DEFAULT: "#8B8B8B",
                        light: "#B6B6B6",
                        medium: "#595959",
                        dark: "#414141",
                    },
                    header: "#080808",
                    white: "#FFFFFF",
                    primary: "#FFC926",
                    green: "#6DE848",
                    red: "#F13837",
                    claudeGray: "#C2C0B6",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            transitionDuration: {
                "5000": "5000ms",
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
    plugins: [require("tailwindcss-animate")],
};
export default config;
