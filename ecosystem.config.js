module.exports = {
  apps: [
    {
      name: 'asset-server',
      script: 'build/index.js',
      interpreter: 'bun',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      }
    }
  ]
};
