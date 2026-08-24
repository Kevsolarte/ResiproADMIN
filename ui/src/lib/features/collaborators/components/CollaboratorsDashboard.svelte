<script lang="ts">
	import { onMount } from 'svelte';
	import { Pencil, Trash2, Archive, ArchiveRestore } from '@lucide/svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import StatCard from '$lib/components/ui/StatCard.svelte';
	import TableCard from '$lib/components/ui/TableCard.svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import CollaboratorForm from './CollaboratorForm.svelte';
	import { formatDate, toDate } from '$lib/utils/date';
	import { paymentState, PAYMENT_STATE_LABELS, PAYMENT_STATE_CLASSES } from '$lib/utils/payment';
	import { useProjects } from '$lib/features/projects/hooks/projects.svelte';
	import { listPaidCollaboratorIds } from '$lib/features/collaborator-payments/api';
	import { useCollaborators } from '../hooks/collaborators.svelte';
	import type { CollaboratorInput } from '../api';
	import { ROLE_LABELS, type Collaborator } from '../types';

	const store = useCollaborators();

	// The payment agreement lives on the project now, so a collaborator's
	// payment info is derived from the projects assigned to them. Archived
	// projects are included: they still count as history.
	// El acuerdo de pago ahora vive en el proyecto, así que la info de pago de
	// un colaborador se deriva de los proyectos que tiene asignados. Los
	// proyectos archivados entran igual: siguen contando como historial.
	const projectsStore = useProjects(true);

	// Who already received money. Deleting them would blank the relation on
	// their payments, leaving an amount nobody can attribute.
	// A quiénes ya se les pagó. Borrarlos vaciaría la relation de sus pagos,
	// dejando un monto que nadie puede atribuir.
	let paidIds = $state<Set<string>>(new Set());

	async function loadPaidIds() {
		paidIds = new Set(await listPaidCollaboratorIds());
	}

	onMount(loadPaidIds);

	let query = $state('');

	let formOpen = $state(false);
	let editing = $state<Collaborator | null>(null);

	let confirmOpen = $state(false);
	let deleting = $state<Collaborator | null>(null);
	let removing = $state(false);

	function openCreate() {
		editing = null;
		formOpen = true;
	}

	function openEdit(collaborator: Collaborator) {
		editing = collaborator;
		formOpen = true;
	}

	function askDelete(collaborator: Collaborator) {
		deleting = collaborator;
		confirmOpen = true;
	}

	async function save(input: CollaboratorInput) {
		if (editing) await store.update(editing.id, input);
		else await store.create(input);
	}

	function projectsOf(collaboratorId: string) {
		return projectsStore.projects.filter((project) => project.collaborator === collaboratorId);
	}

	// Anything that would lose its meaning if this person disappeared.
	// Todo lo que perdería sentido si esta persona desapareciera.
	function hasHistory(collaboratorId: string): boolean {
		return paidIds.has(collaboratorId) || projectsOf(collaboratorId).length > 0;
	}

	// The soonest pending payment across this person's active projects: an
	// archived project owes nothing.
	// El pago pendiente más próximo entre los proyectos activos de esta persona:
	// un proyecto archivado no debe nada.
	function nextPaymentOf(collaboratorId: string): string {
		const dates = projectsOf(collaboratorId)
			.filter((project) => !project.archived)
			.map((project) => project.collaborator_next_payment)
			.filter(Boolean)
			.sort((a, b) => (toDate(a)?.getTime() ?? 0) - (toDate(b)?.getTime() ?? 0));

		return dates[0] ?? '';
	}

	async function confirmDelete() {
		if (!deleting) return;

		removing = true;
		try {
			if (hasHistory(deleting.id)) await store.archive(deleting.id, true);
			else await store.remove(deleting.id);

			await loadPaidIds();
			confirmOpen = false;
		} finally {
			removing = false;
		}
	}

	const filtered = $derived(
		store.collaborators.filter((collaborator) =>
			`${collaborator.name} ${collaborator.email}`.toLowerCase().includes(query.trim().toLowerCase())
		)
	);

	const stats = $derived.by(() => {
		let assigned = 0;
		let pending = 0;

		for (const collaborator of store.collaborators) {
			if (projectsOf(collaborator.id).length > 0) assigned++;

			const dueState = paymentState(nextPaymentOf(collaborator.id));
			if (dueState === 'overdue' || dueState === 'due') pending++;
		}

		return { total: store.collaborators.length, assigned, pending };
	});
</script>

<div class="p-6">
	<PageHeader
		title="Colaboradores"
		description="El equipo; el acuerdo de pago se define por proyecto"
	/>

	<div class="mb-3 grid grid-cols-3 gap-2.5">
		<StatCard label="Colaboradores" value={stats.total} />
		<StatCard label="Con proyectos" value={stats.assigned} />
		<StatCard label="Pagos pendientes" value={stats.pending} />
	</div>

	<TableCard>
		<div class="flex items-center justify-between gap-2 px-2.5 py-2">
			<SearchInput bind:value={query} placeholder="Buscar colaborador..." />

			<div class="flex shrink-0 items-center gap-1.5">
				<button
					onclick={() => store.setShowArchived(!store.showArchived)}
					class="flex h-8 items-center gap-1.5 rounded-lg px-3 text-[9px] leading-3 font-medium transition-colors {store.showArchived
						? 'bg-accent text-accent-foreground'
						: 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
				>
					<Archive class="h-3 w-3" />
					{store.showArchived ? 'Viendo archivados' : 'Ver archivados'}
				</button>

				<button
					onclick={openCreate}
					class="h-8 rounded-lg bg-primary px-3 text-[9px] leading-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
				>
					+ Nuevo colaborador
				</button>
			</div>
		</div>

		{#if store.loading}
			<p class="table-cell-custom px-2.5 py-6 text-center text-muted-foreground">Cargando...</p>
		{:else if store.error}
			<p class="table-cell-custom px-2.5 py-6 text-center text-destructive">{store.error}</p>
		{:else if filtered.length === 0}
			<p class="table-cell-custom px-2.5 py-6 text-center text-muted-foreground">
				{store.collaborators.length === 0 ? 'Todavía no hay colaboradores.' : 'Sin resultados.'}
			</p>
		{:else}
			<table class="w-full">
				<thead>
					<tr class="bg-muted">
						{#each ['Nombre', 'Rol', 'Email', 'Proyectos', 'Próximo pago'] as header (header)}
							<th class="table-header-custom px-2.5 py-1.5 text-left">{header}</th>
						{/each}
						<th class="w-16"><span class="sr-only">Acciones</span></th>
					</tr>
				</thead>
				<tbody>
					{#each filtered as collaborator, i (collaborator.id)}
						{@const next = nextPaymentOf(collaborator.id)}
						{@const dueState = paymentState(next)}
						{@const keep = hasHistory(collaborator.id)}
						<tr class={i % 2 === 1 ? 'bg-muted/50' : ''}>
							<td class="px-2.5 py-1.5">
								<div class="flex items-center gap-1.5">
									<span
										class="table-cell-custom {collaborator.archived ? 'text-muted-foreground' : ''}"
									>
										{collaborator.name}
									</span>
									{#if collaborator.archived}
										<span
											class="table-cell-custom rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground"
										>
											Archivado
										</span>
									{/if}
								</div>
							</td>
							<td class="table-cell-custom px-2.5 py-1.5">
								{collaborator.role ? ROLE_LABELS[collaborator.role] : '—'}
							</td>
							<td class="table-cell-custom px-2.5 py-1.5">{collaborator.email || '—'}</td>
							<td class="table-cell-custom px-2.5 py-1.5">
								{projectsOf(collaborator.id).length}
							</td>
							<td class="px-2.5 py-1.5">
								<div class="flex items-center gap-1.5">
									<span class="table-cell-custom">{formatDate(next)}</span>
									{#if dueState !== 'none'}
										<span
											class="table-cell-custom rounded-md px-1.5 py-0.5 {PAYMENT_STATE_CLASSES[dueState]}"
										>
											{PAYMENT_STATE_LABELS[dueState]}
										</span>
									{/if}
								</div>
							</td>
							<td class="px-2.5 py-1.5">
								<div class="flex items-center justify-end gap-1">
									{#if collaborator.archived}
										<button
											onclick={() => store.archive(collaborator.id, false)}
											aria-label="Desarchivar {collaborator.name}"
											class="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
										>
											<ArchiveRestore class="h-3 w-3" />
										</button>
									{:else}
										<button
											onclick={() => openEdit(collaborator)}
											aria-label="Editar {collaborator.name}"
											class="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
										>
											<Pencil class="h-3 w-3" />
										</button>
										<button
											onclick={() => askDelete(collaborator)}
											aria-label="{keep ? 'Archivar' : 'Eliminar'} {collaborator.name}"
											class="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
										>
											{#if keep}
												<Archive class="h-3 w-3" />
											{:else}
												<Trash2 class="h-3 w-3" />
											{/if}
										</button>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</TableCard>
</div>

<CollaboratorForm bind:open={formOpen} collaborator={editing} onsave={save} />

{#if deleting}
	{@const keep = hasHistory(deleting.id)}
	<ConfirmDialog
		bind:open={confirmOpen}
		title={keep ? 'Archivar colaborador' : 'Eliminar colaborador'}
		description={keep
			? `«${deleting.name}» tiene proyectos o pagos registrados. Se archiva en vez de borrarse, para que ese historial siga diciendo a quién se le pagó. Podés desarchivarlo cuando quieras.`
			: `Se va a eliminar «${deleting.name}». No tiene proyectos ni pagos registrados.`}
		confirmLabel={keep ? 'Archivar' : 'Eliminar'}
		loading={removing}
		onconfirm={confirmDelete}
	/>
{/if}
