<script lang="ts">
	interface Props {
		visible: boolean;
		pos: { x: number; y: number };
		selectedCount: number;
		contextImage: string | null;
		submenuVisible: boolean;
		availableSizes: string[];
		onCopyUrl: (filename: string, size?: string) => void;
		onCopyName: (filename: string) => void;
		onRename: (filename: string) => void;
		onDelete: () => void;
		onToggleSubmenu: (visible: boolean) => void;
	}

	let {
		visible,
		pos,
		selectedCount,
		contextImage,
		submenuVisible,
		availableSizes,
		onCopyUrl,
		onCopyName,
		onRename,
		onDelete,
		onToggleSubmenu
	}: Props = $props();
</script>

{#if visible && contextImage}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed z-50 w-56 rounded-lg border border-zinc-700 bg-zinc-800 p-1 shadow-2xl"
		style="top: {pos.y}px; left: {pos.x}px"
		onclick={(e) => e.stopPropagation()}
	>
		{#if selectedCount === 1}
			<div class="relative" onmouseleave={() => onToggleSubmenu(false)}>
				<button
					onmouseenter={() => onToggleSubmenu(true)}
					onclick={(e) => e.stopPropagation()}
					class="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-700"
				>
					<span>Copy URL</span>
					<svg
						width="10"
						height="10"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"><path d="m9 18 6-6-6-6" /></svg
					>
				</button>

				{#if submenuVisible}
					<div
						role="menu"
						class="absolute top-0 {pos.x + 224 + 160 > window.innerWidth
							? 'right-full mr-px'
							: 'left-full ml-px'} w-40 rounded-lg border border-zinc-700 bg-zinc-800 p-1 shadow-2xl"
					>
						<button
							onclick={() => onCopyName(contextImage!)}
							class="w-full rounded px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-zinc-700"
						>
							Copy Filename (.webp)
						</button>
						<div class="my-1 border-t border-zinc-700"></div>

						<button
							onclick={() => onCopyUrl(contextImage!)}
							class="w-full rounded px-3 py-2 text-left text-xs transition-colors hover:bg-zinc-700"
						>
							Standard (WebP)
						</button>
						<button
							onclick={() => onCopyUrl(contextImage!, 'originals')}
							class="w-full rounded px-3 py-2 text-left text-xs transition-colors hover:bg-zinc-700"
						>
							Original
						</button>
						{#each availableSizes as size}
							<button
								onclick={() => onCopyUrl(contextImage!, size)}
								class="w-full rounded px-3 py-2 text-left text-xs transition-colors hover:bg-zinc-700"
							>
								{size}
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<button
				onclick={() => onRename(contextImage!)}
				class="w-full rounded px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-700"
			>
				Rename
			</button>

			<div class="my-1 border-t border-zinc-700"></div>
		{/if}

		<button
			onclick={onDelete}
			class="w-full rounded bg-red-900/10 px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-red-900/30"
		>
			{selectedCount > 1 ? `Delete Selected (${selectedCount})` : 'Delete'}
		</button>
	</div>
{/if}
