<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Halyxis - AI Image Editor

A Progressive Web App (PWA) for AI-powered image editing and generation using Google's Gemini API.

## Features

- 🎨 AI-powered image editing and generation
- 📱 Progressive Web App (PWA) - installable on mobile and desktop
- 🔒 Secure API key handling (server-side only)
- ⚡ Fast and responsive UI
- 💾 Offline support via service worker

## Run Locally

**Prerequisites:** Node.js 18+ and npm

### Option 1: Full Local Development (with API routes)

For full functionality including API routes, use Vercel CLI:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install Vercel CLI (if not already installed):
   ```bash
   npm i -g vercel
   ```

3. Set up environment variables:
   - Create a `.env.local` file in the root directory
   - Add your Gemini API key:
     ```
     GEMINI_API_KEY=your_api_key_here
     ```
   - **Important:** Never commit `.env.local` to version control (it's already in `.gitignore`)

4. Run Vercel dev server (this runs both frontend and API routes):
   ```bash
   vercel dev
   ```

5. Open your browser to the URL shown in the terminal (usually `http://localhost:3000`)

### Option 2: Frontend Only (for UI development)

If you only need to work on the frontend:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open your browser to `http://localhost:3000`

   **Note:** API calls will fail in this mode unless deployed. Use Option 1 for full functionality.

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Deploy to Vercel

### Option 1: Deploy via Vercel Dashboard

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com) and sign in
3. Click "New Project"
4. Import your GitHub repository
5. Add environment variable:
   - Name: `GEMINI_API_KEY`
   - Value: Your Gemini API key
6. Click "Deploy"

### Option 2: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Set environment variable:
   ```bash
   vercel env add GEMINI_API_KEY
   ```

4. Redeploy:
   ```bash
   vercel --prod
   ```

### Important Notes for Deployment

- **API Key Security:** The Gemini API key is stored as an environment variable in Vercel and is never exposed to the client. All API calls go through the serverless function at `/api/gemini`.
- **Environment Variables:** Make sure to set `GEMINI_API_KEY` in your Vercel project settings (Settings → Environment Variables).

## Deploy to GitHub

1. Initialize git repository (if not already done):
   ```bash
   git init
   ```

2. Add all files:
   ```bash
   git add .
   ```

3. Commit:
   ```bash
   git commit -m "Initial commit"
   ```

4. Create a new repository on GitHub

5. Add remote and push:
   ```bash
   git remote add origin https://github.com/yourusername/your-repo-name.git
   git branch -M main
   git push -u origin main
   ```

## PWA Features

This app is a Progressive Web App, which means:

- **Installable:** Users can install it on their devices
- **Offline Support:** Basic functionality works offline
- **App-like Experience:** Runs in standalone mode when installed

To install:
- **Desktop:** Look for the install icon in your browser's address bar
- **Mobile:** Use "Add to Home Screen" option

## Project Structure

```
├── api/                 # Vercel serverless functions
│   └── gemini.ts       # Gemini API proxy (protects API key)
├── components/          # React components
├── services/           # Business logic services
├── utils/              # Utility functions
├── public/             # Static assets (PWA icons)
├── vercel.json         # Vercel deployment configuration
└── vite.config.ts      # Vite configuration with PWA plugin
```

## Security

- API keys are stored server-side only (in Vercel environment variables)
- Client never has access to the Gemini API key
- All API calls are proxied through `/api/gemini` serverless function

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
