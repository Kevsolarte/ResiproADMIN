<script lang="ts">
	import Drawer from '$lib/components/ui/Drawer.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import SelectField from '$lib/components/ui/SelectField.svelte';
	import type { CollaboratorInput } from '../api';
	import { ROLE_LABELS, type Collaborator } from '../types';

	interface Props {
		open: boolean;
		collaborator: Collaborator | null;
		onsave: (input: CollaboratorInput) => Promise<void>;
	}

	let { open = $bindable(false), collaborator, onsave }: Props = $props();

	let name = $state('');
	let email = $state('');
	let role = $state('');
	let saving = $state(false);
	let error = $state('');

	$effect(() => {
		if (!open) return;

		name = collaborator?.name ?? '';
		email = collaborator?.email ?? '';
		role = collaborator?.role ?? '';
		error = '';
	});

	const roleOptions = Object.entries(ROLE_LABELS) as [string, string][];

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		error = '';

		try {
			await onsave({ name, email, role: role as CollaboratorInput['role'] });
			open = false;
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			saving = false;
		}
	}
</script>

<Drawer
	bind:open
	title={collaborator ? 'Editar colaborador' : 'Nuevo colaborador'}
	description="El acuerdo de pago se define en cada proyecto"
>
	<form id="collaborator-form" onsubmit={handleSubmit} class="space-y-3">
		<TextField label="Nombre" bind:value={name} required placeholder="Ana Pérez" />
		<TextField label="Email" type="email" bind:value={email} placeholder="ana@resiproco.com" />
		<SelectField label="Rol" bind:value={role} options={roleOptions} />

		{#if error}
			<p class="table-cell-custom text-destructive">{error}</p>
		{/if}
	</form>

	{#snippet footer()}
		<button
			type="submit"
			form="collaborator-form"
			disabled={saving}
			class="h-8 rounded-lg bg-primary px-4 text-[9px] leading-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
		>
			{saving ? 'Guardando...' : 'Guardar'}
		</button>
	{/snippet}
</Drawer>
