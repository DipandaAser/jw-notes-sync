import svelte from 'eslint-plugin-svelte';

export default [
	...svelte.configs.recommended,
	{
		ignores: ['.svelte-kit/', 'build/', 'node_modules/']
	}
];
