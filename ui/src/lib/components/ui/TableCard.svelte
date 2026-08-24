<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<!-- overflow-hidden clips the rows to the rounded corners.
     overflow-hidden recorta las filas contra las esquinas redondeadas. -->
<div class="overflow-hidden rounded-lg bg-card">
	{@render children()}
</div>
