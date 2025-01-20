# Content Automation API Usage Guide

## Getting Started

1. **Installation**
```bash
npm install
```

2. **Environment Setup**
Copy `.env.example` to `.env` and configure:
```bash
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-anon-key
```

3. **Start Development Server**
```bash
npm run dev
```

## Basic Usage

### Content Scraping

```javascript
const response = await fetch('/api/scrape', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com/article',
    type: 'blog_post',
    tags: ['tech', 'tutorial']
  })
});
```

### Content Management

1. **Create Content**
```javascript
const response = await fetch('/api/content', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'My Article',
    content: 'Article content...',
    type: 'blog_post',
    tags: ['tech']
  })
});
```

2. **Retrieve Content**
```javascript
// Get all content
const content = await fetch('/api/content');

// Filter by type
const blogPosts = await fetch('/api/content?type=blog_post');

// Get by URL
const article = await fetch('/api/content/url/https%3A%2F%2Fexample.com%2Farticle');
```

### Template Management

1. **Create Template**
```javascript
const response = await fetch('/api/templates', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'blog-post',
    content: '# {{title}}\n\n{{content}}'
  })
});
```

2. **List Templates**
```javascript
const templates = await fetch('/api/templates');
```

### Event Logging

```javascript
const response = await fetch('/api/logs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event: 'content_created',
    details: { contentId: '123', type: 'blog_post' }
  })
});
```

## Deployment

1. **Build for Production**
```bash
npm run build
```

2. **Deploy to AWS Lambda**
```bash
npm run deploy
```

## Error Handling

The API uses standardized error responses:

```javascript
{
  "error": "Error type",
  "message": "Detailed error message",
  "details": ["Additional error details"]
}
```

## Rate Limiting

- Default: 100 requests per minute
- Configure in `.env`: `API_RATE_LIMIT=100`