import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import gamesRouter from './routes/games';

dotenv.config();

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/games', gamesRouter);

// Serve Angular static files in production
const staticPath = path.resolve(__dirname, '../../frontend/dist/frontend/browser');
if (fs.existsSync(staticPath)) {
  app.use(express.static(staticPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

export default app;
