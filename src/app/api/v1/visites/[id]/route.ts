export const runtime = 'nodejs';
import { validateInput, validationErrorResponse, VisiteSchema } from '../../../../../core/lib/validation';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../core/lib/prisma';
import { withAuth } from '../../../../../core/middlewares/authGuard';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// PUT /api/v1/visites/:id - supports both JSON and multipart/form-data
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  return withAuth(req as any, async (req: Request) => {
    try {
      const { id } = params;
      const contentType = req.headers.get('content-type') || '';
      
      let data: any;
      let newFiles: File[] = [];
      let existingMediaUrls: string[] = [];
      
      if (contentType.includes('multipart/form-data')) {
        // Handle multipart form data with files
        const formData = await req.formData();
        
        // Extract text fields
        data = {
          titre: formData.get('titre') as string,
          description: formData.get('description') as string | null,
          lieu: formData.get('lieu') as string | null,
          date: formData.get('date') as string | null,
          typeMedia: (formData.get('typeMedia') as string) || 'PHOTOS',
          statut: (formData.get('statut') as string) || 'PUBLIE',
        };
        
        // Get existing media URLs if provided
        const existingUrlsJson = formData.get('existingMediaUrls') as string | null;
        if (existingUrlsJson) {
          try {
            existingMediaUrls = JSON.parse(existingUrlsJson);
          } catch (e) {
            existingMediaUrls = [];
          }
        }
        
        // Get new files
        newFiles = formData.getAll('files') as File[];
        
        // Validate
        const validation = validateInput(VisiteSchema, data);
        if (!validation.success) {
          return validationErrorResponse(validation.error);
        }
      } else {
        // Handle JSON body
        data = await req.json();
        const validation = validateInput(VisiteSchema, data);
        if (!validation.success) {
          return validationErrorResponse(validation.error);
        }
      }
      
      // Upload new files if any
      let mediaUrls: string[] = [...existingMediaUrls];
      
      if (newFiles && newFiles.length > 0) {
        const uploadPromises = newFiles.map(async (file) => {
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
        
        const newUrls = await Promise.all(uploadPromises);
        mediaUrls = [...mediaUrls, ...newUrls];
      }
      
      // Determine typeMedia from first media URL
      let typeMedia = data.typeMedia;
      if (mediaUrls.length > 0) {
        const firstUrl = mediaUrls[0];
        if (firstUrl.match(/\.(mp4|webm|mov)/i)) {
          typeMedia = 'VIDEOS';
        } else {
          typeMedia = 'PHOTOS';
        }
      }
      
      const mediaUrl = mediaUrls.length > 0 ? mediaUrls.join(',') : undefined;
      
      const updateData: any = {
        titre: data.titre,
        description: data.description,
        lieu: data.lieu,
        date: data.date ? new Date(data.date) : undefined,
        typeMedia,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
        mediaCount: mediaUrls.length,
        statut: data.statut,
      };
      
      const updated = await prisma.visite.update({
        where: { id },
        data: updateData,
      });
      
      return NextResponse.json({ success: true, data: updated });
    } catch (error: any) {
      console.error('PUT /visites error:', error);
      return NextResponse.json({ success: false, message: "Erreur lors de la modification", error: error.message }, { status: 500 });
    }
  });
}

// DELETE /api/v1/visites/:id
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  return withAuth(req as any, async (req: Request) => {
    try {
      const { id } = params;
      await prisma.visite.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Visite supprimée' });
    } catch (error) {
      console.error('DELETE /visites error:', error);
      return NextResponse.json({ success: false, message: "Erreur lors de la suppression" }, { status: 500 });
    }
  });
}
