import type { Config } from "tailwindcss";
export default { content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"], theme: { extend: { colors: { ink: "#201A32", plum: "#6C3BC6", lavender: "#EEE8FF", sand: "#FBF8F3" }, boxShadow: { float: "0 18px 45px rgba(48, 31, 78, .13)" } } }, plugins: [] } satisfies Config;
