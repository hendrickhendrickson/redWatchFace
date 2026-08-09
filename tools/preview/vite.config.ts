import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

/**
 * The app lives in tools/preview but imports tools/gen, which is outside its own
 * root - so `fs.allow` has to reach up to the repo root or Vite refuses to serve
 * the generator's modules.
 *
 * NOTHING IS COPIED OR RE-EXPORTED. The preview imports face.ts and svg.ts
 * directly, which is the whole point: there is one tree, one renderer, and one set
 * of constants. A build step that duplicated any of them would create a second
 * source of truth, and the preview's job is to be a view of the first one.
 */
export default defineConfig({
  plugins: [svelte()],
  server: {
    fs: { allow: ['../..'] },
  },
})
