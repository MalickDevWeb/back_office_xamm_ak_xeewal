export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes (Vercel Pro)
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 Mo
const CHUNK_SIZE = 6 * 1024 * 1024; // 6 Mo par chunk

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, message: 'Aucun fichier fourni' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, message: 'Fichier trop volumineux (max 100 Mo).' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const timestamp = Date.now();

    const isVideo = file.type.startsWith('video/');
    const useChunked = file.size > 20 * 1024 * 1024; // > 20 Mo

    const result = await new Promise<any>((resolve, reject) => {
      if (useChunked) {
        // Chunked upload pour gros fichiers (plus fiable, reprise sur erreur)
        const stream = cloudinary.uploader.upload_chunked_stream(
          {
            resource_type: isVideo ? 'video' : 'auto',
            public_id: `public_${timestamp}`,
            tags: ['public', 'signalement'],
            chunk_size: CHUNK_SIZE,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(buffer);
      } else {
        // Upload standard pour petits fichiers
        cloudinary.uploader.upload_stream(
          {
            resource_type: isVideo ? 'video' : 'auto',
            public_id: `public_${timestamp}`,
            tags: ['public', 'signalement'],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(buffer);
      }
    });

    return NextResponse.json({
      success: true,
      url: result.secure_url,
      duration: result.duration,
      bytes: result.bytes,
    });

  } catch (error: any) {
    console.error("Erreur d'upload public:", error);
    return NextResponse.json({ success: false, message: 'Erreur serveur', error: error.message }, { status: 500 });
  }
}
