# Development Guide

## Local Development Setup

### Running the Development Server

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   Create a `.env.local` file with:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

### Testing API Routes Locally

For local development, you have two options:

#### Option 1: Use Vercel CLI (Recommended)

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Run Vercel dev server:
   ```bash
   vercel dev
   ```

   This will start both the Vite dev server and the API routes.

#### Option 2: Deploy to Vercel Preview

Deploy to a Vercel preview environment for testing API routes.

### Important Notes

- **API Key Security:** The API key is stored in `.env.local` and should NEVER be committed to git.
- **API Routes:** The `/api/gemini` route only works when deployed to Vercel or when using `vercel dev`.
- **Client-Side:** The client never has access to the API key - all calls go through the serverless function.

## Building for Production

```bash
npm run build
```

The output will be in the `dist/` directory.

## PWA Icons

Before deploying, make sure to add PWA icons:
- `public/pwa-192x192.png` (192x192 pixels)
- `public/pwa-512x512.png` (512x512 pixels)

See `scripts/generate-icons.md` for instructions on generating these icons.
