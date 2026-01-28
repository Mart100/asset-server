<script lang="ts">
	import type { FolderNode } from '$lib/server/storage';

	interface Props {
		visible: boolean;
		pos: { x: number; y: number };
		contextFolder: FolderNode | null;
		onNewFolder: () => void;
		onDownloadZip: () => void;
		onRename: () => void;
		onDelete: () => void;
		onHide: () => void;
	}

	let {
		visible,
		pos,
		contextFolder,
		onNewFolder,
		onDownloadZip,
		onRename,
		onDelete,
		onHide
	}: Props = $props();
</script>

{#if visible}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed z-50 w-48 rounded-lg border border-zinc-700 bg-zinc-800 p-1 shadow-2xl"
		style="top: {pos.y}px; left: {pos.x}px"
		onmouseleave={onHide}
		role="menu"
		aria-label="Folder actions"
		tabindex="-1"
	>
		<button
			onclick={onNewFolder}
			role="menuitem"
			class="w-full rounded px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-700"
		>
			New Folder
		</button>
		<button
			onclick={onDownloadZip}
			role="menuitem"
			class="w-full rounded px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-700"
		>
			Download ZIP
		</button>
		{#if contextFolder}
			<button
				onclick={onRename}
				role="menuitem"
				class="w-full rounded px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-700"
			>
				Rename
			</button>
			<div class="my-1 border-t border-zinc-700" role="separator"></div>
			<button
				onclick={onDelete}
				role="menuitem"
				class="w-full rounded bg-red-900/10 px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-red-900/30"
			>
				Delete
			</button>
		{/if}
	</div>
{/if}
