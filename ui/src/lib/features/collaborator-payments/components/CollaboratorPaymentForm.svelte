<script lang="ts">
	import Drawer from '$lib/components/ui/Drawer.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import SelectField from '$lib/components/ui/SelectField.svelte';
	import { toInputDate } from '$lib/utils/date';
	import { formatMoney } from '$lib/utils/money';
	import { useProjects } from '$lib/features/projects/hooks/projects.svelte';
	import { useCollaborators } from '$lib/features/collaborators/hooks/collaborators.svelte';
	import { COLLABORATOR_PAYMENT_MODE_LABELS } from '$lib/features/projects/types';
	import type { CollaboratorPaymentInput } from '../api';
	import type { CollaboratorPayment } from '../types';

	interface Props {
		open: boolean;
		payment: CollaboratorPayment | null;
		onsave: (input: CollaboratorPaymentInput) => Promise<void>;
		lockedProjectId?: string;
	}

	let { open = $bindable(false), payment, onsave, lockedProjectId }: Props = $props();

	// The forms load archived entities too, so a record that already points at
	// one keeps resolving its name. They just stay out of the picker below.
	// Los formularios cargan también las entidades archivadas, así un record que
	// ya apunta a una sigue resolviendo su nombre. Solo quedan fuera del select
	// de abajo.
	const projectsStore = useProjects(true);
	const collaboratorsStore = useCollaborators(true);

	let project = $state('');
	let amount = $state<number>(0);
	let date = $state('');
	let note = $state('');
	let saving = $state(false);
	let error = $state('');

	// The project carries the agreement, so everything else is read from it.
	// El proyecto lleva el acuerdo, así que todo lo demás se lee de ahí.
	const selectedProject = $derived(projectsStore.projects.find((item) => item.id === project));

	const collaborator = $derived(selectedProject?.collaborator ?? '');

	const collaboratorName = $derived(
		collaboratorsStore.collaborators.find((item) => item.id === collaborator)?.name ?? ''
	);

	$effect(() => {
		if (!open) return;

		project = lockedProjectId ?? payment?.project ?? '';
		amount = payment?.amount ?? 0;
		date = toInputDate(payment?.date ?? '') || new Date().toISOString().slice(0, 10);
		note = payment?.note ?? '';
		error = '';
	});

	// Suggest the agreed amount when creating a new payment on a project.
	// Sugiere el monto acordado al crear un pago nuevo sobre un proyecto.
	$effect(() => {
		if (open && !payment && selectedProject && amount === 0) {
			amount = selectedProject.collaborator_amount ?? 0;
		}
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

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		error = '';

		try {
			await onsave({ collaborator, project, amount: Number(amount) || 0, date, note });
			open = false;
		} catch (err) {
			// The Go hook's own message reaches the user as-is when a rule fails.
			// El mensaje del hook de Go llega tal cual al usuario si falla una regla.
			error = err instanceof Error ? err.message : String(err);
		} finally {
			saving = false;
		}
	}
</script>

<Drawer
	bind:open
	title={payment ? 'Editar pago' : 'Registrar pago'}
	description="Un pago de Resiproco al colaborador de un proyecto"
>
	<form id="collaborator-payment-form" onsubmit={handleSubmit} class="space-y-3">
		{#if !lockedProjectId}
			<SelectField label="Proyecto" bind:value={project} options={projectOptions} required />
		{/if}

		{#if selectedProject}
			<div class="rounded-lg bg-muted p-2.5">
				<p class="stat-card-label">Acuerdo de este proyecto</p>

				{#if collaboratorName}
					<p class="table-cell-custom mt-1">Colaborador: {collaboratorName}</p>
				{:else}
					<p class="table-cell-custom mt-1 text-warning">
						Este proyecto no tiene colaborador asignado. Asignale uno antes de pagarle.
					</p>
				{/if}

				{#if selectedProject.collaborator_payment_mode}
					<p class="table-cell-custom">
						Modalidad: {COLLABORATOR_PAYMENT_MODE_LABELS[
							selectedProject.collaborator_payment_mode
						]}
					</p>
				{/if}

				{#if selectedProject.collaborator_amount}
					<p class="table-cell-custom">
						Monto acordado: {formatMoney(selectedProject.collaborator_amount)}
					</p>
				{/if}
			</div>
		{/if}

		<TextField
			label="Monto pagado"
			type="number"
			bind:value={amount}
			required
			min={0.01}
			step="any"
		/>
		<TextField label="Fecha del pago" type="date" bind:value={date} required />
		<TextField label="Nota" bind:value={note} placeholder="Transferencia, quincena..." />

		{#if error}
			<p class="table-cell-custom text-destructive">{error}</p>
		{/if}
	</form>

	{#snippet footer()}
		<button
			type="submit"
			form="collaborator-payment-form"
			disabled={saving || !collaborator}
			class="h-8 rounded-lg bg-primary px-4 text-[9px] leading-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
		>
			{saving ? 'Guardando...' : 'Guardar'}
		</button>
	{/snippet}
</Drawer>
