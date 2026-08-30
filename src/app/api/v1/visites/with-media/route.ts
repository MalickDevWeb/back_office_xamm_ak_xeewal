export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { validateInput, validationErrorResponse, VisiteSchema } from '../../../../../core/lib/validation';
import { prisma } from '../../../../../core/lib/prisma';
import { withAuth } from '../../../../../core/middlewares/authGuard';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// POST /api/v1/visites/with-media
// Combined endpoint: validates + uploads media to Cloudinary + creates visite
export async function POST(req: NextRequest) {
  return withAuth(req, async (req: NextRequest) => {
    try {
      const formData = await req.formData();
      
      // Extract text fields
      const titre = formData.get('titre') as string;
      const description = formData.get('description') as string | null;
      const lieu = formData.get('lieu') as string | null;
      const date = formData.get('date') as string | null;
      const typeMedia = (formData.get('typeMedia') as string) || 'PHOTOS';
      const statut = (formData.get('statut') as string) || 'PUBLIE';
      
      // Validate required fields
      if (!titre) {
        return NextResponse.json({ 
          success: false, 
          message: 'Le titre est requis' 
        }, { status: 400 });
      }
      
      // Validate with Zod schema
      const validationData: any = {
        titre,
        description,
        lieu,
        date,
        typeMedia,
        statut,
      };
      
      const validation = validateInput(VisiteSchema, validationData);
      if (!validation.success) {
        return validationErrorResponse(validation.error);
      }
      
      // Get files from form data
      const files = formData.getAll('files') as File[];
      
      // Upload files to Cloudinary if any
      let mediaUrls: string[] = [];
      
      if (files && files.length > 0) {
        const uploadPromises = files.map(async (file) => {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          return new Promise<string>((resolve, reject) => {
            cloudinary.uploader.upload_stream(
              {
                resource_type: 'auto',
                folder: 'jamm-ak-xeewal/visites',
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result!.secure_url);
              }
            ).end(buffer);
          });
        });
        
        mediaUrls = await Promise.all(uploadPromises);
      }
      
      // Create visite with media URLs
      const newVisite = await prisma.visite.create({
        data: {
          titre,
          description,
          lieu,
          date: date ? new Date(date) : new Date(),
          typeMedia: mediaUrls.length > 0 ? typeMedia : 'PHOTOS',
          mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
          mediaCount: mediaUrls.length,
          statut,
        },
      });
      
      return NextResponse.json({ success: true, data: newVisite }, { status: 201 });
      
    } catch (error: any) {
      console.error('POST /visites/with-media error:', error);
      return NextResponse.json({ 
        success: false, 
        message: "Erreur lors de la création", 
        error: error.message 
      }, { status: 500 });
    }
  });
}
