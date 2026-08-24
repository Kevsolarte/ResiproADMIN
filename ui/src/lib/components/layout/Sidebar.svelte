<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { pb } from '$lib/api/pocketbase';
	import { House, FolderKanban, Users, LogOut } from '@lucide/svelte';

	const groups = [
		{
			label: 'General',
			items: [{ label: 'Inicio', href: '/panel', icon: House }]
		},
		{
			label: 'Gestión',
			items: [
				{ label: 'Proyectos', href: '/panel/projects', icon: FolderKanban },
				{ label: 'Colaboradores', href: '/panel/collaborators', icon: Users }
			]
		}
	];

	// Exact match for /panel, prefix match for the rest, so "Inicio" does not
	// stay lit while standing on a child route.
	// Match exacto para /panel, por prefijo para el resto, así "Inicio" no
	// queda encendido mientras estás en una ruta hija.
	function isActive(href: string) {
		return href === '/panel' ? page.url.pathname === href : page.url.pathname.startsWith(href);
	}

	const email = $derived(pb.authStore.record?.email ?? '');

	function logout() {
		pb.authStore.clear();
		goto('/login');
	}
</script>

<aside class="flex h-screen w-46 shrink-0 flex-col bg-panel select-none">
	<div class="flex h-12 shrink-0 items-center px-3">
		<span class="text-[13px] leading-none font-semibold tracking-tight text-foreground">
			<span class="text-primary">RESI</span>PROCO
		</span>
	</div>

	<nav class="flex-1 space-y-3 overflow-y-auto px-2 pt-1 pb-3">
		{#each groups as group (group.label)}
			<div>
				<p class="sidebar-group-label mb-0.5 px-2">{group.label}</p>

				<div class="space-y-0.5">
					{#each group.items as item (item.href)}
						{@const active = isActive(item.href)}
						{@const Icon = item.icon}
						<a
							href={item.href}
							class="sidebar-link-custom flex items-center gap-2 rounded-md px-2 py-1 transition-colors duration-100"
							class:bg-card={active}
							class:sidebar-link-active={active}
							class:text-foreground={active}
							class:text-sidebar-muted={!active}
							class:hover:bg-primary-soft={!active}
						>
							<Icon
								class="h-4 w-4 shrink-0 stroke-[1.5] {active ? 'text-primary' : 'text-sidebar-muted'}"
							/>
							<span class="flex-1 truncate">{item.label}</span>
						</a>
					{/each}
				</div>
			</div>
		{/each}
	</nav>

	<div class="shrink-0 p-2">
		<div class="flex items-center gap-2 rounded-md px-2 py-1">
			<div
				class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-[9px] font-semibold text-accent-foreground"
			>
				{email.slice(0, 1).toUpperCase()}
			</div>
			<p class="min-w-0 flex-1 truncate text-[9px] leading-3 text-sidebar-muted">{email}</p>
			<button
				onclick={logout}
				aria-label="Cerrar sesión"
				class="shrink-0 rounded-md p-1 text-sidebar-muted transition-colors hover:bg-primary-soft hover:text-foreground"
			>
				<LogOut class="h-3.5 w-3.5" />
			</button>
		</div>
	</div>
</aside>
