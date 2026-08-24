<script lang="ts">
	import { Dialog } from 'bits-ui';

	interface Props {
		open: boolean;
		title: string;
		description?: string;
		confirmLabel?: string;
		loading?: boolean;
		onconfirm: () => void;
	}

	let {
		open = $bindable(false),
		title,
		description,
		confirmLabel = 'Eliminar',
		loading = false,
		onconfirm
	}: Props = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay
			class="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in data-[state=closed]:fade-out"
		/>

		<Dialog.Content
			class="fixed top-1/2 left-1/2 z-50 w-full max-w-xs -translate-x-1/2 -translate-y-1/2 rounded-xl bg-card p-5 shadow-xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95"
		>
			<Dialog.Title class="page-title">{title}</Dialog.Title>

			{#if description}
				<Dialog.Description class="mt-1 text-[10px] leading-[15px] text-muted-foreground">
					{description}
				</Dialog.Description>
			{/if}

			<div class="mt-4 flex items-center justify-end gap-2">
				<Dialog.Close
					class="h-8 rounded-lg bg-muted px-3 text-[9px] leading-[12px] font-medium text-foreground transition-colors hover:bg-accent"
				>
					Cancelar
				</Dialog.Close>

				<button
					type="button"
					disabled={loading}
					onclick={onconfirm}
					class="h-8 rounded-lg bg-destructive px-3 text-[9px] leading-[12px] font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
				>
					{loading ? 'Eliminando...' : confirmLabel}
				</button>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
