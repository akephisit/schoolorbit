import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

function getCsrfTrustedOrigins() {
	const defaults = ['http://localhost:5173'];
	const corsOrigins = (process.env.CSRF_TRUSTED_ORIGINS || '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
	return [...new Set([...defaults, ...corsOrigins])];
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: adapter({
			regions: ['sin1'], // Singapore for better Asia performance
			runtime: 'nodejs20.x',
			memory: 512
		}),
		csrf: {
			trustedOrigins: getCsrfTrustedOrigins()
		}
	}
};

export default config;
