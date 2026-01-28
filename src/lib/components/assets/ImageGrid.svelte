<script lang="ts">
	interface Props {
		path: string;
		images: string[];
		publicBaseUrl: string;
		selectedImages: Set<string>;
		draggingIndex: number | null;
		onImageClick: (e: MouseEvent, index: number, filename: string) => void;
		onImageDragStart: (e: DragEvent, index: number, filename: string) => void;
		onImageDragEnd: () => void;
		onImageDrop: (index: number) => void;
		onImageContextMenu: (e: MouseEvent, filename: string) => void;
	}

	let {
		path,
		images,
		publicBaseUrl,
		selectedImages,
		draggingIndex,
		onImageClick,
		onImageDragStart,
		onImageDragEnd,
		onImageDrop,
		onImageContextMenu
	}: Props = $props();
</script>

{#if images.length > 0}
	<div class="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
		{#each images as filename, i}
			{@const isSelected = selectedImages.has(filename)}
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div
				role="listitem"
				draggable="true"
				onclick={(e) => onImageClick(e, i, filename)}
				ondragstart={(e) => onImageDragStart(e, i, filename)}
				ondragend={() => onImageDragEnd()}
				ondragover={(e) => e.preventDefault()}
				ondrop={() => onImageDrop(i)}
				oncontextmenu={(e) => onImageContextMenu(e, filename)}
				class="group relative overflow-hidden rounded-lg border transition-all {isSelected
					? 'border-blue-500 bg-blue-500/10'
					: 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'} {draggingIndex === i
					? 'opacity-50'
					: ''}"
			>
				<div class="aspect-square overflow-hidden bg-zinc-800">
					<img
						src="{publicBaseUrl}/{path ? path + '/' : ''}webp/{filename}"
						alt={filename}
						loading="lazy"
						class="pointer-events-none h-full w-full object-cover select-none"
					/>
				</div>

				<div
					class="absolute inset-x-0 bottom-0 bg-black/60 p-2 backdrop-blur-sm transition-opacity {isSelected
						? 'opacity-100'
						: 'opacity-0 group-hover:opacity-100'}"
				>
					<p class="truncate font-mono text-[10px] text-zinc-300">{filename}</p>
				</div>

				<!-- Selection indicator -->
				{#if isSelected}
					<div
						class="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg"
					>
						<svg
							width="12"
							height="12"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="3"><path d="M20 6L9 17l-5-5" /></svg
						>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{:else}
	<div class="py-10 text-center text-zinc-600">
		<p>No images in this folder yet.</p>
	</div>
{/if}
