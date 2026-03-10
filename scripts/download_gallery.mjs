
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'https://ai.dreambrand.studio/api/global/images';
const IMAGE_BASE_URL = 'https://image-cloud-1318759792.cos.na-siliconvalley.myqcloud.com/';
const OUTPUT_DIR = path.join(__dirname, '../public/gallery');
const METADATA_FILE = path.join(OUTPUT_DIR, 'images.json');

async function downloadImage(url, dest) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(dest, buffer);
        console.log(`Downloaded: ${path.basename(dest)}`);
    } catch (error) {
        console.error(`Error downloading ${url}:`, error);
    }
}

async function main() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    try {
        console.log('Fetching image list...');
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "sort": "rand",
                "tabType": "images",
                "category_id": "61",
                "filter_type": 0,
                "current": 1,
                "pageSize": 100
            })
        });

        const data = await res.json();
        if (!data?.data?.list) {
            console.error('No images found in API response');
            return;
        }

        const images = data.data.list;
        console.log(`Found ${images.length} images. Starting download...`);

        for (const item of images) {
            const imageUrl = `${IMAGE_BASE_URL}${item.path}`;
            const dest = path.join(OUTPUT_DIR, item.name);
            await downloadImage(imageUrl, dest);
        }

        // Save metadata locally
        fs.writeFileSync(METADATA_FILE, JSON.stringify(data, null, 2));
        console.log('Metadata saved to:', METADATA_FILE);
        console.log('All images downloaded successfully!');

    } catch (error) {
        console.error('Download script failed:', error);
    }
}

main();
