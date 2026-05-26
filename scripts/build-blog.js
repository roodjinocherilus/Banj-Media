#!/usr/bin/env node
/**
 * build-blog.js
 * Scans blog/posts/*.md, parses frontmatter, writes:
 *   - blog/posts-manifest.json   (all posts, sorted by date desc)
 *   - blog/latest-posts.json     (3 most recent posts)
 *
 * No external dependencies — only Node built-ins.
 */

const fs   = require('fs');
const path = require('path');

const POSTS_DIR      = path.join(__dirname, '..', 'blog', 'posts');
const MANIFEST_PATH  = path.join(__dirname, '..', 'blog', 'posts-manifest.json');
const LATEST_PATH    = path.join(__dirname, '..', 'blog', 'latest-posts.json');

/**
 * Parse YAML-like frontmatter from a markdown string.
 * Supports simple key: "value" pairs (quoted or unquoted).
 * Returns { data: {}, content: '' }
 */
function parseFrontmatter(raw) {
  const FENCE = '---';
  const lines = raw.replace(/\r\n/g, '\n').split('\n');

  // Must start with ---
  if (lines[0].trim() !== FENCE) {
    return { data: {}, content: raw };
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === FENCE) {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return { data: {}, content: raw };
  }

  const fmLines  = lines.slice(1, endIndex);
  const bodyLines = lines.slice(endIndex + 1);
  const data = {};

  for (const line of fmLines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let val   = line.slice(colonIdx + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    data[key] = val;
  }

  return { data, content: bodyLines.join('\n').trimStart() };
}

function run() {
  // Ensure blog/posts dir exists
  if (!fs.existsSync(POSTS_DIR)) {
    console.log('blog/posts/ directory not found — writing empty manifests.');
    fs.mkdirSync(POSTS_DIR, { recursive: true });
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify([], null, 2));
    fs.writeFileSync(LATEST_PATH,   JSON.stringify([], null, 2));
    return;
  }

  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  console.log(`Found ${files.length} markdown file(s) in blog/posts/`);

  const posts = [];

  for (const file of files) {
    const slug    = file.replace(/\.md$/, '');
    const raw     = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
    const { data } = parseFrontmatter(raw);

    posts.push({
      slug,
      title:          data.title          || slug,
      date:           data.date           || '',
      category:       data.category       || '',
      excerpt:        data.excerpt        || '',
      featured_image: data.featured_image || '',
    });
  }

  // Sort by date descending (ISO date strings sort correctly lexicographically)
  posts.sort((a, b) => {
    if (a.date < b.date) return 1;
    if (a.date > b.date) return -1;
    return 0;
  });

  const latestPosts = posts.slice(0, 3);

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(posts, null, 2));
  fs.writeFileSync(LATEST_PATH,   JSON.stringify(latestPosts, null, 2));

  console.log(`Written: blog/posts-manifest.json (${posts.length} posts)`);
  console.log(`Written: blog/latest-posts.json   (${latestPosts.length} posts)`);
}

run();
