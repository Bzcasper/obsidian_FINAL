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

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

export class ScraperService {
  static async scrape(url) {
    let retryCount = 0;
    const context = {
      service: 'scraper',
      operation: 'scrape',
      params: [url]
    };

    try {
      const response = await fetch(url);
      const html = await response.text();
      const $ = cheerio.load(html);

      // Extract metadata
      const metadata = await this.extractMetadata($);
      const contentType = await this.classifyContent($);
      metadata.contentType = contentType;

      // Extract main content
      const dom = new JSDOM(html);
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (!article) {
        throw new Error('Failed to extract content');
      }

      // Convert HTML to Markdown
      const markdown = turndownService.turndown(article.content);

      // Extract keywords
      const keywords = await this.extractKeywords(article.textContent);

      // Process images
      const images = await this.processImages($, url);

      return {
        title: article.title,
        content: markdown,
        metadata: {
          ...metadata,
          keywords,
          images,
          readingTime: Math.ceil(article.textContent.split(/\s+/).length / 200),
          excerpt: article.excerpt,
          length: article.textContent.length
        }
      };

    } catch (error) {
      return await ErrorHandler.handleError(error, context);
    }
  }

  static async extractMetadata($) {
    return {
      description: $('meta[name="description"]').attr('content'),
      ogTitle: $('meta[property="og:title"]').attr('content'),
      ogDescription: $('meta[property="og:description"]').attr('content'),
      ogImage: $('meta[property="og:image"]').attr('content'),
      author: $('meta[name="author"]').attr('content'),
      publishedDate: $('meta[property="article:published_time"]').attr('content'),
      modifiedDate: $('meta[property="article:modified_time"]').attr('content'),
      tags: $('meta[property="article:tag"]').map((_, el) => $(el).attr('content')).get()
    };
  }

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

  static async extractKeywords(text) {
    tfidf.addDocument(text);
    return tfidf.listTerms(0)
      .slice(0, 10)
      .map(item => item.term);
  }

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
          originalSrc: src
        });
      } catch (error) {
        console.error('Error processing image:', error);
      }
    });

    return images;
  }
}

      // Extract keywords and generate folder structure
      const keywords = await this.extractKeywords(page);
      const folderStructure = await this.generateFolderStructure(keywords, contentType);

      // Process images with advanced handling
      const { processedContent, images } = await this.processImages(
        page,
        html,
        folderStructure.path
      );

      // Use Readability with fallback strategies
      const article = await this.extractContent(page, processedContent);

      // Process and enhance content
      const result = await this.processContent(article, metadata, images, keywords);
      
      // Enhance content for affiliate marketing if needed
      if (metadata.contentType === 'affiliate_post') {
        const enhanced = await ContentEnhancer.enhance(result);
        result.content = enhanced.content;
        result.metadata = enhanced.metadata;
      }
      
      // Add additional metadata
      result.metadata.folderStructure = folderStructure;
      result.metadata.contentType = contentType;
      
      return result;

    } catch (error) {
      return await ErrorHandler.handleError(error, context);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  static async detectInfiniteScroll(page) {
    return await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      
      const getScrollHeight = () => Math.max(
        body.scrollHeight,
        body.offsetHeight,
        html.clientHeight,
        html.scrollHeight,
        html.offsetHeight
      );

      const initialHeight = getScrollHeight();
      window.scrollTo(0, initialHeight);
      
      return new Promise(resolve => {
        setTimeout(() => {
          const newHeight = getScrollHeight();
          resolve(newHeight > initialHeight);
        }, 1000);
      });
    });
  }

  static async handleInfiniteScroll(page) {
    await page.evaluate(async () => {
      await new Promise(resolve => {
        let totalHeight = 0;
        const distance = 100;
        const maxScrolls = 50; // Prevent infinite loops
        let scrollCount = 0;
        
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          scrollCount++;

          if (totalHeight >= scrollHeight || scrollCount >= maxScrolls) {
            clearInterval(timer);
            resolve();
          }
        }, 200);
      });
    });
  }

  static async loadLazyImages(page) {
    await page.evaluate(async () => {
      const imgElements = document.getElementsByTagName('img');
      
      for (const img of imgElements) {
        if (img.loading === 'lazy') {
          const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                img.src = img.dataset.src || img.src;
              }
            });
          });
          
          observer.observe(img);
        }
      }
      
      // Wait for images to load
      await Promise.all(
        Array.from(imgElements)
          .filter(img => !img.complete)
          .map(img => new Promise(resolve => {
            img.onload = img.onerror = resolve;
          }))
      );
    });
  }

  static async waitForDynamicContent(page) {
    // Wait for dynamic content markers
    const dynamicSelectors = [
      '[data-loading]',
      '[class*="loading"]',
      '[class*="spinner"]',
      '[class*="skeleton"]'
    ];

    for (const selector of dynamicSelectors) {
      try {
        await page.waitForSelector(selector, {
          state: 'hidden',
          timeout: 5000
        });
      } catch (e) {
        // Ignore timeout
      }
    }
  }

  static async generateFolderStructure(keywords, contentType) {
    // Create hierarchical folder structure based on content type and keywords
    const mainCategory = contentType.toLowerCase();
    const subCategory = keywords[0]?.toLowerCase() || 'uncategorized';
    
    const folderPath = path.join(
      mainCategory,
      subCategory,
      keywords.slice(1, 3).join('-').toLowerCase()
    );

    return {
      path: folderPath,
      category: mainCategory,
      subcategory: subCategory,
      keywords: keywords
    };
  }

  static async extractContent(page, html) {
    // Try multiple content extraction strategies
    const strategies = [
      // Strategy 1: Readability
      async () => {
        const dom = new JSDOM(html);
        const reader = new Readability(dom.window.document);
        return reader.parse();
      },
      
      // Strategy 2: Main content selectors
      async () => {
        const content = await page.evaluate(() => {
          const selectors = [
            'article',
            'main',
            '[role="main"]',
            '#content',
            '.content',
            '.post-content'
          ];

          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) return element.innerHTML;
          }
          return null;
        });

        if (content) {
          return {
            content,
            title: await page.title(),
            excerpt: content.substring(0, 200)
          };
        }
        return null;
      }
    ];

    // Try each strategy until one works
    for (const strategy of strategies) {
      try {
        const result = await strategy();
        if (result) return result;
      } catch (e) {
        console.error('Content extraction strategy failed:', e);
      }
    }

    throw new Error('Could not extract content with any available strategy');
  }

  static async processImages(page, html, folderPath) {
    const images = new Map();
    const $ = cheerio.load(html);
    
    const vaultPath = process.env.OBSIDIAN_VAULT_PATH;
    const normalizedPath = path.normalize(vaultPath);
    const imagesDir = path.join(normalizedPath, folderPath, 'images');
    await fs.mkdir(imagesDir, { recursive: true });

    // Process each image with enhanced handling
    const imageElements = $('img').toArray();
    for (const img of imageElements) {
      const src = $(img).attr('src') || $(img).attr('data-src');
      if (!src) continue;

      try {
        // Generate unique filename
        const hash = crypto.createHash('md5').update(src).digest('hex');
        
        // Handle base64 images
        if (src.startsWith('data:image')) {
          const matches = src.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
          if (matches) {
            const buffer = Buffer.from(matches[2], 'base64');
            const filename = `${hash}.${matches[1]}`;
            const imagePath = path.join(imagesDir, filename);
            await fs.writeFile(imagePath, buffer);
            images.set(src, path.join('images', filename));
            continue;
          }
        }

        // Handle relative URLs
        const absoluteUrl = new URL(src, page.url()).href;
        const response = await fetch(absoluteUrl);
        const buffer = await response.arrayBuffer();
        
        // Determine file extension from Content-Type header
        const contentType = response.headers.get('content-type');
        const ext = contentType?.split('/')[1] || 'jpg';

        const filename = `${hash}.${ext}`;
        const imagePath = path.join(imagesDir, filename);
        
        await fs.writeFile(imagePath, Buffer.from(buffer));
        
        const relativePath = path.join('images', filename);
        images.set(src, relativePath);
        
        // Update image src in HTML
        $(img).attr('src', relativePath);

        // Extract and store image metadata
        const alt = $(img).attr('alt') || '';
        const title = $(img).attr('title') || '';
        const dimensions = await this.getImageDimensions(buffer);
        
        images.set(`${src}_metadata`, {
          alt,
          title,
          dimensions,
          originalSrc: src,
          localPath: relativePath
        });

      } catch (error) {
        await ErrorHandler.handleError(error, {
          service: 'scraper',
          operation: 'processImage',
          params: [src],
          context: { folderPath }
        });
      }
    }

    return {
      processedContent: $.html(),
      images: Array.from(images.entries())
        .filter(([key]) => !key.endsWith('_metadata'))
        .map(([src]) => images.get(`${src}_metadata`))
    };
  }

  static async getImageDimensions(buffer) {
    try {
      const { width, height } = await imageSize(buffer);
      return { width, height };
    } catch (e) {
      return null;
    }
  }

  // Existing methods like extractKeywords, processContent, extractMetadata remain the same
}