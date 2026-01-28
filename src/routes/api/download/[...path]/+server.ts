import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validatePath } from '$lib/server/storage';
import archiver from 'archiver';
import { PassThrough } from 'node:stream';
import fs from 'node:fs';

export const GET: RequestHandler = async ({ params, locals }) => {
	// Simple auth check similar to hooks
	if (!locals.isAdmin) {
		throw error(401, 'Unauthorized');
	}

	const folderPath = params.path || '';
	let absolutePath: string;

	try {
		absolutePath = validatePath(folderPath);
	} catch {
		throw error(400, 'Invalid path');
	}

	// Check if folder exists
	if (!fs.existsSync(absolutePath)) {
		throw error(404, 'Folder not found');
	}

	const stream = new PassThrough();
	const archive = archiver('zip', {
		zlib: { level: 9 }
	});

	archive.on('error', (err) => {
		throw err;
	});

	// Pipe the archive to our passthrough stream
	archive.pipe(stream);

	// Add the directory to the archive, excluding internal folders
	const IS_SIZE_DIR = /^\d+x\d+$/;
	archive.directory(absolutePath, false, (data) => {
		// data.name is the relative path within the zip
		const parts = data.name.split(/[/\\]/);

		// Exclude webp/ and SIZE/ directories at any level
		if (parts.some((part) => part === 'webp' || IS_SIZE_DIR.test(part))) {
			return false;
		}

		return data;
	});

	archive.finalize();

	const folderName = folderPath.split('/').pop() || 'root';

	return new Response(stream as unknown as ReadableStream, {
		headers: {
			'Content-Type': 'application/zip',
			'Content-Disposition': `attachment; filename="${folderName}.zip"`
		}
	});
};
