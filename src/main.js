// Load environment variables before any imports
import dotenv from 'dotenv';
dotenv.config();

// Ensure environment variables are loaded
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { ScraperService } from './services/scraper.js';
import { FileService } from './services/file-service.js';
import { TemplateService } from './services/template-service.js';
import { TrendsService } from './services/trends-service.js';
import { ObsidianAutomationService } from './services/obsidian-automation-service.js';

// Validate Obsidian vault path on startup
FileService.validateVaultPath()
  .then(() => console.log('Obsidian vault path validated'))
  .catch(error => console.error('Warning:', error.message));

const app = express();
const port = process.env.PORT || 3000;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware
app.use(cors());
app.use(express.json());

// Initialize routes
app.get('/', (req, res) => {
  const healthData = {
    message: 'Content Automation API',
    version: '1.0.0',
    endpoints: [
      '/health',
      '/api/content',
      '/api/scrape',
      '/api/templates',
      '/api/logs',
      '/api/trends'
    ]
  };
  
  // Ensure proper JSON response
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(healthData));
});

// Template management endpoints
app.get('/api/templates/available', async (req, res) => {
  try {
    const templates = await TemplateService.getAvailableTemplates();
    res.json(templates);
  } catch (error) {
    console.error('Error getting available templates:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/templates', async (req, res) => {
  try {
    const { name, content } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        error: 'Invalid input',
        details: ['Template name is required and must be a string']
      });
    }

    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        error: 'Invalid input',
        details: ['Template content is required and must be a string']
      });
    }

    const templatePath = await FileService.saveTemplate(name, content);
    
    // Log template creation
    await logEvent('template_created', {
      name,
      path: templatePath
    });

    res.json({ 
      message: 'Template saved successfully',
      name,
      path: templatePath
    });
  } catch (error) {
    console.error('Error saving template:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/templates', async (req, res) => {
  try {
    const templates = await FileService.listTemplates();
    res.json(templates);
  } catch (error) {
    console.error('Error listing templates:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  const healthData = {
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version
  };
  
  // Ensure proper JSON response
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(healthData));
});

// Create content endpoint
app.post('/api/content', async (req, res) => {
  try {
    const { title, content, type, metadata = {}, source_url, tags = [] } = req.body;

    // Validate inputs
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid input',
        details: ['Title is required and must be a string']
      });
    }

    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        error: 'Invalid input',
        details: ['Content is required and must be a string']
      });
    }

    if (!Array.isArray(tags)) {
      return res.status(400).json({
        error: 'Invalid input',
        details: ['Tags must be an array']
      });
    }

    if (source_url) {
      try {
        new URL(source_url);
      } catch (e) {
        return res.status(400).json({
          error: 'Invalid input',
          details: ['Invalid URL format']
        });
      }
    }

    const { data, error } = await supabase
      .from('content')
      .insert([{
        title,
        content,
        type,
        metadata,
        source_url,
        status: 'draft'
      }])
      .select();

    if (error) throw error;

    // Log content creation
    await logEvent('content_created', {
      content_id: data[0].id,
      type,
      title
    }, data[0].user_id);

    res.json(data[0]);
  } catch (error) {
    console.error('Error creating content:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get content endpoint
app.get('/api/content', async (req, res) => {
  try {
    const { type, status } = req.query;
    let query = supabase.from('content').select('*');

    if (type) query = query.eq('type', type);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching content:', error);
    res.status(500).json({ error: error.message });
  }
});

// Scrape content endpoint
app.post('/api/scrape', async (req, res) => {
  let url;
  let scrapedData;
  let savedContent;

  try {
    const { url: requestUrl, type = 'blog_post', metadata = {}, tags = [], template } = req.body;
    url = requestUrl;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate template
    const templates = await TemplateService.getAvailableTemplates();
    const validTemplate = templates.find(t => t.id === template);
    if (template && !validTemplate) {
      return res.status(400).json({ 
        error: 'Invalid template',
        validTemplates: templates.map(t => t.id)
      });
    }

    if (!Array.isArray(tags)) {
      return res.status(400).json({
        error: 'Invalid input',
        details: ['Tags must be an array']
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Log scraping start
    await logEvent('scrape_started', { url, type }, 'system');

    // Scrape content
    scrapedData = await ScraperService.scrape(url);

    // Save to Supabase
    const { data, error: dbError } = await supabase
      .from('content')
      .insert([{
        title: scrapedData.title,
        content: scrapedData.content,
        type,
        metadata: {
          ...metadata,
          ...scrapedData.metadata,
          tags: [...new Set([...(metadata.tags || []), ...tags])],
          scrapeTimestamp: new Date().toISOString()
        },
        source_url: url,
        status: 'draft'
      }])
      .select();

    if (dbError) {
      throw new Error('Failed to save content to database');
    }
    
    savedContent = data[0];

    try {
      // Save as Markdown file
      const markdownContent = await TemplateService.applyTemplate(
        template || 'blog-post',
        savedContent
      );
      const markdownPath = await TemplateService.saveToObsidian(
        markdownContent,
        savedContent.metadata.keywords?.[0] || 'uncategorized'
      );

      // Update content record with markdown path
      await supabase
        .from('content')
        .update({ 
          metadata: { 
            ...savedContent.metadata,
            markdownPath 
          }
        })
        .eq('id', savedContent.id);

      // Log scraping event
      await logEvent('content_scraped', {
        content_id: savedContent.id,
        url,
        type
      }, savedContent.user_id);

      return res.json(savedContent);
    } catch (markdownError) {
      console.error('Error saving markdown:', markdownError);
      // Still return success since content was saved to database
      return res.json({
        ...savedContent,
        warning: 'Content saved but markdown generation failed'
      });
    }
  } catch (error) {
    // Log scraping error
    await logEvent('scrape_error', {
      url,
      scrapedTitle: scrapedData?.title,
      error: error.message
    }, 'system');

    console.error('Error initiating scrape:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Helper function to log events
async function logEvent(event, details, user_id) {
  try {
    await supabase
      .from('logs')
      .insert([{
        event,
        details,
        user_id
      }]);
  } catch (error) {
    console.error('Error logging event:', error);
  }
}

// Get logs endpoint
app.get('/api/logs', async (req, res) => {
  try {
    const { event, start_date, end_date } = req.query;
    let query = supabase.from('logs').select('*');

    if (event) query = query.eq('event', event);
    if (start_date) query = query.gte('created_at', start_date);
    if (end_date) query = query.lte('created_at', end_date);

    const { data, error } = await query;
    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create log endpoint
app.post('/api/logs', async (req, res) => {
  try {
    const { event, details = {} } = req.body;
    const { data, error } = await supabase
      .from('logs')
      .insert([{
        event,
        details
      }])
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    console.error('Error creating log:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get content by URL endpoint
app.get('/api/content/url/:url(*)', async (req, res) => {
  try {
    const url = decodeURIComponent(req.params.url);

    const { data, error } = await supabase
      .from('content')
      .select('*')
      .eq('source_url', url)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return res.status(404).json({ 
        error: 'Content not found',
        message: 'No content found for the provided URL'
      });
    }

    return res.json(data);
  } catch (error) {
    console.error('Error fetching content by URL:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Content Automation API running at http://0.0.0.0:${port}`);
  console.log('Available endpoints:');
  console.log('  - GET  /health');
  console.log('  - POST /api/content');
  console.log('  - GET  /api/content');
  console.log('  - POST /api/scrape');
  console.log('  - GET  /api/templates');
  console.log('  - POST /api/logs');
  console.log('  - GET  /api/logs');
  console.log('  - GET  /api/trends');
});