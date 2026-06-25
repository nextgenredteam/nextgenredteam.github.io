const fs = require('fs');
const path = require('path');

const title = process.argv[2];
if (!title) {
  console.error('Error: Please provide a title for the blog post.');
  console.log('Usage: npm run new-post "My Post Title"');
  process.exit(1);
}

// Slugify the title
const slug = title
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

const fileName = `${slug}.md`;
const filePath = path.join(__dirname, '../blog/posts', fileName);

if (fs.existsSync(filePath)) {
  console.error(`Error: Post file already exists at ${filePath}`);
  process.exit(1);
}

const currentDate = new Date().toISOString().split('T')[0];

const frontmatter = `---
title: "${title}"
date: "${currentDate}"
author: "Joe B. The Blind Hacker"
description: "Brief description of the post..."
---

# ${title}

Write your content here...
`;

fs.writeFileSync(filePath, frontmatter, 'utf8');
console.log(`Success! Created new blog post draft at: blog/posts/${fileName}`);
