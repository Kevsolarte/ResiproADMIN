<script lang="ts">
	import { Search } from '@lucide/svelte';

	interface Props {
		value: string;
		placeholder?: string;
	}

	// $bindable is what allows bind:value from the parent. Without it the prop
	// would be read-only and typing would not update the parent's state.
	// $bindable es lo que habilita bind:value desde el padre. Sin él la prop
	// sería de solo lectura y tipear no actualizaría el estado del padre.
	let { value = $bindable(''), placeholder = 'Buscar...' }: Props = $props();
</script>

<div class="relative w-full max-w-xs">
	<Search
		class="pointer-events-none absolute top-1/2 left-2.5 h-3 w-3 -translate-y-1/2 text-muted-foreground"
	/>
	<input
		type="text"
		bind:value
		{placeholder}
		class="h-8 w-full rounded-lg bg-muted pr-3 pl-7 text-[10px] text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
	/>
</div>
