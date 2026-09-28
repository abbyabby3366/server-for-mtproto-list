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
 * Decode common HTML entities from scraped web content
 */
function decodeHtmlEntities(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCharCode(parseInt(dec, 10));
      } catch {
        return _;
      }
    })
    .trim();
}

/**
 * Scrape the public Telegram channel preview page to find metadata (title, description, image)
 */
async function getTelegramChannelInfo(handle) {
  try {
    const url = `https://t.me/${handle}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.warn(`[Telegram Scrape] Failed to fetch Telegram page for ${handle}: HTTP ${response.status}`);
      return null;
    }

    const html = await response.text();

    // Title
    const ogTitle = html.match(/property="og:title"\s+content="([^"]*)"/i) ||
                    html.match(/name="twitter:title"\s+content="([^"]*)"/i);
    let title = '';
    if (ogTitle && ogTitle[1]) {
      const parsedTitle = decodeHtmlEntities(ogTitle[1]);
      // Avoid placeholder "Telegram: Contact @handle"
      if (!parsedTitle.toLowerCase().startsWith('telegram: contact @')) {
        title = parsedTitle;
      }
    }

    // Description
    const ogDesc = html.match(/property="og:description"\s+content="([^"]*)"/i) ||
                   html.match(/name="twitter:description"\s+content="([^"]*)"/i);
    const description = ogDesc && ogDesc[1] ? decodeHtmlEntities(ogDesc[1]) : '';

    // Image
    const ogImg = html.match(/property="og:image"\s+content="([^"]+)"/i) ||
                  html.match(/name="twitter:image"\s+content="([^"]+)"/i);
    let avatarUrl = null;
    if (ogImg && ogImg[1]) {
      // Exclude generic placeholder logo
      if (!ogImg[1].includes('telegram.org/img/t_logo')) {
        avatarUrl = ogImg[1];
      }
    }

    return {
      title,
      description,
      avatarUrl
    };
  } catch (err) {
    console.error(`[Telegram Scrape] Error scraping channel info for ${handle}:`, err.message);
    return null;
  }
}

/**
 * Scrape the public Telegram channel preview page to find the avatar image URL (backward-compatible)
 */
async function getTelegramAvatarUrl(handle) {
  const info = await getTelegramChannelInfo(handle);
  return info ? info.avatarUrl : null;
}

/**
 * Upload an image URL to Linode S3 bucket
 */
async function uploadImageToS3(imageUrl, handle) {
  const imgRes = await fetch(imageUrl);
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

  const publicUrl = `https://${BUCKET_NAME}/${key}`;
  return publicUrl;
}

/**
 * Download image from Telegram and upload it to Linode S3 bucket
 */
async function uploadTelegramAvatarToS3(handle) {
  const telegramImgUrl = await getTelegramAvatarUrl(handle);
  if (!telegramImgUrl) {
    throw new Error(`Could not find profile image on Telegram for @${handle}`);
  }
  return uploadImageToS3(telegramImgUrl, handle);
}

/**
 * Sync entire channel info from Telegram: title, description, and S3 avatar
 */
async function syncTelegramChannel(handle) {
  const info = await getTelegramChannelInfo(handle);
  if (!info) {
    throw new Error(`Failed to fetch Telegram details for @${handle}`);
  }

  let avatar_url = null;
  if (info.avatarUrl) {
    try {
      avatar_url = await uploadImageToS3(info.avatarUrl, handle);
    } catch (err) {
      console.warn(`[Sync] Avatar upload to S3 failed for @${handle}:`, err.message);
    }
  }

  return {
    handle,
    title: info.title,
    description: info.description,
    avatar_url
  };
}

module.exports = {
  extractTelegramHandle,
  getTelegramChannelInfo,
  getTelegramAvatarUrl,
  uploadTelegramAvatarToS3,
  syncTelegramChannel
};
