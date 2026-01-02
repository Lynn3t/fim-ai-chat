/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  // 自定义表单元素的颜色
  // 这会将所有"text-blue-600"(复选框默认选中状态)替换为"text-black"或其他所需颜色
  corePlugins: {
    textColor: ({ addUtilities }) => {
      addUtilities({
        '.text-blue-600': {
          '--tw-text-opacity': '1',
          'color': 'rgb(0 0 0 / var(--tw-text-opacity))' // 替换为纯黑色
        }
      });
    }
  }
} 