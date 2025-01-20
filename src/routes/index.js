import express from 'express';
import { WebClipperService } from '../services/web-clipper-service.js';
import { ScraperService } from '../services/scraper.js';
import { TemplateService } from '../services/template-service.js';
import { TrendsService } from '../services/trends-service.js';

const router = express.Router();

// Web Clipper routes
router.post('/clip', async (req, res) => {
  try {
    const result = await WebClipperService.handleClip(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Scraper routes
router.post('/scrape', async (req, res) => {
  try {
    const { url, template, tags } = req.body;
    const result = await ScraperService.scrape(url);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Template routes
router.get('/templates', async (req, res) => {
  try {
    const templates = await TemplateService.getAvailableTemplates();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trends routes
router.get('/trends', async (req, res) => {
  try {
    const { geo, category } = req.query;
    const trends = await TrendsService.getTrends(geo, category);
    res.json(trends);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export { router };