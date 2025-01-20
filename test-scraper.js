import { ScraperService } from './src/services/scraper.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testScraper() {
  try {
    console.log('Starting scraper test...\n');

    // Test URL - using a reliable test site
    const url = 'https://example.com';
    
    console.log(`Scraping URL: ${url}`);
    console.log('Please wait, this may take a few seconds...\n');

    const result = await ScraperService.scrape(url);

    console.log('Scraping successful!\n');
    console.log('Results:');
    console.log('-'.repeat(50));
    console.log('Title:', result.title);
    console.log('Content Type:', result.metadata.contentType);
    console.log('Content Length:', result.content.length, 'characters');
    console.log('\nMetadata:');
    console.log(JSON.stringify(result.metadata, null, 2));
    
    if (result.metadata.images?.length > 0) {
      console.log('\nImages found:', result.metadata.images.length);
      result.metadata.images.forEach((img, i) => {
        console.log(`\nImage ${i + 1}:`);
        console.log('- Path:', img.localPath);
        console.log('- Alt:', img.alt);
        console.log('- Original:', img.originalSrc);
      });
    }

    console.log('\nContent Preview:');
    console.log('-'.repeat(50));
    console.log(result.content.substring(0, 500) + '...');
    
  } catch (error) {
    console.error('Error during scraping:', error);
    process.exit(1);
  }
}

testScraper();