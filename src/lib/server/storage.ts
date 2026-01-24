import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { env } from '$env/dynamic/private';

import crypto from 'node:crypto';

const STORAGE_ROOT = path.resolve(env.STORAGE_ROOT || './storage');

function validatePath(folderPath: string) {
	const absolutePath = path.resolve(STORAGE_ROOT, folderPath);
	const relative = path.relative(STORAGE_ROOT, absolutePath);
	if (relative.startsWith('..') || path.isAbsolute(relative)) {
		throw new Error('Invalid path: escape attempt detected');
	}
	return absolutePath;
}

function slugify(text: string) {
	return text
		.toString()
		.toLowerCase()
		.normalize('NFD')
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^\w-]/g, '')
		.replace(/-+/g, '-');
}

function getHash(buffer: Buffer) {
	return crypto.createHash('md5').update(buffer).digest('hex').slice(0, 8);
}

const IS_SIZE_DIR = /^\d+x\d+$/;
const INTERNAL_DIRS = ['originals', 'webp'];

function isInternalDir(name: string) {
	return INTERNAL_DIRS.includes(name) || IS_SIZE_DIR.test(name);
}

function checkInternalPath(folderPath: string) {
	const parts = folderPath.split(/[/\\]/);
	if (parts.some((part) => isInternalDir(part))) {
		throw new Error('Cannot use internal directory names (originals, webp, or SIZE)');
	}
}

export interface AssetMetadata {
	title?: string;
	order: string[]; // List of filenames in order
	sizes?: string[]; // e.g. ["400x300", "800x600"]
}

export interface FolderNode {
	name: string;
	path: string;
	children: FolderNode[];
}

export async function ensureStorageRoot() {
	try {
		await fs.mkdir(STORAGE_ROOT, { recursive: true });
	} catch {
		// Ignore if exists
	}
}

export async function getFolderTree(currentPath = ''): Promise<FolderNode[]> {
	const absolutePath = validatePath(currentPath);
	const entries = await fs.readdir(absolutePath, { withFileTypes: true });

	const folders: FolderNode[] = [];

	for (const entry of entries) {
		if (entry.isDirectory() && !isInternalDir(entry.name)) {
			const relativePath = path.join(currentPath, entry.name);
			folders.push({
				name: entry.name,
				path: relativePath.replace(/\\/g, '/'),
				children: await getFolderTree(relativePath)
			});
		}
	}

	return folders;
}

export async function getFolderContent(folderPath: string) {
	const absolutePath = validatePath(folderPath);
	const entries = await fs.readdir(absolutePath, { withFileTypes: true });

	let metadata: AssetMetadata = { order: [], sizes: [] };
	try {
		const metaContent = await fs.readFile(path.join(absolutePath, 'index.json'), 'utf-8');
		metadata = JSON.parse(metaContent);
	} catch {
		// No metadata yet
	}

	const webpPath = path.join(absolutePath, 'webp');
	let images: string[] = [];
	try {
		const webpEntries = await fs.readdir(webpPath, { withFileTypes: true });
		images = webpEntries
			.filter((entry) => entry.isFile() && /\.(webp)$/i.test(entry.name))
			.map((entry) => entry.name);
	} catch {
		// webp folder might not exist yet
	}

	// Sync metadata order with actual files
	const existingImages = new Set(images);
	metadata.order = (metadata.order || []).filter((name) => existingImages.has(name));

	const unorderedImages = images.filter((name) => !metadata.order.includes(name));
	metadata.order = [...metadata.order, ...unorderedImages];

	const subfolders = entries
		.filter((entry) => entry.isDirectory() && !isInternalDir(entry.name))
		.map((entry) => entry.name);

	return {
		images: metadata.order,
		sizes: metadata.sizes || [],
		subfolders,
		path: folderPath
	};
}

export async function processAndSaveImage(folderPath: string, file: File) {
	const absoluteFolder = validatePath(folderPath);
	await fs.mkdir(absoluteFolder, { recursive: true });

	const buffer = Buffer.from(await file.arrayBuffer());
	const hash = getHash(buffer);
	const originalBase = path.parse(file.name).name;
	const slug = slugify(originalBase);

	const basename = `${slug}-${hash}`;
	const ext = path.extname(file.name) || '.jpg';
	const originalFilename = `${basename}${ext}`;
	const webpFilename = `${basename}.webp`;

	// Save original
	const originalsDir = path.join(absoluteFolder, 'originals');
	await fs.mkdir(originalsDir, { recursive: true });
	await fs.writeFile(path.join(originalsDir, originalFilename), buffer);

	// Save main optimized WebP (the one shown in UI)
	const webpDir = path.join(absoluteFolder, 'webp');
	await fs.mkdir(webpDir, { recursive: true });
	await sharp(buffer)
		.resize({ width: 2000, withoutEnlargement: true })
		.webp({ quality: 85 })
		.toFile(path.join(webpDir, webpFilename));

	// Update metadata and trigger derivatives
	await updateMetadata(folderPath, async (meta) => {
		meta.order = meta.order || [];
		meta.order.push(webpFilename);

		// Generate derivatives for existing sizes
		if (meta.sizes) {
			for (const size of meta.sizes) {
				await generateDerivative(folderPath, webpFilename, buffer, size);
			}
		}
	});

	return webpFilename;
}

export async function renameImage(folderPath: string, oldFilename: string, newNamePart: string) {
	const absoluteFolder = validatePath(folderPath);
	const slug = slugify(newNamePart);

	// Format: [name]-[hash].webp
	const hash = oldFilename.split('-').pop()?.split('.')[0] || '';
	const newBasename = hash ? `${slug}-${hash}` : slug;
	const newWebpFilename = `${newBasename}.webp`;

	if (oldFilename === newWebpFilename) return;

	// 1. Rename main webp
	const webpDir = path.join(absoluteFolder, 'webp');
	await fs.rename(path.join(webpDir, oldFilename), path.join(webpDir, newWebpFilename));

	// 2. Rename original
	try {
		const originalsDir = path.join(absoluteFolder, 'originals');
		const files = await fs.readdir(originalsDir);
		const oldBasename = oldFilename.split('.')[0];
		const originalFile = files.find((f) => f.startsWith(oldBasename));
		if (originalFile) {
			const ext = path.extname(originalFile);
			await fs.rename(
				path.join(originalsDir, originalFile),
				path.join(originalsDir, `${newBasename}${ext}`)
			);
		}
	} catch {
		// No original found
	}

	// 3. Rename derivatives
	let sizes: string[] = [];
	await updateMetadata(folderPath, (meta) => {
		meta.order = (meta.order || []).map((f) => (f === oldFilename ? newWebpFilename : f));
		sizes = meta.sizes || [];
	});

	for (const size of sizes) {
		try {
			const sizeDir = path.join(absoluteFolder, size);
			await fs.rename(path.join(sizeDir, oldFilename), path.join(sizeDir, newWebpFilename));
		} catch {
			// Size derivative might not exist
		}
	}

	return newWebpFilename;
}

export async function moveImage(oldFolderPath: string, filename: string, newFolderPath: string) {
	if (oldFolderPath === newFolderPath) return;
	checkInternalPath(newFolderPath);

	const absoluteOldFolder = validatePath(oldFolderPath);
	const absoluteNewFolder = validatePath(newFolderPath);
	await fs.mkdir(absoluteNewFolder, { recursive: true });

	// 1. Move main webp
	const oldWebpDir = path.join(absoluteOldFolder, 'webp');
	const newWebpDir = path.join(absoluteNewFolder, 'webp');
	await fs.mkdir(newWebpDir, { recursive: true });
	await fs.rename(path.join(oldWebpDir, filename), path.join(newWebpDir, filename));

	// 2. Move original
	try {
		const oldOriginalsDir = path.join(absoluteOldFolder, 'originals');
		const newOriginalsDir = path.join(absoluteNewFolder, 'originals');
		await fs.mkdir(newOriginalsDir, { recursive: true });

		const files = await fs.readdir(oldOriginalsDir);
		const basename = filename.split('.')[0];
		const originalFile = files.find((f) => f.startsWith(basename));
		if (originalFile) {
			await fs.rename(
				path.join(oldOriginalsDir, originalFile),
				path.join(newOriginalsDir, originalFile)
			);
		}
	} catch {
		// Originals folder might not exist
	}

	// 3. Move derivatives
	let oldSizes: string[] = [];
	await updateMetadata(oldFolderPath, (meta) => {
		meta.order = (meta.order || []).filter((f) => f !== filename);
		oldSizes = meta.sizes || [];
	});

	await updateMetadata(newFolderPath, async (meta) => {
		meta.order = [...(meta.order || []), filename];
		const newSizes = meta.sizes || [];

		// Handle derivatives
		for (const size of oldSizes) {
			const oldSizeDir = path.join(absoluteOldFolder, size);
			const newSizeDir = path.join(absoluteNewFolder, size);
			try {
				if (newSizes.includes(size)) {
					await fs.mkdir(newSizeDir, { recursive: true });
					await fs.rename(path.join(oldSizeDir, filename), path.join(newSizeDir, filename));
				} else {
					// Size doesn't exist in target, just delete the old derivative
					await fs.unlink(path.join(oldSizeDir, filename));
				}
			} catch {
				// Derivative might not exist
			}
		}
	});
}

async function generateDerivative(
	folderPath: string,
	filename: string,
	buffer: Buffer,
	size: string
) {
	const [width, height] = size.split('x').map(Number);
	const targetDir = path.join(validatePath(folderPath), size);
	await fs.mkdir(targetDir, { recursive: true });

	await sharp(buffer)
		.resize(width, height, { fit: 'cover' })
		.webp({ quality: 80 })
		.toFile(path.join(targetDir, filename));
}

export async function addSizeToFolder(folderPath: string, size: string) {
	// Validate size format WIDTHxHEIGHT
	if (!IS_SIZE_DIR.test(size)) return;

	await updateMetadata(folderPath, async (meta) => {
		meta.sizes = meta.sizes || [];
		if (meta.sizes.includes(size)) return;
		meta.sizes.push(size);

		// Process all existing images for this new size using originals for best quality
		const absoluteFolder = validatePath(folderPath);
		const originalsDir = path.join(absoluteFolder, 'originals');

		try {
			const originalFiles = await fs.readdir(originalsDir);

			for (const filename of meta.order) {
				const basename = filename.split('.')[0];
				const originalFile = originalFiles.find((f) => f.startsWith(basename));

				if (originalFile) {
					const imgBuffer = await fs.readFile(path.join(originalsDir, originalFile));
					await generateDerivative(folderPath, filename, imgBuffer, size);
				}
			}
		} catch {
			// No originals folder or error
		}
	});
}

export async function removeSizeFromFolder(folderPath: string, size: string) {
	await updateMetadata(folderPath, (meta) => {
		meta.sizes = (meta.sizes || []).filter((s) => s !== size);
	});
	// Optionally delete the folder, but keeping it is safer/easier
	const sizeDir = path.join(validatePath(folderPath), size);
	try {
		await fs.rm(sizeDir, { recursive: true, force: true });
	} catch {
		// Folder doesn't exist
	}
}

export async function deleteImage(folderPath: string, filename: string) {
	const absoluteFolder = validatePath(folderPath);

	// Delete main webp
	try {
		await fs.unlink(path.join(absoluteFolder, 'webp', filename));
	} catch {
		// Already deleted
	}

	// Delete original
	try {
		const originalsDir = path.join(absoluteFolder, 'originals');
		const files = await fs.readdir(originalsDir);
		const basename = filename.split('.')[0];
		const originalFile = files.find((f) => f.startsWith(basename));
		if (originalFile) {
			await fs.unlink(path.join(originalsDir, originalFile));
		}
	} catch {
		// Originals folder might not exist
	}

	// Delete derivatives
	await updateMetadata(folderPath, async (meta) => {
		meta.order = (meta.order || []).filter((name) => name !== filename);

		if (meta.sizes) {
			for (const size of meta.sizes) {
				try {
					await fs.unlink(path.join(absoluteFolder, size, filename));
				} catch {
					// Derivative doesn't exist
				}
			}
		}
	});
}

export async function updateMetadata(
	folderPath: string,
	updater: (meta: AssetMetadata) => void | Promise<void>
) {
	const absoluteFolder = validatePath(folderPath);
	const metaPath = path.join(absoluteFolder, 'index.json');

	let metadata: AssetMetadata = { order: [] };
	try {
		const content = await fs.readFile(metaPath, 'utf-8');
		metadata = JSON.parse(content);
	} catch {
		// Ignore if file doesn't exist
	}

	await updater(metadata);

	await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2));
}

export async function createFolder(parentPath: string, name: string) {
	checkInternalPath(name);
	const absolutePath = path.join(validatePath(parentPath), name);
	await fs.mkdir(absolutePath, { recursive: true });
}

export async function deleteFolder(folderPath: string) {
	const absolutePath = validatePath(folderPath);
	await fs.rm(absolutePath, { recursive: true, force: true });
}

export async function renameFolder(oldPath: string, newName: string) {
	checkInternalPath(newName);
	const absoluteOldPath = validatePath(oldPath);
	const parentDir = path.dirname(absoluteOldPath);
	const absoluteNewPath = path.join(parentDir, newName);
	await fs.rename(absoluteOldPath, absoluteNewPath);
}

export async function moveFolder(oldPath: string, newParentPath: string) {
	checkInternalPath(newParentPath);
	const absoluteOldPath = validatePath(oldPath);
	const folderName = path.basename(absoluteOldPath);
	const absoluteNewParent = validatePath(newParentPath);
	const absoluteNewPath = path.join(absoluteNewParent, folderName);

	if (absoluteOldPath === absoluteNewPath) return;

	// Prevent moving a folder into itself
	if (
		absoluteNewPath.startsWith(absoluteOldPath + path.sep) ||
		absoluteOldPath === absoluteNewPath
	) {
		throw new Error('Cannot move a folder into itself or its subfolder');
	}

	try {
		await fs.access(absoluteNewPath);
		throw new Error('A folder with this name already exists in the target location');
	} catch (e: unknown) {
		// Narrow unknown error to check errno code safely without using `any`
		if (typeof e === 'object' && e !== null && 'code' in e) {
			const errWithCode = e as { code?: string };
			if (errWithCode.code !== 'ENOENT') throw e;
		} else {
			throw e;
		}
	}

	await fs.mkdir(absoluteNewParent, { recursive: true });
	await fs.rename(absoluteOldPath, absoluteNewPath);
}
