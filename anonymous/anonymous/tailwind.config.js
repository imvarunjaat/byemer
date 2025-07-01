/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}", // Scan all JS/TS files in the app directory
    "./components/**/*.{js,jsx,ts,tsx}", // Scan all JS/TS files in a components directory (if you have one)
    // Add any other paths where you use Tailwind classes
  ],
  presets: [require("nativewind/preset")], // Use NativeWind's preset
  theme: {
    extend: {},
  },
  plugins: [],
};
