<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	interface Props {
		data: {
			images: string[];
			sizes: string[];
			subfolders: string[];
			path: string;
			publicBaseUrl: string;
		};
	}

	let { data }: Props = $props();

	let draggingIndex = $state<number | null>(null);

	// Multi-select state
	let selectedImages = $state<Set<string>>(new Set());
	let lastSelectedIndex = $state<number | null>(null);

	// Context Menu State
	let menuVisible = $state(false);
	let menuPos = $state({ x: 0, y: 0 });
	let contextImage = $state<string | null>(null);
	let submenuVisible = $state(false);

	let isDraggingFile = $state(false);
	let dragonFolder = $state<string | null>(null);

	function showMenu(e: MouseEvent, filename: string) {
		e.preventDefault();
		e.stopPropagation();

		// If right-clicking an image not in the selection, clear selection and select this one
		if (!selectedImages.has(filename)) {
			selectedImages = new Set([filename]);
			const idx = data.images.indexOf(filename);
			lastSelectedIndex = idx;
		}

		contextImage = filename;
		menuPos = { x: e.clientX, y: e.clientY };
		menuVisible = true;
		submenuVisible = false;
	}

	function hideMenu() {
		menuVisible = false;
		submenuVisible = false;
	}

	function handleImageClick(e: MouseEvent, index: number, filename: string) {
		// Close context menu if open
		hideMenu();

		// Stop propagation to prevent background click handler from clearing selection
		e.stopPropagation();

		if (e.ctrlKey || e.metaKey) {
			const newSet = new Set(selectedImages);
			if (newSet.has(filename)) {
				newSet.delete(filename);
			} else {
				newSet.add(filename);
			}
			selectedImages = newSet;
			lastSelectedIndex = index;
		} else if (e.shiftKey && lastSelectedIndex !== null) {
			const start = Math.min(index, lastSelectedIndex);
			const end = Math.max(index, lastSelectedIndex);
			const newSet = new Set(selectedImages);
			for (let i = start; i <= end; i++) {
				newSet.add(data.images[i]);
			}
			selectedImages = newSet;
		} else {
			selectedImages = new Set([filename]);
			lastSelectedIndex = index;
		}
	}

	async function handleAddSize() {
		const size = window.prompt('Enter target size (e.g. 400x300):');
		if (!size || !/^\d+x\d+$/.test(size)) return;

		const formData = new FormData();
		formData.append('size', size);
		const response = await fetch('?/addSize', { method: 'POST', body: formData });
		if (response.ok) invalidateAll();
	}

	async function handleRemoveSize(size: string) {
		if (!window.confirm(`Remove size ${size} and delete its derivatives?`)) return;

		const formData = new FormData();
		formData.append('size', size);
		const response = await fetch('?/removeSize', { method: 'POST', body: formData });
		if (response.ok) invalidateAll();
	}

	async function handleRenameImage(oldFilename: string) {
		const namePart = oldFilename.split('-').slice(0, -1).join('-') || oldFilename.split('.')[0];
		const newName = window.prompt('New filename:', namePart);
		if (!newName || newName === namePart) {
			hideMenu();
			return;
		}

		const formData = new FormData();
		formData.append('oldFilename', oldFilename);
		formData.append('newName', newName);

		const response = await fetch('?/renameImage', { method: 'POST', body: formData });
		if (response.ok) invalidateAll();
		hideMenu();
	}

	function handleDragStart(e: DragEvent, index: number, filename: string) {
		// If dragging an image not in selection, select only it
		if (!selectedImages.has(filename)) {
			selectedImages = new Set([filename]);
			lastSelectedIndex = index;
		}

		draggingIndex = index;

		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData(
				'text/plain',
				JSON.stringify({
					filenames: Array.from(selectedImages),
					oldPath: data.path
				})
			);
		}
	}

	function handleDragEnd() {
		draggingIndex = null;
	}

	async function handleDrop(targetIndex: number) {
		if (draggingIndex === null || draggingIndex === targetIndex) return;

		// Reordering only works if exactly one image is selected or dragged
		if (selectedImages.size !== 1) return;

		const newOrder = [...data.images];
		const item = newOrder.splice(draggingIndex, 1)[0];
		newOrder.splice(targetIndex, 0, item);

		const formData = new FormData();
		formData.append('order', JSON.stringify(newOrder));

		const response = await fetch('?/reorder', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			await invalidateAll();
		}

		draggingIndex = null;
	}

	async function handleDeleteImages() {
		const count = selectedImages.size;
		if (count === 0) {
			hideMenu();
			return;
		}

		const msg = count === 1 ? 'Delete image?' : `Delete ${count} selected images?`;
		if (!window.confirm(msg)) {
			hideMenu();
			return;
		}

		const formData = new FormData();
		formData.append('filenames', JSON.stringify(Array.from(selectedImages)));

		const response = await fetch('?/bulkDelete', { method: 'POST', body: formData });
		if (response.ok) {
			selectedImages = new Set();
			lastSelectedIndex = null;
			invalidateAll();
		}
		hideMenu();
	}

	async function handleMoveImages(filenames: string[], oldPath: string, newPath: string) {
		const formData = new FormData();
		formData.append('filenames', JSON.stringify(filenames));
		formData.append('oldPath', oldPath);
		formData.append('newPath', newPath);

		const response = await fetch('?/move', { method: 'POST', body: formData });
		if (response.ok) {
			selectedImages = new Set();
			lastSelectedIndex = null;
			invalidateAll();
		}
	}

	async function handleMoveFolder(oldPath: string, newParentPath: string) {
		const formData = new FormData();
		formData.append('oldPath', oldPath);
		formData.append('newParentPath', newParentPath);

		const response = await fetch('?/moveFolder', { method: 'POST', body: formData });
		if (response.ok) {
			invalidateAll();
		}
	}

	function handleDragOverFile(e: DragEvent) {
		if (e.dataTransfer?.types.includes('Files')) {
			e.preventDefault();
			isDraggingFile = true;
		}
	}

	function handleFolderDragStart(e: DragEvent, folderName: string) {
		const fullPath = data.path ? `${data.path}/${folderName}` : folderName;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData(
				'text/plain',
				JSON.stringify({
					type: 'folder',
					path: fullPath
				})
			);
		}
	}

	async function handleUpload(files: FileList | File[], targetPath?: string) {
		const formData = new FormData();
		for (const file of files) {
			formData.append('images', file);
		}

		// If no targetPath, it uses the current page action
		const actionUrl = targetPath !== undefined ? `/${targetPath}?/upload` : '?/upload';

		const response = await fetch(actionUrl, {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			invalidateAll();
		}
	}

	async function handleFileDrop(e: DragEvent) {
		if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
			e.preventDefault();
			e.stopPropagation();
			isDraggingFile = false;

			await handleUpload(e.dataTransfer.files);
		} else {
			isDraggingFile = false;
		}
	}

	function handleDropToFolder(e: DragEvent, folderName: string) {
		e.preventDefault();
		e.stopPropagation();

		// Handle file drop to subfolder
		if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
			const targetPath = data.path ? `${data.path}/${folderName}` : folderName;
			handleUpload(e.dataTransfer.files, targetPath);
			return;
		}

		const dropDataStr = e.dataTransfer?.getData('text/plain');
		if (!dropDataStr) return;

		try {
			const dropData = JSON.parse(dropDataStr);

			if (dropData.type === 'folder') {
				const targetPath = data.path ? `${data.path}/${folderName}` : folderName;
				if (dropData.path !== targetPath) {
					handleMoveFolder(dropData.path, targetPath);
				}
				return;
			}

			const filenames = dropData.filenames || [dropData.filename];
			const oldPath = dropData.oldPath;
			const newPath = data.path ? `${data.path}/${folderName}` : folderName;

			if (oldPath !== newPath) {
				handleMoveImages(filenames, oldPath, newPath);
			}
		} catch {
			// Not our drag data
		}
	}

	function handleFolderDragEnter(folderName: string, event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();
		dragonFolder = folderName;
	}

	function handleFolderDragLeave(folderName: string, event: DragEvent) {
		event.stopPropagation();
		const current = event.currentTarget as Node | null;
		const related = event.relatedTarget as Node | null;
		if (current && related && current.contains(related)) {
			return;
		}
		if (dragonFolder === folderName) {
			dragonFolder = null;
		}
	}

	function copyUrl(filename: string, size?: string) {
		const pathPrefix = data.path ? data.path + '/' : '';
		const subfolder = size || 'webp';
		const url = `${data.publicBaseUrl}/${pathPrefix}${subfolder}/${filename}`;
		navigator.clipboard.writeText(url);
		hideMenu();
	}
</script>

<svelte:window onclick={hideMenu} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="relative h-full p-8"
	onclick={() => {
		// Clear selection when clicking non-interactive parts of the page
		selectedImages = new Set();
		lastSelectedIndex = null;
	}}
	ondragover={handleDragOverFile}
	ondragleave={() => (isDraggingFile = false)}
	ondrop={handleFileDrop}
>
	{#if isDraggingFile}
		<div
			class="pointer-events-none absolute inset-0 z-[100] flex items-center justify-center rounded-xl bg-blue-600/10 backdrop-blur-[2px]"
		>
			<div
				class="flex flex-col items-center gap-4 rounded-3xl border border-zinc-700 bg-zinc-900 px-12 py-10 shadow-2xl"
			>
				<div
					class="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-600/20 text-blue-500"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="40"
						height="40"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline
							points="17 8 12 3 7 8"
						/><line x1="12" x2="12" y1="3" y2="15" /></svg
					>
				</div>
				<p class="text-xl font-bold text-white">Drop images to upload</p>
				<p class="text-sm text-zinc-400">Files will be processed into WebP format</p>
			</div>
		</div>
	{/if}

	<header class="mb-8 flex items-center justify-between" onclick={(e) => e.stopPropagation()}>
		<div>
			<h1 class="text-2xl font-bold">
				{data.path ? '/' + data.path : '/ (Root)'}
			</h1>
			<div class="mt-2 flex flex-wrap items-center gap-2">
				<p class="mr-2 text-sm text-zinc-500">{data.images.length} images</p>

				<div class="mx-2 h-4 w-px bg-zinc-800"></div>

				<span class="text-xs font-semibold tracking-wider text-zinc-600 uppercase"
					>Auto-Resizes:</span
				>
				{#each data.sizes as size}
					<span
						class="flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-400"
					>
						{size}
						<button
							onclick={() => handleRemoveSize(size)}
							class="ml-1 transition-colors hover:text-red-500"
						>
							×
						</button>
					</span>
				{/each}
				<button
					onclick={handleAddSize}
					class="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400 transition-colors hover:bg-zinc-700"
				>
					+ Add Size
				</button>
			</div>
		</div>

		<form
			method="POST"
			action="?/upload"
			use:enhance={() => {
				return async ({ update }) => {
					await update();
				};
			}}
			enctype="multipart/form-data"
			class="flex items-center gap-4"
		>
			<label
				class="cursor-pointer rounded-md bg-blue-600 px-4 py-2 font-medium transition-colors hover:bg-blue-700"
			>
				Upload Images
				<input
					type="file"
					name="images"
					multiple
					accept="image/*"
					class="hidden"
					onchange={(e) => e.currentTarget.form?.requestSubmit()}
				/>
			</label>
		</form>
	</header>

	{#if data.subfolders.length > 0}
		<div class="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
			{#each data.subfolders as folderName}
				<a
					href="/{data.path ? data.path + '/' : ''}{folderName}"
					draggable="true"
					onclick={() => {
						selectedImages = new Set();
						lastSelectedIndex = null;
					}}
					ondragstart={(e) => handleFolderDragStart(e, folderName)}
					ondragover={(e) => e.preventDefault()}
					ondragenter={(e) => handleFolderDragEnter(folderName, e)}
					ondragleave={(e) => handleFolderDragLeave(folderName, e)}
					ondrop={(e) => {
						dragonFolder = null;
						handleDropToFolder(e, folderName);
					}}
					class="flex items-center gap-3 rounded-lg border p-3 transition-all {dragonFolder ===
					folderName
						? 'border-blue-500 bg-blue-500/10 shadow-lg ring-1 ring-blue-500'
						: 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800'}"
				>
					<span class="text-xl">📁</span>
					<span class="truncate text-sm font-medium text-zinc-300">{folderName}</span>
				</a>
			{/each}
		</div>
		<div class="mb-8 h-px bg-zinc-800"></div>
	{/if}

	{#if data.images.length === 0 && data.subfolders.length === 0}
		<div
			class="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-800 py-20 text-zinc-600"
		>
			<p>No content in this folder yet.</p>
		</div>
	{:else if data.images.length === 0}
		<div class="py-10 text-center text-zinc-600">
			<p>No images in this folder yet.</p>
		</div>
	{:else}
		<div class="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
			{#each data.images as filename, i}
				{@const isSelected = selectedImages.has(filename)}
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<div
					role="listitem"
					draggable="true"
					onclick={(e) => handleImageClick(e, i, filename)}
					ondragstart={(e) => handleDragStart(e, i, filename)}
					ondragend={handleDragEnd}
					ondragover={(e) => e.preventDefault()}
					ondrop={() => handleDrop(i)}
					oncontextmenu={(e) => showMenu(e, filename)}
					class="group relative overflow-hidden rounded-lg border transition-all {isSelected
						? 'border-blue-500 bg-blue-500/10'
						: 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'} {draggingIndex === i
						? 'opacity-50'
						: ''}"
				>
					<div class="aspect-square overflow-hidden bg-zinc-800">
						<img
							src="{data.publicBaseUrl}/{data.path ? data.path + '/' : ''}webp/{filename}"
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
	{/if}
</div>

{#if menuVisible && contextImage}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed z-50 w-56 rounded-lg border border-zinc-700 bg-zinc-800 p-1 shadow-2xl"
		style="top: {menuPos.y}px; left: {menuPos.x}px"
		onclick={(e) => e.stopPropagation()}
	>
		{#if selectedImages.size === 1}
			<div class="relative" onmouseleave={() => (submenuVisible = false)}>
				<button
					onmouseenter={() => (submenuVisible = true)}
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
						class="absolute top-0 left-full ml-px w-40 rounded-lg border border-zinc-700 bg-zinc-800 p-1 shadow-2xl"
					>
						<button
							onclick={() => copyUrl(contextImage!)}
							class="w-full rounded px-3 py-2 text-left text-xs transition-colors hover:bg-zinc-700"
						>
							Standard (WebP)
						</button>
						<button
							onclick={() => copyUrl(contextImage!, 'originals')}
							class="w-full rounded px-3 py-2 text-left text-xs transition-colors hover:bg-zinc-700"
						>
							Original
						</button>
						{#if data.sizes.length > 0}
							<div class="my-1 border-t border-zinc-700"></div>
							{#each data.sizes as size}
								<button
									onclick={() => copyUrl(contextImage!, size)}
									class="w-full rounded px-3 py-2 text-left text-xs transition-colors hover:bg-zinc-700"
								>
									{size}
								</button>
							{/each}
						{/if}
					</div>
				{/if}
			</div>

			<button
				onclick={() => handleRenameImage(contextImage!)}
				class="w-full rounded px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-700"
			>
				Rename
			</button>

			<div class="my-1 border-t border-zinc-700"></div>
		{/if}

		<button
			onclick={handleDeleteImages}
			class="w-full rounded bg-red-900/10 px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-red-900/30"
		>
			{selectedImages.size > 1 ? `Delete Selected (${selectedImages.size})` : 'Delete'}
		</button>
	</div>
{/if}
