<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { X } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		open: boolean;
		title: string;
		description?: string;
		children: Snippet;
		footer?: Snippet;
	}

	// $bindable so the parent can both open it and be told when it closes
	// (Escape, overlay click, the X button).
	// $bindable para que el padre pueda abrirlo y además enterarse cuando se
	// cierra (Escape, click en el overlay, el botón X).
	let { open = $bindable(false), title, description, children, footer }: Props = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay
			class="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in data-[state=closed]:fade-out"
		/>

		<Dialog.Content
			class="fixed top-0 right-0 z-50 flex h-screen w-full max-w-sm flex-col bg-card shadow-xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right"
		>
			<div class="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
				<div class="min-w-0">
					<Dialog.Title class="page-title">{title}</Dialog.Title>
					{#if description}
						<Dialog.Description class="mt-0.5 text-[10px] leading-[14px] text-muted-foreground">
							{description}
						</Dialog.Description>
					{/if}
				</div>

				<Dialog.Close
					class="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					aria-label="Cerrar"
				>
					<X class="h-4 w-4" />
				</Dialog.Close>
			</div>

			<div class="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
				{@render children()}
			</div>

			{#if footer}
				<div class="flex items-center justify-end gap-2 bg-muted/50 px-5 py-3">
					{@render footer()}
				</div>
			{/if}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
