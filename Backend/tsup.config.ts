import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  target: 'node22',
  clean: true,
  sourcemap: true,
  // @selah/domain ships TypeScript source, so it has to be bundled into the output.
  noExternal: ['@selah/domain'],
});
