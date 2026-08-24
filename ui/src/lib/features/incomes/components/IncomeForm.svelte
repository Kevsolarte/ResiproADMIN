<script lang="ts">
	import Drawer from '$lib/components/ui/Drawer.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import SelectField from '$lib/components/ui/SelectField.svelte';
	import { toInputDate } from '$lib/utils/date';
	import { useProjects } from '$lib/features/projects/hooks/projects.svelte';
	import type { IncomeInput } from '../api';
	import type { Income } from '../types';

	interface Props {
		open: boolean;
		income: Income | null;
		onsave: (input: IncomeInput) => Promise<void>;
		// Set from the project detail page: the project is already known, so the
		// field is pre-filled and hidden instead of being asked again.
		// Se pasa desde la página de detalle del proyecto: el proyecto ya se
		// conoce, así que el campo va precargado y oculto en vez de preguntarse.
		lockedProjectId?: string;
	}

	let { open = $bindable(false), income, onsave, lockedProjectId }: Props = $props();

	// The forms load archived entities too, so a record that already points at
	// one keeps resolving its name. They just stay out of the picker below.
	// Los formularios cargan también las entidades archivadas, así un record que
	// ya apunta a una sigue resolviendo su nombre. Solo quedan fuera del select
	// de abajo.
	const projectsStore = useProjects(true);

	let project = $state('');
	let amount = $state<number>(0);
	let date = $state('');
	let note = $state('');
	let saving = $state(false);
	let error = $state('');

	$effect(() => {
		if (!open) return;

		project = lockedProjectId ?? income?.project ?? '';
		amount = income?.amount ?? 0;
		// Default to today: an income is almost always registered the day it lands.
		// Por defecto hoy: un ingreso casi siempre se registra el día que entra.
		date = toInputDate(income?.date ?? '') || new Date().toISOString().slice(0, 10);
		note = income?.note ?? '';
		error = '';
	});

	// An archived project is not offered, unless the record being edited already
	// points at it: dropping it from the list would silently reassign the record.
	// Un proyecto archivado no se ofrece, salvo que el record que se está
	// editando ya apunte a él: sacarlo de la lista lo reasignaría en silencio.
	const projectOptions = $derived(
		projectsStore.projects
			.filter((item) => !item.archived || item.id === project)
			.map((item) => [item.id, item.name] as [string, string])
	);

	// The Go hook only recalculates when the project is monthly.
	// El hook de Go solo recalcula si el proyecto es mensual.
	const selectedIsMonthly = $derived(
		projectsStore.projects.find((item) => item.id === project)?.is_monthly ?? false
	);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		error = '';

		try {
			await onsave({ project, amount: Number(amount) || 0, date, note });
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
	title={income ? 'Editar ingreso' : 'Nuevo ingreso'}
	description="Un cobro recibido de un cliente"
>
	<form id="income-form" onsubmit={handleSubmit} class="space-y-3">
		{#if !lockedProjectId}
			<SelectField label="Proyecto" bind:value={project} options={projectOptions} required />
		{/if}

		{#if project && selectedIsMonthly}
			<p class="text-[9px] leading-3 text-accent-foreground">
				Proyecto mensual: al guardar, el próximo cobro se recalcula solo.
			</p>
		{/if}

		<TextField
			label="Monto"
			type="number"
			bind:value={amount}
			required
			min={0.01}
			step="any"
		/>
		<TextField label="Fecha del cobro" type="date" bind:value={date} required />
		<TextField label="Nota" bind:value={note} placeholder="Transferencia, cuota 2..." />

		{#if error}
			<p class="table-cell-custom text-destructive">{error}</p>
		{/if}
	</form>

	{#snippet footer()}
		<button
			type="submit"
			form="income-form"
			disabled={saving}
			class="h-8 rounded-lg bg-primary px-4 text-[9px] leading-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
		>
			{saving ? 'Guardando...' : 'Guardar'}
		</button>
	{/snippet}
</Drawer>
