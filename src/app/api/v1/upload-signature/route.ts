export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { getCorsHeaders } from '../../../../core/lib/cors';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) });
}

export async function POST(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);
  try {
    const { folder, resource_type } = await req.json();

    const timestamp = Math.round(new Date().getTime() / 1000);
    const paramsToSign = {
      timestamp,
      folder: folder || 'public',
      tags: 'public,activite',
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET!
    );

    return NextResponse.json({
      success: true,
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder: folder || 'public',
      resourceType: resource_type || 'auto',
    }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Signature error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur lors de la génération de la signature', error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
