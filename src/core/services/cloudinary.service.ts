import { v2 as cloudinary } from 'cloudinary';
import { config as envConfig } from '@/core/lib/env';
import { IStorageService } from '../interfaces/storage.interface';

// Configuration de Cloudinary
cloudinary.config({
  cloud_name: envConfig.cloudinaryCloudName,
  api_key: envConfig.cloudinaryApiKey,
  api_secret: envConfig.cloudinaryApiSecret,
});

export class CloudinaryService implements IStorageService {
  
  async uploadImage(fileBuffer: Buffer, fileName: string, folder: string = 'jamm-ak-xeewal'): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          public_id: fileName,
          resource_type: 'auto'
        },
        (error, result) => {
          if (error) return reject(error);
          if (result) return resolve(result.secure_url);
          reject(new Error("Upload échoué : aucun résultat retourné."));
        }
      );

      // On écrit le buffer dans le flux d'upload
      uploadStream.end(fileBuffer);
    });
  }

  async deleteImage(fileUrl: string): Promise<boolean> {
    try {
      // Extraction de l'ID public à partir de l'URL Cloudinary
      // Ex: https://res.cloudinary.com/.../v1234567890/jamm-ak-xeewal/mon-image.jpg -> jamm-ak-xeewal/mon-image
      const urlParts = fileUrl.split('/');
      const filenameWithExtension = urlParts[urlParts.length - 1];
      const folderName = urlParts[urlParts.length - 2];
      const filename = filenameWithExtension.split('.')[0];
      const publicId = `${folderName}/${filename}`;

      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      console.error("Erreur lors de la suppression Cloudinary:", error);
      return false;
    }
  }
}
