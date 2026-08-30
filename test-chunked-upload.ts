import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';

// Manual .env loader
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
  if (match) process.env[match[1]] = match[2];
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log('═══════════════════════════════════════════');
console.log('  TEST CHUNKED UPLOAD (gros fichier)');
console.log('═══════════════════════════════════════════\n');

async function createLargeVideo(durationSec: number): Promise<string> {
  const outputPath = path.join(__dirname, 'test-large.mp4');
  const { execSync } = require('child_process');
  
  // Generate a test video with specific duration
  execSync(
    `ffmpeg -y -f lavfi -i testsrc=duration=${durationSec}:size=1280x720:rate=24 -pix_fmt yuv420p -c:v libx264 -preset fast -b:v 2M "${outputPath}" 2>&1`,
    { stdio: 'pipe' }
  );
  
  return outputPath;
}

async function testChunkedUpload() {
  console.log('🎬 Génération d\'une vidéo 720p de 30s (~5-10MB)...');
  const videoPath = await createLargeVideo(30);
  const buffer = fs.readFileSync(videoPath);
  const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
  console.log(`   Taille: ${sizeMB} MB\n`);

  console.log('📤 Upload avec chunked stream (6MB/chunk)...');
  const startTime = Date.now();
  
  try {
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_chunked_stream(
        {
          resource_type: 'video',
          folder: 'jamm-ak-xeewal/test',
          public_id: `test-chunked-${Date.now()}`,
          tags: ['test', 'chunked'],
          chunk_size: 6 * 1024 * 1024, // 6 MB chunks
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`   ✅ Upload réussi en ${elapsed}s!`);
    console.log(`   📎 URL: ${result.secure_url}`);
    console.log(`   🆔 Public ID: ${result.public_id}`);
    console.log(`   📐 Format: ${result.format}`);
    console.log(`   📏 Size: ${(result.bytes / 1024 / 1024).toFixed(2)} MB`);
    if (result.duration) console.log(`   ⏱️  Durée: ${result.duration}s`);

    // Delete
    console.log('\n🗑️  Suppression...');
    await cloudinary.uploader.destroy(result.public_id, { resource_type: 'video' });
    console.log('   ✅ Supprimé!');

  } finally {
    if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
  }
}

async function main() {
  try {
    await testChunkedUpload();
    
    console.log('\n═══════════════════════════════════════════');
    console.log('  ✅ CHUNKED UPLOAD FONCTIONNE!');
    console.log('═══════════════════════════════════════════');
    console.log('\n📋 Résumé pour vidéos 2 min:');
    console.log('   • Limite serveur: 100 MB');
    console.log('   • Chunk size: 6 MB');
    console.log('   • Timeout Vercel: 300s (plan Pro)');
    console.log('   • Compression client recommandée si > 25MB');
  } catch (err: any) {
    console.log('\n❌ ERREUR:', err.message);
    process.exit(1);
  }
}

main();
