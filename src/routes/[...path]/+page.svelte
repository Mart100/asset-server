<script lang="ts">
	import { invalidateAll } from '$app/navigation';

	// Lib
	import * as api from '$lib/api';
	import { SelectionManager } from '$lib/selection.svelte';

	// Components
	import Header from '$lib/components/assets/Header.svelte';
	import SubfolderGrid from '$lib/components/assets/SubfolderGrid.svelte';
	import ImageGrid from '$lib/components/assets/ImageGrid.svelte';
	import AssetContextMenu from '$lib/components/assets/AssetContextMenu.svelte';
	import DropZoneOverlay from '$lib/components/assets/DropZoneOverlay.svelte';

	interface Props {
		data: {
			images: string[];
			sizes: string[];
			subfolders: { name: string; size: number }[];
			path: string;
			publicBaseUrl: string;
			totalSize: number;
		};
	}

	let { data }: Props = $props();

	// Navigation State
	const parentPath = $derived(data.path ? data.path.split('/').slice(0, -1).join('/') : null);

	// Multi-select state
	const selection = new SelectionManager();

	// UI State
	let isDraggingFile = $state(false);
	let draggingIndex = $state<number | null>(null);
	let dragonFolder = $state<string | null>(null);

	// Context Menu State
	let menuVisible = $state(false);
	let menuPos = $state({ x: 0, y: 0 });
	let contextImage = $state<string | null>(null);
	let submenuVisible = $state(false);

	// --- Handlers ---

	function clearSelection() {
		selection.clear();
	}

	function showMenu(e: MouseEvent, filename: string) {
		e.preventDefault();
		e.stopPropagation();

		if (!selection.has(filename)) {
			selection.select(filename, data.images.indexOf(filename));
		}

		contextImage = filename;

		// Menu dimensions
		const menuWidth = 224;
		const menuHeight = 200;

		let x = e.clientX;
		let y = e.clientY;

		if (x + menuWidth > window.innerWidth) x -= menuWidth;
		if (y + menuHeight > window.innerHeight) y -= menuHeight;

		menuPos = { x, y };
		menuVisible = true;
		submenuVisible = false;
	}

	function hideMenu() {
		menuVisible = false;
		submenuVisible = false;
	}

	function handleImageClick(e: MouseEvent, index: number, filename: string) {
		hideMenu();
		e.stopPropagation();
		selection.handleExternalClick(e, index, filename, data.images);
	}

	// --- API Actions ---

	async function handleUpload(files: FileList | File[], targetPath?: string) {
		if (!files || files.length === 0) return;

		// 1. Check for duplicates
		const duplicates = await api.checkDuplicates(
			Array.from(files).map((f) => f.name),
			targetPath
		);
		let replace = false;

		if (duplicates.length > 0) {
			const msg =
				duplicates.length === 1
					? `A version of "${duplicates[0]}" already exists. Replace it?`
					: `${duplicates.length} files already exist. Replace them?`;

			if (!window.confirm(msg)) return;
			replace = true;
		}

		// 2. Perform upload
		await api.uploadFiles(files, { targetPath, replace });
	}

	async function handleDeleteImages() {
		const count = selection.size;
		if (count === 0) return;

		const msg = count === 1 ? 'Delete image?' : `Delete ${count} selected images?`;
		if (!window.confirm(msg)) return;

		const ok = await api.bulkDeleteImages(Array.from(selection.items));
		if (ok) clearSelection();
		hideMenu();
	}

	async function handleRenameImage(oldFilename: string) {
		const namePart = oldFilename.split('-').slice(0, -1).join('-') || oldFilename.split('.')[0];
		const newName = window.prompt('New filename:', namePart);
		if (!newName || newName === namePart) {
			hideMenu();
			return;
		}

		await api.renameImage(oldFilename, newName);
		hideMenu();
	}

	async function handleAddSize() {
		const size = window.prompt('Enter target size (e.g. 400x300):');
		if (!size || !/^\d+x\d+$/.test(size)) return;
		await api.addSize(size);
	}

	async function handleRemoveSize(size: string) {
		if (!window.confirm(`Remove size ${size} and delete its derivatives?`)) return;
		await api.removeSize(size);
	}

	async function handleMoveImages(filenames: string[], oldPath: string, newPath: string) {
		const ok = await api.moveImages(filenames, oldPath, newPath);
		if (ok) clearSelection();
	}

	async function handleMoveFolder(oldPath: string, newParentPath: string) {
		await api.moveFolder(oldPath, newParentPath);
	}

	// --- Drag & Drop ---

	function handleDragStart(e: DragEvent, index: number, filename: string) {
		if (!selection.has(filename)) {
			selection.select(filename, index);
		}
		draggingIndex = index;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData(
				'text/plain',
				JSON.stringify({ filenames: Array.from(selection.items), oldPath: data.path })
			);
		}
	}

	async function handleReorder(targetIndex: number) {
		if (draggingIndex === null || draggingIndex === targetIndex) return;
		if (selection.size !== 1) return;

		const newOrder = [...data.images];
		const item = newOrder.splice(draggingIndex, 1)[0];
		newOrder.splice(targetIndex, 0, item);

		await api.reorderImages(newOrder);
		draggingIndex = null;
	}

	function handleFolderDragStart(e: DragEvent, folderName: string) {
		const fullPath = data.path ? `${data.path}/${folderName}` : folderName;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'folder', path: fullPath }));
		}
	}

	function handleDropToFolder(e: DragEvent, folderName: string) {
		e.preventDefault();
		e.stopPropagation();

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
				if (dropData.path !== targetPath) handleMoveFolder(dropData.path, targetPath);
				return;
			}
			const filenames = dropData.filenames || [dropData.filename];
			const oldPath = dropData.oldPath;
			const newPath = data.path ? `${data.path}/${folderName}` : folderName;
			if (oldPath !== newPath) handleMoveImages(filenames, oldPath, newPath);
		} catch {
			/* Not our data */
		}
	}

	// --- Utilities ---

	function copyUrl(filename: string, size?: string) {
		const pathPrefix = data.path ? data.path + '/' : '';
		const subfolder = size || 'webp';
		const url = `${data.publicBaseUrl}/${pathPrefix}${subfolder}/${filename}`;
		navigator.clipboard.writeText(url);
		hideMenu();
	}

	function copyName(filename: string) {
		navigator.clipboard.writeText(filename);
		hideMenu();
	}
</script>

<svelte:window onclick={hideMenu} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="relative min-h-full p-8"
	onclick={clearSelection}
	ondragover={(e) => {
		if (e.dataTransfer?.types.includes('Files')) {
			e.preventDefault();
			isDraggingFile = true;
		}
	}}
	ondragleave={() => (isDraggingFile = false)}
	ondrop={(e) => {
		if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
			e.preventDefault();
			e.stopPropagation();
			isDraggingFile = false;
			handleUpload(e.dataTransfer.files);
		} else {
			isDraggingFile = false;
		}
	}}
>
	<DropZoneOverlay visible={isDraggingFile} />

	<Header
		path={data.path}
		imageCount={data.images.length}
		totalSize={data.totalSize}
		sizes={data.sizes}
		{parentPath}
		onAddSize={handleAddSize}
		onRemoveSize={handleRemoveSize}
		onUpload={handleUpload}
	/>

	<SubfolderGrid
		path={data.path}
		subfolders={data.subfolders}
		{dragonFolder}
		onClearSelection={clearSelection}
		onFolderDragStart={handleFolderDragStart}
		onFolderDrop={handleDropToFolder}
		onFolderDragEnter={(_, name) => (dragonFolder = name)}
		onFolderDragLeave={(event, name) => {
			event.stopPropagation();
			const current = event.currentTarget as Node | null;
			const related = event.relatedTarget as Node | null;
			if (current && related && current.contains(related)) return;
			if (dragonFolder === name) dragonFolder = null;
		}}
	/>

	<ImageGrid
		path={data.path}
		images={data.images}
		publicBaseUrl={data.publicBaseUrl}
		selectedImages={selection.items}
		{draggingIndex}
		onImageClick={handleImageClick}
		onImageDragStart={handleDragStart}
		onImageDragEnd={() => (draggingIndex = null)}
		onImageDrop={handleReorder}
		onImageContextMenu={showMenu}
	/>
</div>

<AssetContextMenu
	visible={menuVisible}
	pos={menuPos}
	selectedCount={selection.size}
	{contextImage}
	{submenuVisible}
	availableSizes={data.sizes}
	onCopyUrl={copyUrl}
	onCopyName={copyName}
	onRename={handleRenameImage}
	onDelete={handleDeleteImages}
	onToggleSubmenu={(v) => (submenuVisible = v)}
/>
