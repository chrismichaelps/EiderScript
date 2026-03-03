// @EiderScript — Vitest config (plain CJS to avoid esbuild transpilation)
export default {
  test: {
    globals: false,
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    testTimeout: 15000,
    pool: "forks",
    forks: {
      singleFork: true,
    },
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/__tests__/**", "src/vite-plugin/**"],
    },
  },
  resolve: {
    conditions: ["development", "browser"],
  },
};
