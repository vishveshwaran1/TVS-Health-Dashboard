# Netlify Deployment Guide

## Files Created for Netlify Deployment

1. **netlify.toml** - Main configuration file
2. **public/_redirects** - Handles SPA routing
3. **public/_headers** - Sets proper MIME types

## Deployment Steps

### Option 1: Deploy via Netlify UI
1. Go to [netlify.com](https://netlify.com)
2. Click "New site from Git"
3. Connect your repository
4. Set build command: `npm run build`
5. Set publish directory: `dist`
6. Deploy

### Option 2: Deploy via Netlify CLI
1. Install Netlify CLI: `npm install -g netlify-cli`
2. Build your project: `npm run build`
3. Deploy: `netlify deploy --prod --dir=dist`

## Troubleshooting

### MIME Type Error
If you still get the MIME type error:

1. **Clear Netlify cache**: Go to Site settings > Build & deploy > Clear cache and deploy site
2. **Check build logs**: Ensure the build completes successfully
3. **Verify file structure**: Make sure the `dist` folder contains:
   - `index.html`
   - `assets/` folder with JS and CSS files

### Alternative Solution
If the issue persists, try adding this to your `vite.config.ts`:

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        format: 'es',
        entryFileNames: '[name].[hash].js',
        chunkFileNames: '[name].[hash].js',
        assetFileNames: '[name].[hash].[ext]'
      }
    }
  }
})
```

### Manual Fix
If Netlify still serves files with wrong MIME types:
1. Go to Site settings > Build & deploy > Post processing
2. Add custom headers for `.js` files:
   ```
   Content-Type: application/javascript
   ```

## Environment Variables
If you need environment variables, add them in Netlify:
1. Go to Site settings > Environment variables
2. Add any required variables

## Custom Domain
To add a custom domain:
1. Go to Site settings > Domain management
2. Add your custom domain
3. Configure DNS settings as instructed 