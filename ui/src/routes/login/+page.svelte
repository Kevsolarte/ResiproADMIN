<script lang="ts">
	import { goto } from '$app/navigation';
	import { pb } from '$lib/api/pocketbase';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		loading = true;
		error = '';

		try {
			// On success the SDK stores the token in pb.authStore and persists
			// it in localStorage on its own.
			// Si funciona, el SDK guarda el token en pb.authStore y lo persiste
			// solo en localStorage.
			await pb.collection('users').authWithPassword(email, password);
			await goto('/panel');
		} catch {
			error = 'Email o contraseña incorrectos';
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-panel p-6">
	<div class="w-full max-w-xs rounded-xl bg-card p-6">
		<h1 class="page-title">Resiproco</h1>
		<p class="mt-0.5 mb-5 text-[10px] leading-[14px] text-muted-foreground">
			Panel interno de gestión
		</p>

		<form onsubmit={handleSubmit} class="space-y-3">
			<div>
				<label for="email" class="sidebar-group-label mb-1 block">Email</label>
				<input
					id="email"
					type="email"
					required
					bind:value={email}
					class="h-9 w-full rounded-lg bg-muted px-3 text-[11px] text-foreground outline-none focus:ring-1 focus:ring-ring"
				/>
			</div>

			<div>
				<label for="password" class="sidebar-group-label mb-1 block">Contraseña</label>
				<input
					id="password"
					type="password"
					required
					bind:value={password}
					class="h-9 w-full rounded-lg bg-muted px-3 text-[11px] text-foreground outline-none focus:ring-1 focus:ring-ring"
				/>
			</div>

			{#if error}
				<p class="table-cell-custom text-destructive">{error}</p>
			{/if}

			<button
				type="submit"
				disabled={loading}
				class="h-9 w-full rounded-lg bg-primary text-[9px] leading-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
			>
				{loading ? 'Entrando...' : 'Entrar'}
			</button>
		</form>
	</div>
</div>
