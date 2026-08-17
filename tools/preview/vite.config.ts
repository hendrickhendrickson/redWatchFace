import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

/**
 * The app lives in tools/preview but imports tools/gen, which is outside its own
 * root - so `fs.allow` has to reach up to the repo root or Vite refuses to serve
 * the generator's modules.
 *
 * NOTHING IS COPIED OR RE-EXPORTED. The preview imports face.ts and svg.ts
 * directly, which is the whole point: there is one tree, one renderer, and one set
 * of constants. A build step that duplicated any of them would create a second
 * source of truth, and the preview's job is to be a view of the first one.
 *
 * The default export is the one in the repo, and it stays: vite loads this file by convention
 * and reads its default export. rules.md's "named exports only" is about modules other code
 * imports, which this is not.
 */
export default defineConfig({
	// Relative asset URLs, so the built page works wherever it is mounted: the project-page path
	// (/redWatchFace/) before the custom domain's DNS resolves, and the domain root after. An
	// absolute base would have to be right about which of those it is, and be wrong for a while.
	// Safe here only because this is one page with no client-side routing.
	base: './',
	plugins: [svelte()],
	server: {
		fs: { allow: ['../..'] }
	}
});
