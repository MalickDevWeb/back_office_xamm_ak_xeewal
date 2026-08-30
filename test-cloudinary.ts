import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';

// Manual .env loader (dotenv not installed)
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
  if (match) process.env[match[1]] = match[2];
}

// Configure
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log('☁️  Test Cloudinary - Configuration:');
console.log(`   Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`);
console.log(`   API Key: ${process.env.CLOUDINARY_API_KEY}`);
console.log('');

async function testPing() {
  console.log('🔍 Test 1: Ping Cloudinary...');
  try {
    const result = await cloudinary.api.ping();
    console.log('   ✅ Ping réussi! Status:', result.status);
  } catch (err: any) {
    console.log('   ❌ Ping échoué:', err.message);
    throw err;
  }
}

async function testUpload() {
  console.log('\n📤 Test 2: Upload d\'une image test...');
  
  // Create a tiny 1x1 red PNG buffer for testing
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
  const buffer = Buffer.from(pngBase64, 'base64');
  
  try {
    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'jamm-ak-xeewal/test',
          public_id: `test-${Date.now()}`,
          resource_type: 'image',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(buffer);
    });
    
    console.log('   ✅ Upload réussi!');
    console.log(`   📎 URL: ${result.secure_url}`);
    console.log(`   🆔 Public ID: ${result.public_id}`);
    console.log(`   📐 Format: ${result.format}`);
    console.log(`   📏 Size: ${result.bytes} bytes`);
    
    return result;
  } catch (err: any) {
    console.log('   ❌ Upload échoué:', err.message);
    throw err;
  }
}

async function testDelete(publicId: string) {
  console.log('\n🗑️  Test 3: Suppression de l\'image test...');
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result === 'ok') {
      console.log('   ✅ Suppression réussie!');
    } else {
      console.log('   ⚠️  Résultat:', result);
    }
  } catch (err: any) {
    console.log('   ❌ Suppression échouée:', err.message);
  }
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  TEST CLOUDINARY - JAMM_AK_XEEWAL');
  console.log('═══════════════════════════════════════════\n');
  
  try {
    await testPing();
    const uploadResult = await testUpload();
    await testDelete(uploadResult.public_id);
    
    console.log('\n═══════════════════════════════════════════');
    console.log('  ✅ TOUS LES TESTS ONT RÉUSSI!');
    console.log('═══════════════════════════════════════════');
  } catch (err: any) {
    console.log('\n═══════════════════════════════════════════');
    console.log('  ❌ TEST EN ÉCHEC');
    console.log('  ', err.message);
    console.log('═══════════════════════════════════════════');
    process.exit(1);
  }
}

main();
