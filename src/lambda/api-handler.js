import serverless from 'serverless-http';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { router } from '../routes/index.js';

const app = express();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware
app.use(cors());
app.use(express.json());

// Add request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.version,
    env: process.env.NODE_ENV,
    region: process.env.AWS_REGION
  });
});

// Use API routes
app.use('/api', router);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
    requestId: req.requestContext?.requestId
  });
});

// Export the serverless handler
export const handler = serverless(app, {
  binary: ['application/octet-stream'],
  provider: 'aws'
});