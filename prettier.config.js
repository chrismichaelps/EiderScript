/** @type {import('prettier').Config} */
export default {
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  semi: false,
  singleQuote: true,
  quoteProps: "as-needed",
  jsxSingleQuote: false,
  trailingComma: "all",
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: "always",
  endOfLine: "lf",
  overrides: [
    {
      files: ["*.yaml", "*.yml"],
      options: { singleQuote: false },
    },
    {
      files: ["*.md"],
      options: { printWidth: 100, proseWrap: "preserve" },
    },
  ],
};
