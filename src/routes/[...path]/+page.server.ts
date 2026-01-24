import {
	getFolderContent,
	processAndSaveImage,
	deleteImage,
	updateMetadata
} from '$lib/server/storage';
import { error } from '@sveltejs/kit';
import { PUBLIC_ASSETS_BASE_URL } from '$env/static/public';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const folderPath = params.path || '';

	try {
		const content = await getFolderContent(folderPath);
		return {
			...content,
			publicBaseUrl: PUBLIC_ASSETS_BASE_URL
		};
	} catch {
		throw error(404, 'Folder not found');
	}
};

export const actions: Actions = {
	upload: async ({ params, request }) => {
		const folderPath = params.path || '';
		const data = await request.formData();
		const files = data.getAll('images') as File[];

		for (const file of files) {
			if (file.size > 0) {
				await processAndSaveImage(folderPath, file);
			}
		}

		return { success: true };
	},
	delete: async ({ params, request }) => {
		const folderPath = params.path || '';
		const data = await request.formData();
		const filename = data.get('filename') as string;

		if (filename) {
			await deleteImage(folderPath, filename);
		}

		return { success: true };
	},
	renameImage: async ({ params, request }) => {
		const folderPath = params.path || '';
		const data = await request.formData();
		const oldFilename = data.get('oldFilename') as string;
		const newName = data.get('newName') as string;

		if (oldFilename && newName) {
			const { renameImage: renameImageFn } = await import('$lib/server/storage');
			await renameImageFn(folderPath, oldFilename, newName);
		}

		return { success: true };
	},
	reorder: async ({ params, request }) => {
		const folderPath = params.path || '';
		const data = await request.formData();
		const orderStr = data.get('order') as string;

		if (orderStr) {
			const newOrder = JSON.parse(orderStr);
			await updateMetadata(folderPath, (meta) => {
				meta.order = newOrder;
			});
		}

		return { success: true };
	},
	addSize: async ({ params, request }) => {
		const folderPath = params.path || '';
		const data = await request.formData();
		const size = data.get('size') as string;

		if (size) {
			const { addSizeToFolder } = await import('$lib/server/storage');
			await addSizeToFolder(folderPath, size);
		}

		return { success: true };
	},
	removeSize: async ({ params, request }) => {
		const folderPath = params.path || '';
		const data = await request.formData();
		const size = data.get('size') as string;

		if (size) {
			const { removeSizeFromFolder } = await import('$lib/server/storage');
			await removeSizeFromFolder(folderPath, size);
		}

		return { success: true };
	},
	createFolder: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name') as string;
		const path = data.get('path') as string;

		if (name) {
			const { createFolder: createFolderFn } = await import('$lib/server/storage');
			await createFolderFn(path, name);
		}

		return { success: true };
	},
	deleteFolder: async ({ request }) => {
		const data = await request.formData();
		const path = data.get('path') as string;

		if (path) {
			const { deleteFolder: deleteFolderFn } = await import('$lib/server/storage');
			await deleteFolderFn(path);
		}

		return { success: true };
	},
	renameFolder: async ({ request }) => {
		const data = await request.formData();
		const path = data.get('path') as string;
		const newName = data.get('name') as string;

		if (path && newName) {
			const { renameFolder: renameFolderFn } = await import('$lib/server/storage');
			await renameFolderFn(path, newName);
		}

		return { success: true };
	},
	moveFolder: async ({ request }) => {
		const data = await request.formData();
		const oldPath = data.get('oldPath') as string;
		const newParentPath = data.get('newParentPath') as string;

		if (oldPath !== null && newParentPath !== null) {
			const { moveFolder } = await import('$lib/server/storage');
			await moveFolder(oldPath, newParentPath);
		}

		return { success: true };
	},
	move: async ({ request }) => {
		const data = await request.formData();
		const filename = data.get('filename') as string;
		const filenamesStr = data.get('filenames') as string;
		const oldPath = data.get('oldPath') as string;
		const newPath = data.get('newPath') as string;

		const { moveImage } = await import('$lib/server/storage');

		if (filenamesStr) {
			const filenames = JSON.parse(filenamesStr) as string[];
			for (const f of filenames) {
				await moveImage(oldPath, f, newPath);
			}
		} else if (filename && oldPath !== null && newPath !== null) {
			await moveImage(oldPath, filename, newPath);
		}

		return { success: true };
	},
	bulkDelete: async ({ params, request }) => {
		const folderPath = params.path || '';
		const data = await request.formData();
		const filenamesStr = data.get('filenames') as string;

		if (filenamesStr) {
			const filenames = JSON.parse(filenamesStr) as string[];
			const { deleteImage } = await import('$lib/server/storage');
			for (const f of filenames) {
				await deleteImage(folderPath, f);
			}
		}

		return { success: true };
	}
};
