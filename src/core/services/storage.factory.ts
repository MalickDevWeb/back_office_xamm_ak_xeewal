import { IStorageService } from '../interfaces/storage.interface';
import { CloudinaryService } from './cloudinary.service';

/**
 * Factory pattern pour pouvoir facilement changer de fournisseur de stockage
 * (par exemple passer de Cloudinary à AWS S3 ou Firebase plus tard)
 */
export class StorageFactory {
  static getStorageService(): IStorageService {
    // Actuellement on retourne Cloudinary. 
    // Si on veut changer, il suffit de modifier cette ligne :
    // return new AWSS3Service();
    return new CloudinaryService();
  }
}
