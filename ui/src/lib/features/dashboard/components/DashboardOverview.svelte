<script lang="ts">
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import StatCard from '$lib/components/ui/StatCard.svelte';
	import TableCard from '$lib/components/ui/TableCard.svelte';
	import { formatDate, toDate } from '$lib/utils/date';
	import { formatMoney } from '$lib/utils/money';
	import { paymentState, PAYMENT_STATE_LABELS, PAYMENT_STATE_CLASSES } from '$lib/utils/payment';
	import { useProjects } from '$lib/features/projects/hooks/projects.svelte';
	import { useIncomes } from '$lib/features/incomes/hooks/incomes.svelte';
	import { useCollaborators } from '$lib/features/collaborators/hooks/collaborators.svelte';

	// The dashboard is the first screen that composes all three features.
	// El dashboard es la primera pantalla que compone las tres features.
	const projectsStore = useProjects();
	const incomesStore = useIncomes();
	const collaboratorsStore = useCollaborators();

	const loading = $derived(
		projectsStore.loading || incomesStore.loading || collaboratorsStore.loading
	);

	const money = $derived.by(() => {
		const now = new Date();
		let total = 0;
		let thisMonth = 0;

		for (const income of incomesStore.incomes) {
			total += income.amount ?? 0;

			const date = toDate(income.date);
			if (date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
				thisMonth += income.amount ?? 0;
			}
		}

		return { total, thisMonth };
	});

	// Everything with a cached next_payment, soonest first.
	// Todo lo que tenga un next_payment cacheado, lo más próximo primero.
	const upcoming = $derived(
		projectsStore.projects
			.filter((project) => project.next_payment)
			.map((project) => ({ project, dueState: paymentState(project.next_payment) }))
			.sort(
				(a, b) =>
					(toDate(a.project.next_payment)?.getTime() ?? 0) -
					(toDate(b.project.next_payment)?.getTime() ?? 0)
			)
	);

	const overdueCount = $derived(upcoming.filter((row) => row.dueState === 'overdue').length);
	const dueCount = $derived(upcoming.filter((row) => row.dueState === 'due').length);

	const activeProjects = $derived(
		projectsStore.projects.filter((project) => project.status === 'In progress').length
	);

	const latestIncomes = $derived(incomesStore.incomes.slice(0, 6));
</script>

<div class="p-6">
	<PageHeader title="Inicio" description="Resumen de proyectos, cobros y equipo" />

	<div class="mb-3 grid grid-cols-2 gap-2.5 md:grid-cols-5">
		<StatCard label="Cobrado este mes" value={formatMoney(money.thisMonth)} />
		<StatCard label="Total cobrado" value={formatMoney(money.total)} />
		<StatCard label="Proyectos activos" value={activeProjects} />
		<StatCard label="Cobros esta semana" value={dueCount} />
		<StatCard label="Atrasados" value={overdueCount} />
	</div>

	<div class="grid gap-2.5 lg:grid-cols-2">
		<TableCard>
			<div class="px-2.5 py-2">
				<p class="stat-card-label">Próximos cobros</p>
			</div>

			{#if loading}
				<p class="table-cell-custom px-2.5 py-6 text-center text-muted-foreground">Cargando...</p>
			{:else if upcoming.length === 0}
				<p class="table-cell-custom px-2.5 py-6 text-center text-muted-foreground">
					No hay cobros programados. Cargá un ingreso en un proyecto mensual.
				</p>
			{:else}
				<table class="w-full">
					<thead>
						<tr class="bg-muted">
							{#each ['Proyecto', 'Cliente', 'Fecha', 'Estado'] as header (header)}
								<th class="table-header-custom px-2.5 py-1.5 text-left">{header}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each upcoming as { project, dueState }, i (project.id)}
							<tr class={i % 2 === 1 ? 'bg-muted/50' : ''}>
								<td class="table-cell-custom px-2.5 py-1.5">{project.name}</td>
								<td class="table-cell-custom px-2.5 py-1.5">{project.client || '—'}</td>
								<td class="table-cell-custom px-2.5 py-1.5">
									{formatDate(project.next_payment)}
								</td>
								<td class="px-2.5 py-1.5">
									{#if dueState !== 'none'}
										<span
											class="table-cell-custom rounded-md px-1.5 py-0.5 {PAYMENT_STATE_CLASSES[dueState]}"
										>
											{PAYMENT_STATE_LABELS[dueState]}
										</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</TableCard>

		<TableCard>
			<div class="px-2.5 py-2">
				<p class="stat-card-label">Últimos ingresos</p>
			</div>

			{#if loading}
				<p class="table-cell-custom px-2.5 py-6 text-center text-muted-foreground">Cargando...</p>
			{:else if latestIncomes.length === 0}
				<p class="table-cell-custom px-2.5 py-6 text-center text-muted-foreground">
					Todavía no hay ingresos cargados.
				</p>
			{:else}
				<table class="w-full">
					<thead>
						<tr class="bg-muted">
							{#each ['Proyecto', 'Monto', 'Fecha'] as header (header)}
								<th class="table-header-custom px-2.5 py-1.5 text-left">{header}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each latestIncomes as income, i (income.id)}
							<tr class={i % 2 === 1 ? 'bg-muted/50' : ''}>
								<td class="table-cell-custom px-2.5 py-1.5">
									{income.expand?.project?.name ?? '—'}
								</td>
								<td class="table-cell-custom px-2.5 py-1.5">{formatMoney(income.amount)}</td>
								<td class="table-cell-custom px-2.5 py-1.5">{formatDate(income.date)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</TableCard>
	</div>
</div>
