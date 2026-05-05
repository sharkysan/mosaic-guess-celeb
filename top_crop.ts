import fs from 'fs';

const CELEBRITIES_FILE = 'src/constants.ts';
const content = fs.readFileSync(CELEBRITIES_FILE, 'utf8');
const regex = /\{ name: "([^"]+)", imageUrl: "([^"]+)" \}/g;

function aggressiveEncode(str: string) {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

const updatedContent = content.replace(regex, (match, name, url) => {
  let originalUrl = url;
  
  if (url.includes('wsrv.nl/?url=')) {
    const m = url.match(/url=([^&]+)/);
    if (m) {
      originalUrl = decodeURIComponent(m[1]);
      if (originalUrl.includes('%')) originalUrl = decodeURIComponent(originalUrl);
    }
  }
  
  // Ensure we use the original source, not the thumbnail
  if (originalUrl.includes('/wikipedia/commons/thumb/')) {
    originalUrl = originalUrl.replace('/commons/thumb/', '/commons/');
    const urlParts = originalUrl.split('/');
    if (urlParts.length > 8) {
      urlParts.pop();
      originalUrl = urlParts.join('/');
    }
  }

  originalUrl = originalUrl.split('?')[0];

  // Using a=top to prioritize the upper part of the image (the head)
  // We keep precrop=true and w=1000/h=1000 for a crisp square result
  const smartUrl = `https://wsrv.nl/?url=${aggressiveEncode(originalUrl)}&w=1000&h=1000&fit=cover&a=top&precrop=true`;
  
  return `{ name: "${name}", imageUrl: "${smartUrl}" }`;
});

fs.writeFileSync(CELEBRITIES_FILE, updatedContent);
console.log('Updated celebrities to use top-aligned cropping.');
