const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Initialize S3 client for Linode Object Storage
const s3Client = new S3Client({
  region: process.env.S3_REGION_NAME || 'ap-south-1',
  endpoint: process.env.S3_ENDPOINT_URL || 'https://ap-south-1.linodeobjects.com',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  }
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'x.neuronwww.com';

/**
 * Extract telegram handle from various URL / username formats
 * e.g. "https://t.me/sousuozan" -> "sousuozan"
 *      "t.me/jisou" -> "jisou"
 *      "@sousuozan" -> "sousuozan"
 */
function extractTelegramHandle(link) {
  if (!link || typeof link !== 'string') return null;
  const cleaned = link.trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^t\.me\//i, '')
    .replace(/^@/, '')
    .split('/')[0]
    .split('?')[0];

  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Scrape the public Telegram channel preview page to find the avatar image URL
 */
async function getTelegramAvatarUrl(handle) {
  try {
    const url = `https://t.me/${handle}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.warn(`[Avatar] Failed to fetch Telegram page for ${handle}: HTTP ${response.status}`);
      return null;
    }

    const html = await response.text();

    // Look for og:image or twitter:image
    const ogMatch = html.match(/property="og:image"\s+content="([^"]+)"/i) ||
                    html.match(/name="twitter:image"\s+content="([^"]+)"/i);

    if (ogMatch && ogMatch[1]) {
      return ogMatch[1];
    }

    return null;
  } catch (err) {
    console.error(`[Avatar] Error scraping avatar for ${handle}:`, err.message);
    return null;
  }
}

/**
 * Download image from Telegram and upload it to Linode S3 bucket
 */
async function uploadTelegramAvatarToS3(handle) {
  const telegramImgUrl = await getTelegramAvatarUrl(handle);
  if (!telegramImgUrl) {
    throw new Error(`Could not find profile image on Telegram for @${handle}`);
  }

  // Download image buffer
  const imgRes = await fetch(telegramImgUrl);
  if (!imgRes.ok) {
    throw new Error(`Failed to download image from Telegram: HTTP ${imgRes.status}`);
  }

  const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
  const arrayBuffer = await imgRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const fileExt = contentType.includes('png') ? 'png' : 'jpg';
  const key = `avatars/${handle}.${fileExt}`;

  // Upload to Linode S3
  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read'
  }));

  // Public URL using custom domain or Linode endpoint
  const publicUrl = `https://${BUCKET_NAME}/${key}`;
  return publicUrl;
}

module.exports = {
  extractTelegramHandle,
  getTelegramAvatarUrl,
  uploadTelegramAvatarToS3
};
