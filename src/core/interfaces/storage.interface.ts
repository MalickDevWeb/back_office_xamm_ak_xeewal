export interface IStorageService {
  /**
   * Upload a file and return its public URL
   */
  uploadImage(fileBuffer: Buffer, fileName: string, folder: string): Promise<string>;
  
  /**
   * Delete a file by its URL or public ID
   */
  deleteImage(fileIdentifier: string): Promise<boolean>;
}
