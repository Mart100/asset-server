# Asset Server

A lightweight, filesystem-based image manager for SvelteKit.

## Setup

1. Install dependencies: `bun install`
2. Configure `.env`:
   - `ADMIN_PASSWORD`: For logging into the manager.
   - `STORAGE_ROOT`: Absolute or relative path to where images are stored.
   - `PUBLIC_ASSETS_BASE_URL`: The public URL where Nginx serves the images (e.g., `https://assets.example.com`).
3. Run: `bun run dev`

## VPS Deployment & Nginx

Nginx should be configured to serve the `STORAGE_ROOT` folder directly.

Example Nginx config:

```nginx
server {
    server_name assets.example.com;
    root /path/to/your/storage;

    location / {
        try_files $uri =404;
        add_header Cache-Control "public, max-age=31536000";
    }
}
```

The SvelteKit app itself is just the management interface and does not serve the image files.
