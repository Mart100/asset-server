import { invalidateAll } from '$app/navigation';
import { deserialize } from '$app/forms';

/**
 * Checks for duplicates before uploading.
 */
export async function checkDuplicates(filenames: string[], targetPath?: string): Promise<string[]> {
	const formData = new FormData();
	formData.append('filenames', JSON.stringify(filenames));

	const url = targetPath !== undefined ? `/${targetPath}?/checkDuplicates` : '?/checkDuplicates';
	const response = await fetch(url, { method: 'POST', body: formData });

	if (response.ok) {
		const result = deserialize(await response.text());
		if (result.type === 'success' && result.data && Array.isArray(result.data.duplicates)) {
			return result.data.duplicates as string[];
		}
	}
	return [];
}

/**
 * Uploads a list of files.
 */
export async function uploadFiles(
	files: FileList | File[],
	options: { targetPath?: string; replace?: boolean } = {}
) {
	const { targetPath, replace } = options;
	const formData = new FormData();
	for (const file of files) formData.append('images', file);
	if (replace) formData.append('replace', 'true');

	const url = targetPath !== undefined ? `/${targetPath}?/upload` : '?/upload';
	const response = await fetch(url, { method: 'POST', body: formData });

	if (response.ok) {
		await invalidateAll();
		return true;
	}
	return false;
}

/**
 * Deletes multiple images.
 */
export async function bulkDeleteImages(filenames: string[]) {
	const formData = new FormData();
	formData.append('filenames', JSON.stringify(filenames));

	const response = await fetch('?/bulkDelete', { method: 'POST', body: formData });
	if (response.ok) {
		await invalidateAll();
		return true;
	}
	return false;
}

/**
 * Renames an image.
 */
export async function renameImage(oldFilename: string, newName: string) {
	const formData = new FormData();
	formData.append('oldFilename', oldFilename);
	formData.append('newName', newName);

	const response = await fetch('?/renameImage', { method: 'POST', body: formData });
	if (response.ok) {
		await invalidateAll();
		return true;
	}
	return false;
}

/**
 * Adds a new target size.
 */
export async function addSize(size: string) {
	const formData = new FormData();
	formData.append('size', size);
	const response = await fetch('?/addSize', { method: 'POST', body: formData });
	if (response.ok) {
		await invalidateAll();
		return true;
	}
	return false;
}

/**
 * Removes a target size.
 */
export async function removeSize(size: string) {
	const formData = new FormData();
	formData.append('size', size);
	const response = await fetch('?/removeSize', { method: 'POST', body: formData });
	if (response.ok) {
		await invalidateAll();
		return true;
	}
	return false;
}

/**
 * Moves images to a new path.
 */
export async function moveImages(
	filenames: string[],
	oldPath: string,
	newPath: string,
	root = false
) {
	const formData = new FormData();
	formData.append('filenames', JSON.stringify(filenames));
	formData.append('oldPath', oldPath);
	formData.append('newPath', newPath);

	const url = root ? '/?/move' : '?/move';
	const response = await fetch(url, { method: 'POST', body: formData });
	if (response.ok) {
		await invalidateAll();
		return true;
	}
	return false;
}

/**
 * Moves a folder to a new parent path.
 */
export async function moveFolder(oldPath: string, newParentPath: string, root = false) {
	const formData = new FormData();
	formData.append('oldPath', oldPath);
	formData.append('newParentPath', newParentPath);

	const url = root ? '/?/moveFolder' : '?/moveFolder';
	const response = await fetch(url, { method: 'POST', body: formData });
	if (response.ok) {
		await invalidateAll();
		return true;
	}
	return false;
}

/**
 * Reorders images in a folder.
 */
export async function reorderImages(newOrder: string[]) {
	const formData = new FormData();
	formData.append('order', JSON.stringify(newOrder));

	const response = await fetch('?/reorder', { method: 'POST', body: formData });
	if (response.ok) {
		await invalidateAll();
		return true;
	}
	return false;
}

/**
 * Creates a new folder.
 */
export async function createFolder(name: string, parentPath: string) {
	const formData = new FormData();
	formData.append('name', name);
	formData.append('path', parentPath);

	const response = await fetch('/?/createFolder', { method: 'POST', body: formData });
	if (response.ok) {
		await invalidateAll();
		return true;
	}
	return false;
}

/**
 * Renames a folder.
 */
export async function renameFolder(path: string, newName: string) {
	const formData = new FormData();
	formData.append('path', path);
	formData.append('name', newName);

	const response = await fetch('/?/renameFolder', { method: 'POST', body: formData });
	if (response.ok) {
		await invalidateAll();
		return true;
	}
	return false;
}

/**
 * Deletes a folder.
 */
export async function deleteFolder(path: string) {
	const formData = new FormData();
	formData.append('path', path);

	const response = await fetch('/?/deleteFolder', { method: 'POST', body: formData });
	if (response.ok) {
		await invalidateAll();
		return true;
	}
	return false;
}
