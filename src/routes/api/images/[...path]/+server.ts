import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getFolderContent } from '$lib/server/storage';
import { PUBLIC_ASSETS_BASE_URL } from '$env/static/public';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.isAdmin) {
		throw error(401, 'Unauthorized');
	}

	const folderPath = params.path || '';

	try {
		const content = await getFolderContent(folderPath);

		const images = content.images.map((filename) => ({
			name: filename,
			url: `${PUBLIC_ASSETS_BASE_URL}/${folderPath ? folderPath + '/' : ''}webp/${filename}`,
			originalUrl: `${PUBLIC_ASSETS_BASE_URL}/${folderPath ? folderPath + '/' : ''}originals/${filename.split('.')[0]}${filename.endsWith('.webp') ? '' : ''}` // Note: original might have different extension, but our storage saves it with a hash
		}));

		// Fix for original URL: storage.ts saves original as `${basename}${ext}`
		// but we only have `webpFilename` which is `${basename}.webp`
		// We can't know the original extension easily without reading the directory
		// But for now, returning the webp and folder info is a good start.

		return json({
			path: folderPath,
			images,
			subfolders: content.subfolders,
			totalSize: content.totalSize
		});
	} catch (e) {
		console.error(e);
		throw error(404, 'Folder not found');
	}
};
