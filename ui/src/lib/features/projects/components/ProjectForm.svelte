<script lang="ts">
	import Drawer from '$lib/components/ui/Drawer.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import SelectField from '$lib/components/ui/SelectField.svelte';
	import CheckboxField from '$lib/components/ui/CheckboxField.svelte';
	import { useCollaborators } from '$lib/features/collaborators/hooks/collaborators.svelte';
	import type { ProjectInput } from '../api';
	import {
		STATUS_LABELS,
		TYPE_LABELS,
		COLLABORATOR_PAYMENT_MODE_LABELS,
		type Project
	} from '../types';

	interface Props {
		open: boolean;
		// null = creating, a record = editing.
		// null = creando, un record = editando.
		project: Project | null;
		onsave: (input: ProjectInput) => Promise<void>;
	}

	let { open = $bindable(false), project, onsave }: Props = $props();

	// Loads archived collaborators too, so a project that already points at one
	// keeps showing their name instead of an empty select.
	// Carga también los colaboradores archivados, así un proyecto que ya apunta a
	// uno sigue mostrando su nombre en vez de un select vacío.
	const collaboratorsStore = useCollaborators(true);

	let name = $state('');
	let client = $state('');
	let type = $state('');
	let collaborator = $state('');
	let status = $state('');
	let isMonthly = $state(false);
	let collaboratorPaymentMode = $state('');
	let collaboratorAmount = $state<number>(0);
	let saving = $state(false);
	let error = $state('');

	// Refill the fields every time the drawer opens, so an edit never shows the
	// leftovers of the previous one.
	// Rellena los campos cada vez que se abre el drawer, así una edición nunca
	// muestra los restos de la anterior.
	$effect(() => {
		if (!open) return;

		name = project?.name ?? '';
		client = project?.client ?? '';
		type = project?.type ?? '';
		collaborator = project?.collaborator ?? '';
		status = project?.status ?? '';
		isMonthly = project?.is_monthly ?? false;
		collaboratorPaymentMode = project?.collaborator_payment_mode ?? '';
		collaboratorAmount = project?.collaborator_amount ?? 0;
		error = '';
	});

	const typeOptions = Object.entries(TYPE_LABELS) as [string, string][];
	const statusOptions = Object.entries(STATUS_LABELS) as [string, string][];
	const collaboratorModeOptions = Object.entries(COLLABORATOR_PAYMENT_MODE_LABELS) as [
		string,
		string
	][];

	const modeHint = $derived(
		collaboratorPaymentMode === 'Hourly'
			? 'Ciclo de 15 días desde el último pago registrado.'
			: collaboratorPaymentMode === 'Per project'
				? 'Sin ciclo por fecha: se paga contra entrega.'
				: ''
	);
	// An archived collaborator is not offered for new assignments, unless this
	// project already has them assigned.
	// Un colaborador archivado no se ofrece para asignaciones nuevas, salvo que
	// este proyecto ya lo tenga asignado.
	const collaboratorOptions = $derived(
		collaboratorsStore.collaborators
			.filter((item) => !item.archived || item.id === collaborator)
			.map((item) => [item.id, item.name] as [string, string])
	);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		error = '';

		try {
			await onsave({
				name,
				client,
				collaborator,
				is_monthly: isMonthly,
				collaborator_amount: Number(collaboratorAmount) || 0,
				type: type as ProjectInput['type'],
				status: status as ProjectInput['status'],
				collaborator_payment_mode:
					collaboratorPaymentMode as ProjectInput['collaborator_payment_mode']
			});
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
	title={project ? 'Editar proyecto' : 'Nuevo proyecto'}
	description={project ? project.name : 'Cargá los datos del proyecto'}
>
	<form id="project-form" onsubmit={handleSubmit} class="space-y-3">
		<TextField label="Nombre" bind:value={name} required placeholder="Landing Aurora" />
		<TextField label="Cliente" bind:value={client} placeholder="Aurora Studio" />
		<SelectField label="Tipo" bind:value={type} options={typeOptions} />
		<SelectField label="Colaborador" bind:value={collaborator} options={collaboratorOptions} />
		<SelectField label="Estado" bind:value={status} options={statusOptions} />

		<CheckboxField
			label="Cobro mensual"
			bind:checked={isMonthly}
			hint="Si está activo, el próximo cobro se recalcula solo con cada ingreso."
		/>

		<div class="border-t border-border pt-3">
			<p class="sidebar-group-label mb-2">Pago al colaborador</p>

			<div class="space-y-3">
				<SelectField
					label="Modalidad"
					bind:value={collaboratorPaymentMode}
					options={collaboratorModeOptions}
				/>

				{#if modeHint}
					<p class="text-[9px] leading-3 text-muted-foreground">{modeHint}</p>
				{/if}

				<TextField
					label="Monto acordado"
					type="number"
					bind:value={collaboratorAmount}
					min={0}
					step="any"
				/>
			</div>
		</div>

		{#if error}
			<p class="table-cell-custom text-destructive">{error}</p>
		{/if}
	</form>

	{#snippet footer()}
		<button
			type="submit"
			form="project-form"
			disabled={saving}
			class="h-8 rounded-lg bg-primary px-4 text-[9px] leading-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
		>
			{saving ? 'Guardando...' : 'Guardar'}
		</button>
	{/snippet}
</Drawer>
