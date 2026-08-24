import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// SPA: every route falls back to index.html, the file PocketBase's
			// standard static handler already looks for.
			// SPA: toda ruta cae en index.html, el archivo que el handler
			// estático estándar de PocketBase ya busca.
			adapter: adapter({ fallback: 'index.html' })
		})
	]
});
