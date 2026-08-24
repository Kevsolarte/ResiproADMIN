<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { pb } from '$lib/api/pocketbase';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';

	let { children } = $props();

	// Gate the render: without this the panel flashes on screen for a moment
	// before the redirect kicks in.
	// Portón de render: sin esto el panel parpadea un instante en pantalla
	// antes de que la redirección ocurra.
	let ready = $state(false);

	onMount(() => {
		// authStore.isValid reads the token the SDK persisted in localStorage.
		// authStore.isValid lee el token que el SDK persistió en localStorage.
		if (!pb.authStore.isValid) {
			goto('/login');
			return;
		}
		ready = true;
	});
</script>

{#if ready}
	<div class="flex h-screen bg-panel">
		<Sidebar />

		<!-- min-w-0 stops wide tables from pushing the sidebar off screen.
		     min-w-0 evita que una tabla ancha empuje el sidebar fuera de pantalla. -->
		<main class="min-w-0 flex-1 overflow-y-auto">
			{@render children()}
		</main>
	</div>
{/if}
