import { defineConfig } from 'tsdown'

export default defineConfig({
  dts: true,
  format: ['esm'],
  entry: ['./src/index.ts'],
  treeshake: true,
  external: [/^@better-auth\//, /^drizzle-orm/],
})
