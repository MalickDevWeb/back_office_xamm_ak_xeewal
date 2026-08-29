export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Route PUBLIQUE — Upload de message vocal citoyen
 * Stratégie : audio haute qualité, optimisé CDN Cloudinary
 * Format : webm/opus → converti mp3 par Cloudinary pour compatibilité maximale
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('audio') as File;

    if (!file) {
      return NextResponse.json({ success: false, message: 'Aucun fichier audio fourni' }, { status: 400 });
    }

    // Validation stricte du type MIME
    const allowedTypes = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav', 'audio/mpeg', 'audio/mp3'];
    const isAudio = file.type.startsWith('audio/') || allowedTypes.some(t => file.type.includes(t.split('/')[1]));
    if (!isAudio) {
      return NextResponse.json({ success: false, message: 'Format non supporté. Envoyez un fichier audio.' }, { status: 400 });
    }

    // Limite 15 Mo
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: 'Fichier trop volumineux (max 15 Mo).' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const timestamp = Date.now();
    const publicId = `vocal_${timestamp}`;

    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'jamm-ak-xeewal/signalements-vocaux',
          resource_type: 'video',        // Cloudinary: 'video' couvre l'audio
          public_id: publicId,
          // Qualité audio maximale : pas de dégradation
          // format: 'mp3',              // Décommenter pour forcer mp3 (perd la qualité opus)
          // Optimisations CDN
          use_filename: false,
          unique_filename: true,
          overwrite: false,
          // Tags pour faciliter la recherche admin
          tags: ['signalement', 'vocal', 'citoyen'],
          context: { source: 'jamm-signalement', uploaded_at: new Date().toISOString() },
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    return NextResponse.json({
      success: true,
      message: 'Message vocal uploadé avec succès',
      url: result.secure_url,
      duration: Math.round(result.duration ?? 0),
      public_id: result.public_id,
      format: result.format,
      size_bytes: result.bytes,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Erreur upload audio:', error);
    return NextResponse.json({ success: false, message: "Erreur lors de l'upload du message vocal." }, { status: 500 });
  }
}
