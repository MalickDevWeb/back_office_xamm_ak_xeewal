export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, message: 'Aucun fichier fourni' }, { status: 400 });
    }

    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: 'Fichier trop volumineux (max 15 Mo).' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const timestamp = Date.now();

    const isVideo = file.type.startsWith('video/');
    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: isVideo ? 'video' : 'auto',
          public_id: `public_${timestamp}`,
          tags: ['public', 'signalement'],
          timeout: 120000 // 2 minutes timeout
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    return NextResponse.json({
      success: true,
      url: result.secure_url
    });

  } catch (error: any) {
    console.error("Erreur d'upload public:", error);
    return NextResponse.json({ success: false, message: 'Erreur serveur', error: error.message }, { status: 500 });
  }
}
