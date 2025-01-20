# Markdown Reference Guide

## Template Variables

### Basic Variables
```markdown
# {{title}}
**Author:** {{author}}
**Date:** {{date}}
**Tags:** {{tags}}
```

### Metadata Variables
```markdown
## Metadata
```json
{{metadata}}
```
```

### Conditional Blocks
```markdown
{{#if featured}}
> Featured Article
{{/if}}

{{#unless draft}}
*Published*
{{/unless}}
```

### Loops
```markdown
## Related Articles
{{#each relatedArticles}}
- [{{this.title}}]({{this.url}})
{{/each}}
```

## Template Types

### 1. Blog Post Template
```markdown
# {{title}}

**Published:** {{date}}
**Author:** {{author}}
**Tags:** {{tags}}

{{content}}

## Related Posts
{{#each relatedPosts}}
- [{{this.title}}]({{this.url}})
{{/each}}
```

### 2. Research Note Template
```markdown
# {{title}}

> [!info]
> **Source:** {{source}}
> **Date:** {{date}}
> **Topics:** {{topics}}

## Key Points
{{keyPoints}}

## Notes
{{content}}

## References
{{#each references}}
- {{this.citation}}
{{/each}}
```

### 3. Code Snippet Template
```markdown
# {{title}}

```{{language}}
{{code}}
```

## Usage
{{usage}}

## Notes
{{notes}}
```

### 4. Tutorial Template
```markdown
# {{title}}

## Prerequisites
{{prerequisites}}

## Steps
{{#each steps}}
### {{this.title}}
{{this.content}}
{{/each}}

## Conclusion
{{conclusion}}
```

## Formatting Guidelines

### 1. Headers
```markdown
# Main Title (H1)
## Section Title (H2)
### Subsection (H3)
#### Minor Section (H4)
```

### 2. Emphasis
```markdown
*Italic Text*
**Bold Text**
***Bold Italic Text***
```

### 3. Lists
```markdown
- Unordered item
- Another item
  - Nested item

1. Ordered item
2. Second item
   a. Sub-item
   b. Another sub-item
```

### 4. Links and Images
```markdown
[Link Text](URL)
![Image Alt Text](image-path)
```

### 5. Blockquotes
```markdown
> Single line quote

> Multi-line quote
> Continued quote
```

### 6. Code Blocks
```markdown
`Inline code`

```javascript
// Code block with syntax highlighting
function example() {
  return 'Hello World';
}
```
```

### 7. Tables
```markdown
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |
```

### 8. Task Lists
```markdown
- [ ] Unchecked task
- [x] Completed task
```

### 9. Footnotes
```markdown
Here's a sentence with a footnote[^1].

[^1]: This is the footnote content.
```

## Obsidian-Specific Syntax

### 1. Internal Links
```markdown
[[Page Name]]
[[Page Name|Display Text]]
```

### 2. Callouts
```markdown
> [!note]
> Important information

> [!warning]
> Warning message
```

### 3. Embedded Content
```markdown
![[image.png]]
![[note.md]]
```

### 4. Tags
```markdown
#tag
#nested/tag
```

### 5. Comments
```markdown
%%
Hidden comment
%%
```