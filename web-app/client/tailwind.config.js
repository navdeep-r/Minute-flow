
/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#0a0b14", // Deep Space Blue/Black
                foreground: "#ffffff",
                card: "rgba(15, 23, 42, 0.6)", // Glass base
                primary: {
                    DEFAULT: "#3b82f6", // Electric Blue
                    foreground: "#ffffff",
                },
                secondary: {
                    DEFAULT: "#a5d64c", // Neon Green
                    foreground: "#000000",
                },
                accent: {
                    DEFAULT: "#8b5cf6", // Purple
                    foreground: "#ffffff",
                },
                muted: {
                    DEFAULT: "#1e293b",
                    foreground: "#94a3b8",
                },
                destructive: {
                    DEFAULT: "#ef4444", // Neon Red
                    foreground: "#ffffff",
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            boxShadow: {
                "neon-red": "0 0 15px rgba(239, 68, 68, 0.4)",
                "neon-blue": "0 0 20px rgba(59, 130, 246, 0.5)",
                "glass": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
            },
            backdropBlur: {
                "xs": "2px",
            }
        },
    },
    plugins: [],
}
