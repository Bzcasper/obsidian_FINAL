import * as cheerio from 'cheerio';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import sanitizeHtml from 'sanitize-html';
import { JSDOM } from 'jsdom';
import natural from 'natural';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import fetch from 'node-fetch';
import slugify from 'slugify';
import { CaptchaSolver } from './captcha-solver.js';
import { ContentClassifier } from './content-classifier.js';
import { ContentEnhancer } from './content-enhancer.js';
import { ErrorHandler } from './error-handler.js';

const tokenizer = new natural.WordTokenizer();
const tfidf = new natural.TfIdf();
const turndownService = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });

export class ScraperService {
  /**
   * Main entry point for scraping a URL.
   * @param {string} url - The URL to scrape.
   * @returns {Promise<object>} - Scraped data including content, metadata, and images.
   */
  static async scrape(url) {
    const context = { service: 'scraper', operation: 'scrape', params: [url] };
    try {
      const response = await fetch(url);
      const html = await response.text();
      const $ = cheerio.load(html);

      // Extract metadata and classify content
      const metadata = await this.extractMetadata($);
      metadata.contentType = await this.classifyContent($);

      // Extract main content
      const article = await this.extractContent(html);
      if (!article) throw new Error('Failed to extract content');

      // Convert content to Markdown
      const markdown = turndownService.turndown(article.content);

      // Extract keywords and images
      const keywords = await this.extractKeywords(article.textContent);
      const images = await this.processImages($, url);

      return {
        title: article.title,
        content: markdown,
        metadata: {
          ...metadata,
          keywords,
          images,
          readingTime: this.calculateReadingTime(article.textContent),
          excerpt: article.excerpt,
          length: article.textContent.length,
        },
      };
    } catch (error) {
      return await ErrorHandler.handleError(error, context);
    }
  }

  /**
   * Extract metadata from the HTML using Cheerio.
   */
  static async extractMetadata($) {
    return {
      description: $('meta[name="description"]').attr('content'),
      ogTitle: $('meta[property="og:title"]').attr('content'),
      ogDescription: $('meta[property="og:description"]').attr('content'),
      ogImage: $('meta[property="og:image"]').attr('content'),
      author: $('meta[name="author"]').attr('content'),
      publishedDate: $('meta[property="article:published_time"]').attr('content'),
      modifiedDate: $('meta[property="article:modified_time"]').attr('content'),
      tags: $('meta[property="article:tag"]').map((_, el) => $(el).attr('content')).get(),
    };
  }

  /**
   * Classify the content type based on the text and structure.
   */
  static async classifyContent($) {
    const text = $('body').text();
    const hasCode = $('pre code').length > 0;
    const hasTutorialMarkers = /how\s+to|tutorial|guide|step\s+\d/i.test(text);
    const hasResearchMarkers = /abstract|methodology|conclusion|references/i.test(text);

    if (hasCode) return 'code_snippet';
    if (hasTutorialMarkers) return 'tutorial';
    if (hasResearchMarkers) return 'research_note';
    return 'blog_post';
  }

  /**
   * Extract main content using Readability.
   */
  static async extractContent(html) {
    const dom = new JSDOM(html);
    const reader = new Readability(dom.window.document);
    return reader.parse();
  }

  /**
   * Extract top keywords from the content using TF-IDF.
   */
  static async extractKeywords(text) {
    tfidf.addDocument(text);
    return tfidf.listTerms(0).slice(0, 10).map(item => item.term);
  }

  /**
   * Process images from the page, downloading and storing them locally.
   */
  static async processImages($, baseUrl) {
    const images = [];
    $('img').each((_, img) => {
      const $img = $(img);
      const src = $img.attr('src') || $img.attr('data-src');
      if (!src) return;

      try {
        const absoluteUrl = new URL(src, baseUrl).href;
        images.push({
          url: absoluteUrl,
          alt: $img.attr('alt') || '',
          title: $img.attr('title') || '',
          originalSrc: src,
        });
      } catch (error) {
        console.error('Error processing image:', error);
      }
    });
    return images;
  }

  /**
   * Calculate estimated reading time for the content.
   */
  static calculateReadingTime(text) {
    const wordsPerMinute = 200; // Average reading speed
    const wordCount = text.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }
}
