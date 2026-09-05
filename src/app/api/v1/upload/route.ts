import { NextRequest, NextResponse } from 'next/server';
import { config as envConfig } from '@/core/lib/env';
import { v2 as cloudinary } from 'cloudinary';

// Configuration can be changed via environment variables
cloudinary.config({
  cloud_name: envConfig.cloudinaryCloudName,
  api_key: envConfig.cloudinaryApiKey,
  api_secret: envConfig.cloudinaryApiSecret,
});

import { withAuth } from '../../../../core/middlewares/authGuard';

export async function POST(req: NextRequest) {
  return withAuth(req, async (req: NextRequest) => {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ success: false, message: 'Aucun fichier fourni' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudinary using a Promise
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'jamm-ak-xeewal' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    return NextResponse.json({
      success: true,
      message: 'Fichier uploadé avec succès',
      url: (result as any).secure_url
    }, { status: 200 });
    
  } catch (error: any) {
    console.error("Erreur d'upload:", error);
    return NextResponse.json({ success: false, message: 'Erreur lors de l\'upload du fichier' }, { status: 500 });
  }
  });
}
