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
console.log('  TEST UPLOAD VIDÉO - CLOUDINARY');
console.log('═══════════════════════════════════════════\n');

async function createTestVideo(): Promise<string> {
  // Create a minimal valid MP4 using ffmpeg if available, otherwise use a tiny sample
  const outputPath = path.join(__dirname, 'test-video.mp4');
  
  // Try ffmpeg first
  try {
    const { execSync } = require('child_process');
    execSync(`ffmpeg -y -f lavfi -i testsrc=duration=2:size=320x240:rate=15 -pix_fmt yuv420p "${outputPath}" 2>&1`, { stdio: 'pipe' });
    console.log('   Vidéo test générée avec ffmpeg (320x240, 2s)');
    return outputPath;
  } catch {
    // ffmpeg not available, create a minimal MP4-like file (won't be playable but tests upload)
    console.log('   ffmpeg non disponible, création d\'un fichier minimal...');
    // Minimal ftyp + mdat structure for MP4
    const ftyp = Buffer.from([
      0x00, 0x00, 0x00, 0x18, // size
      0x66, 0x74, 0x79, 0x70, // 'ftyp'
      0x69, 0x73, 0x6F, 0x6D, // major brand
      0x00, 0x00, 0x00, 0x00, // minor version
      0x69, 0x73, 0x6F, 0x6D, // compatible brand
      0x6D, 0x70, 0x34, 0x31, // compatible brand
    ]);
    const mdat = Buffer.from([
      0x00, 0x00, 0x00, 0x08, // size
      0x6D, 0x64, 0x61, 0x74, // 'mdat'
    ]);
    fs.writeFileSync(outputPath, Buffer.concat([ftyp, mdat]));
    return outputPath;
  }
}

async function testVideoUpload() {
  console.log('📹 Test: Upload d\'une vidéo\n');
  
  const videoPath = await createTestVideo();
  const buffer = fs.readFileSync(videoPath);
  console.log(`   Taille du fichier: ${buffer.length} bytes\n`);
  
  try {
    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video',
          folder: 'jamm-ak-xeewal/test',
          public_id: `test-video-${Date.now()}`,
          tags: ['test', 'video'],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(buffer);
    });
    
    console.log('   ✅ Upload vidéo réussi!');
    console.log(`   📎 URL: ${result.secure_url}`);
    console.log(`   🆔 Public ID: ${result.public_id}`);
    console.log(`   📐 Format: ${result.format}`);
    console.log(`   📏 Size: ${result.bytes} bytes`);
    if (result.duration) console.log(`   ⏱️  Durée: ${result.duration}s`);
    
    // Test delete
    console.log('\n🗑️  Suppression...');
    const delResult = await cloudinary.uploader.destroy(result.public_id, { resource_type: 'video' });
    if (delResult.result === 'ok') {
      console.log('   ✅ Suppression réussie!');
    }
    
    return result;
  } finally {
    // Cleanup local file
    if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
  }
}

async function testVideoTransformation(url: string) {
  console.log('\n🔄 Test: Transformations vidéo Cloudinary\n');
  
  // Generate transformation URLs
  const baseUrl = url.split('/upload/')[0] + '/upload/';
  const rest = url.split('/upload/')[1];
  
  const transforms = {
    'Thumbnail (w_600,q_auto)': `${baseUrl}w_600,q_auto/${rest}`,
    'Compressed (q_auto:low)': `${baseUrl}q_auto:low/${rest}`,
    'Poster image (so_0.jpg)': `${baseUrl}w_600,q_auto,so_0/${rest.replace('.mp4', '.jpg')}`,
  };
  
  for (const [name, tUrl] of Object.entries(transforms)) {
    console.log(`   ${name}:`);
    console.log(`   → ${tUrl}`);
  }
}

async function main() {
  try {
    const result = await testVideoUpload();
    testVideoTransformation(result.secure_url);
    
    console.log('\n═══════════════════════════════════════════');
    console.log('  ✅ TEST VIDÉO RÉUSSI!');
    console.log('═══════════════════════════════════════════');
  } catch (err: any) {
    console.log('\n═══════════════════════════════════════════');
    console.log('  ❌ ERREUR:', err.message);
    console.log('═══════════════════════════════════════════');
    process.exit(1);
  }
}

main();
