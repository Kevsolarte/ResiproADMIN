<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { ArrowLeft, Pencil, Trash2, Plus, Archive, ArchiveRestore } from '@lucide/svelte';
	import StatCard from '$lib/components/ui/StatCard.svelte';
	import TableCard from '$lib/components/ui/TableCard.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import IncomeForm from '$lib/features/incomes/components/IncomeForm.svelte';
	import { useProjectIncomes } from '$lib/features/incomes/hooks/project-incomes.svelte';
	import type { IncomeInput } from '$lib/features/incomes/api';
	import type { Income } from '$lib/features/incomes/types';
	import CollaboratorPaymentForm from '$lib/features/collaborator-payments/components/CollaboratorPaymentForm.svelte';
	import { useProjectPayments } from '$lib/features/collaborator-payments/hooks/project-payments.svelte';
	import type { CollaboratorPaymentInput } from '$lib/features/collaborator-payments/api';
	import type { CollaboratorPayment } from '$lib/features/collaborator-payments/types';
	import { formatDate } from '$lib/utils/date';
	import { formatMoney } from '$lib/utils/money';
	import { paymentState, PAYMENT_STATE_LABELS, PAYMENT_STATE_CLASSES } from '$lib/utils/payment';
	import {
		getProject,
		updateProject,
		deleteProject,
		setProjectArchived,
		type ProjectInput
	} from '../api';
	import {
		STATUS_LABELS,
		TYPE_LABELS,
		COLLABORATOR_PAYMENT_MODE_LABELS,
		type Project
	} from '../types';
	import ProjectForm from './ProjectForm.svelte';

	interface Props {
		id: string;
	}

	let { id }: Props = $props();

	let project = $state<Project | null>(null);
	let loading = $state(true);
	let error = $state('');

	// Reading the initial value on purpose: the route wraps this component in
	// {#key id}, so a different project always remounts it.
	// Se lee el valor inicial a propósito: la ruta envuelve este componente en
	// {#key id}, así que otro proyecto siempre lo remonta.
	// svelte-ignore state_referenced_locally
	const incomesStore = useProjectIncomes(id);
	// svelte-ignore state_referenced_locally
	const paymentsStore = useProjectPayments(id);

	async function loadProject() {
		try {
			project = await getProject(id);
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			loading = false;
		}
	}

	onMount(loadProject);

	let formOpen = $state(false);
	let incomeOpen = $state(false);
	let payoutOpen = $state(false);

	// null = alta; con record = edición. Es el mismo Drawer en los dos casos.
	// null = create; with a record = edit. Same Drawer either way.
	let editingIncome = $state<Income | null>(null);
	let editingPayment = $state<CollaboratorPayment | null>(null);

	function openIncome(income: Income | null) {
		editingIncome = income;
		incomeOpen = true;
	}

	function openPayout(payout: CollaboratorPayment | null) {
		editingPayment = payout;
		payoutOpen = true;
	}
	let confirmOpen = $state(false);
	let removing = $state(false);

	const inState = $derived(paymentState(project?.next_payment ?? ''));
	const outState = $derived(paymentState(project?.collaborator_next_payment ?? ''));

	const balance = $derived(incomesStore.total - paymentsStore.total);

	// A project with money attached is archived, never deleted: deleting it
	// would strip the name off its own history.
	// Un proyecto con plata asociada se archiva, nunca se borra: borrarlo le
	// sacaría el nombre a su propio historial.
	const movements = $derived(incomesStore.incomes.length + paymentsStore.payments.length);
	const canDelete = $derived(movements === 0);

	async function toggleArchived() {
		if (!project) return;

		removing = true;
		try {
			await setProjectArchived(id, !project.archived);
			await loadProject();
			confirmOpen = false;
		} finally {
			removing = false;
		}
	}

	async function saveProject(input: ProjectInput) {
		await updateProject(id, input);
		await loadProject();
	}

	// Both mutations fire a Go hook that rewrites a cached date on the project,
	// so reloading it is what makes the new value show up right away.
	// Las dos mutaciones disparan un hook de Go que reescribe una fecha cacheada
	// del proyecto, así que recargarlo es lo que muestra el valor nuevo al toque.
	async function saveIncome(input: IncomeInput) {
		if (editingIncome) await incomesStore.update(editingIncome.id, input);
		else await incomesStore.create(input);
		await loadProject();
	}

	async function savePayout(input: CollaboratorPaymentInput) {
		if (editingPayment) await paymentsStore.update(editingPayment.id, input);
		else await paymentsStore.create(input);
		await loadProject();
	}

	async function confirmDelete() {
		removing = true;
		try {
			await deleteProject(id);
			await goto('/panel/projects');
		} finally {
			removing = false;
		}
	}
</script>

<div class="p-6">
	<a
		href="/panel/projects"
		class="sidebar-link-custom mb-3 inline-flex items-center gap-1 text-sidebar-muted transition-colors hover:text-foreground"
	>
		<ArrowLeft class="h-3 w-3" />
		Proyectos
	</a>

	{#if loading}
		<p class="table-cell-custom py-10 text-center text-muted-foreground">Cargando...</p>
	{:else if error || !project}
		<p class="table-cell-custom py-10 text-center text-destructive">
			{error || 'Proyecto no encontrado.'}
		</p>
	{:else}
		<div class="mb-5 flex items-start justify-between gap-3">
			<div class="min-w-0">
				<h1 class="page-title truncate">{project.name}</h1>
				<p class="mt-0.5 text-[10px] leading-[14px] text-muted-foreground">
					{project.client || 'Sin cliente'}
					{#if project.type}· {TYPE_LABELS[project.type]}{/if}
					{#if project.status}· {STATUS_LABELS[project.status]}{/if}
					{#if project.is_monthly}· Cobro mensual{/if}
				</p>
			</div>

			<div class="flex shrink-0 items-center gap-1.5">
				<button
					onclick={() => (formOpen = true)}
					class="flex h-8 items-center gap-1.5 rounded-lg bg-muted px-3 text-[9px] leading-3 font-medium text-foreground transition-colors hover:bg-accent"
				>
					<Pencil class="h-3 w-3" />
					Editar
				</button>
				{#if project.archived}
					<button
						onclick={toggleArchived}
						disabled={removing}
						class="flex h-8 items-center gap-1.5 rounded-lg bg-muted px-3 text-[9px] leading-3 font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
					>
						<ArchiveRestore class="h-3 w-3" />
						Desarchivar
					</button>
				{:else}
					<button
						onclick={() => (confirmOpen = true)}
						aria-label={canDelete ? 'Eliminar proyecto' : 'Archivar proyecto'}
						class="flex h-8 items-center rounded-lg bg-muted px-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
					>
						{#if canDelete}
							<Trash2 class="h-3 w-3" />
						{:else}
							<Archive class="h-3 w-3" />
						{/if}
					</button>
				{/if}
			</div>
		</div>

		{#if project.archived}
			<div class="mb-3 rounded-lg bg-warning/15 px-3 py-2">
				<p class="table-cell-custom text-warning">
					Proyecto archivado. No aparece en la grilla ni en los selectores, pero su historial
					sigue nombrándolo.
				</p>
			</div>
		{/if}

		<div class="mb-3 grid grid-cols-2 gap-2.5 md:grid-cols-4">
			<StatCard
				label="Cobrado al cliente"
				value={formatMoney(incomesStore.total)}
				valueClass="text-success"
			/>
			<StatCard
				label="Pagado al colaborador"
				value={formatMoney(paymentsStore.total)}
				valueClass="text-destructive"
			/>
			<StatCard
				label="Margen del proyecto"
				value={formatMoney(balance)}
				valueClass={balance < 0 ? 'text-destructive' : 'text-success'}
			/>
			<StatCard
				label="Acuerdo con el colaborador"
				value={project.collaborator_payment_mode
					? COLLABORATOR_PAYMENT_MODE_LABELS[project.collaborator_payment_mode]
					: '—'}
			/>
		</div>

		<div class="grid gap-2.5 xl:grid-cols-2">
			<TableCard>
				<div class="flex items-center justify-between gap-2 px-2.5 py-2">
					<div class="min-w-0">
						<p class="stat-card-label">Cobros del cliente</p>
						<div class="mt-0.5 flex items-center gap-1.5">
							<span class="table-cell-custom text-muted-foreground">
								Próximo: {formatDate(project.next_payment)}
							</span>
							{#if inState !== 'none'}
								<span
									class="table-cell-custom rounded-md px-1.5 py-0.5 {PAYMENT_STATE_CLASSES[inState]}"
								>
									{PAYMENT_STATE_LABELS[inState]}
								</span>
							{/if}
						</div>
					</div>

					<button
						onclick={() => openIncome(null)}
						class="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-[9px] leading-3 font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
					>
						<Plus class="h-3 w-3" />
						Cobro
					</button>
				</div>

				{#if incomesStore.loading}
					<p class="table-cell-custom px-2.5 py-6 text-center text-muted-foreground">Cargando...</p>
				{:else if incomesStore.incomes.length === 0}
					<p class="table-cell-custom px-2.5 py-6 text-center text-muted-foreground">
						Sin cobros registrados.
					</p>
				{:else}
					<table class="w-full">
						<thead>
							<tr class="bg-muted">
								{#each ['Fecha', 'Monto', 'Nota'] as header (header)}
									<th class="table-header-custom px-2.5 py-1.5 text-left">{header}</th>
								{/each}
								<th class="w-16"><span class="sr-only">Acciones</span></th>
							</tr>
						</thead>
						<tbody>
							{#each incomesStore.incomes as income, i (income.id)}
								<tr class={i % 2 === 1 ? 'bg-muted/50' : ''}>
									<td class="table-cell-custom px-2.5 py-1.5">{formatDate(income.date)}</td>
									<td class="table-cell-custom px-2.5 py-1.5 text-success">
										+{formatMoney(income.amount)}
									</td>
									<td class="table-cell-custom px-2.5 py-1.5">{income.note || '—'}</td>
									<td class="px-2.5 py-1.5">
										<div class="flex items-center justify-end gap-1">
											<button
												onclick={() => openIncome(income)}
												aria-label="Editar cobro del {formatDate(income.date)}"
												class="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
											>
												<Pencil class="h-3 w-3" />
											</button>
											<button
												onclick={async () => {
													await incomesStore.remove(income.id);
													await loadProject();
												}}
												aria-label="Eliminar cobro del {formatDate(income.date)}"
												class="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
											>
												<Trash2 class="h-3 w-3" />
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</TableCard>

			<TableCard>
				<div class="flex items-center justify-between gap-2 px-2.5 py-2">
					<div class="min-w-0">
						<p class="stat-card-label">Pagos al colaborador</p>
						<div class="mt-0.5 flex items-center gap-1.5">
							<span class="table-cell-custom text-muted-foreground">
								Próximo: {formatDate(project.collaborator_next_payment)}
							</span>
							{#if outState !== 'none'}
								<span
									class="table-cell-custom rounded-md px-1.5 py-0.5 {PAYMENT_STATE_CLASSES[outState]}"
								>
									{PAYMENT_STATE_LABELS[outState]}
								</span>
							{/if}
						</div>
					</div>

					<button
						onclick={() => openPayout(null)}
						disabled={!project.collaborator}
						class="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-[9px] leading-3 font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
					>
						<Plus class="h-3 w-3" />
						Pago
					</button>
				</div>

				{#if !project.collaborator}
					<p class="table-cell-custom px-2.5 py-6 text-center text-muted-foreground">
						Este proyecto no tiene colaborador asignado.
					</p>
				{:else if paymentsStore.loading}
					<p class="table-cell-custom px-2.5 py-6 text-center text-muted-foreground">Cargando...</p>
				{:else if paymentsStore.payments.length === 0}
					<p class="table-cell-custom px-2.5 py-6 text-center text-muted-foreground">
						Sin pagos registrados.
					</p>
				{:else}
					<table class="w-full">
						<thead>
							<tr class="bg-muted">
								{#each ['Fecha', 'Monto', 'Nota'] as header (header)}
									<th class="table-header-custom px-2.5 py-1.5 text-left">{header}</th>
								{/each}
								<th class="w-16"><span class="sr-only">Acciones</span></th>
							</tr>
						</thead>
						<tbody>
							{#each paymentsStore.payments as payout, i (payout.id)}
								<tr class={i % 2 === 1 ? 'bg-muted/50' : ''}>
									<td class="table-cell-custom px-2.5 py-1.5">{formatDate(payout.date)}</td>
									<td class="table-cell-custom px-2.5 py-1.5 text-destructive">
										-{formatMoney(payout.amount)}
									</td>
									<td class="table-cell-custom px-2.5 py-1.5">{payout.note || '—'}</td>
									<td class="px-2.5 py-1.5">
										<div class="flex items-center justify-end gap-1">
											<button
												onclick={() => openPayout(payout)}
												aria-label="Editar pago del {formatDate(payout.date)}"
												class="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
											>
												<Pencil class="h-3 w-3" />
											</button>
											<button
												onclick={async () => {
													await paymentsStore.remove(payout.id);
													await loadProject();
												}}
												aria-label="Eliminar pago del {formatDate(payout.date)}"
												class="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
											>
												<Trash2 class="h-3 w-3" />
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</TableCard>
		</div>

		<ProjectForm bind:open={formOpen} {project} onsave={saveProject} />
		<IncomeForm bind:open={incomeOpen} income={editingIncome} lockedProjectId={id} onsave={saveIncome} />
		<CollaboratorPaymentForm
			bind:open={payoutOpen}
			payment={editingPayment}
			lockedProjectId={id}
			onsave={savePayout}
		/>

		<ConfirmDialog
			bind:open={confirmOpen}
			title={canDelete ? 'Eliminar proyecto' : 'Archivar proyecto'}
			description={canDelete
				? `Se va a eliminar «${project.name}». No tiene cobros ni pagos registrados.`
				: `«${project.name}» tiene ${movements} movimiento${movements === 1 ? '' : 's'} registrado${movements === 1 ? '' : 's'}. Se archiva en vez de borrarse, para que su historial siga nombrándolo. Podés desarchivarlo cuando quieras.`}
			confirmLabel={canDelete ? 'Eliminar' : 'Archivar'}
			loading={removing}
			onconfirm={canDelete ? confirmDelete : toggleArchived}
		/>
	{/if}
</div>
