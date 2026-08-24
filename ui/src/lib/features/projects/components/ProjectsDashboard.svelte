<script lang="ts">
	import { Archive } from '@lucide/svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import StatCard from '$lib/components/ui/StatCard.svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import ProjectCard from './ProjectCard.svelte';
	import ProjectForm from './ProjectForm.svelte';
	import { paymentState } from '$lib/utils/payment';
	import { useProjects } from '../hooks/projects.svelte';
	import type { ProjectInput } from '../api';

	const store = useProjects();

	let query = $state('');
	let formOpen = $state(false);

	const filtered = $derived(
		store.projects.filter((project) =>
			`${project.name} ${project.client}`.toLowerCase().includes(query.trim().toLowerCase())
		)
	);

	// Archived projects never count in the metrics: they owe nothing.
	// Los proyectos archivados nunca cuentan en las métricas: no deben nada.
	const stats = $derived.by(() => {
		const active = store.projects.filter((project) => !project.archived);
		let monthly = 0;
		let due = 0;
		let overdue = 0;

		for (const project of active) {
			if (project.is_monthly) monthly++;

			const dueState = paymentState(project.next_payment);
			if (dueState === 'overdue') overdue++;
			else if (dueState === 'due') due++;
		}

		return { total: active.length, monthly, due, overdue };
	});

	// Editing and deleting now live in the detail page: a card is a doorway,
	// not a control panel.
	// Editar y borrar ahora viven en la página de detalle: una card es una
	// puerta de entrada, no un panel de control.
	async function save(input: ProjectInput) {
		await store.create(input);
	}
</script>

<div class="p-6">
	<PageHeader title="Proyectos" description="Administra los proyectos y sus cobros" />

	<div class="mb-3 grid grid-cols-2 gap-2.5 md:grid-cols-4">
		<StatCard label="Proyectos" value={stats.total} />
		<StatCard label="Mensuales" value={stats.monthly} />
		<StatCard label="Por cobrar" value={stats.due} />
		<StatCard label="Atrasados" value={stats.overdue} />
	</div>

	<div class="mb-3 flex items-center justify-between gap-2">
		<SearchInput bind:value={query} placeholder="Buscar proyecto..." />

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
				onclick={() => (formOpen = true)}
				class="h-8 rounded-lg bg-primary px-3 text-[9px] leading-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
			>
				+ Nuevo proyecto
			</button>
		</div>
	</div>

	{#if store.loading}
		<p class="table-cell-custom py-10 text-center text-muted-foreground">Cargando...</p>
	{:else if store.error}
		<p class="table-cell-custom py-10 text-center text-destructive">{store.error}</p>
	{:else if filtered.length === 0}
		<div class="rounded-lg bg-card py-10 text-center">
			<p class="table-cell-custom text-muted-foreground">
				{store.projects.length === 0 ? 'Todavía no hay proyectos.' : 'Sin resultados.'}
			</p>
		</div>
	{:else}
		<div class="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
			{#each filtered as project (project.id)}
				<ProjectCard {project} />
			{/each}
		</div>
	{/if}
</div>

<ProjectForm bind:open={formOpen} project={null} onsave={save} />
