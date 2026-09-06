import crypto from 'crypto';

// Utilise une clé de 32 caractères pour AES-256
const SECRET_KEY = process.env.CRYPTO_SECRET_KEY || 'default_secret_key_needs_to_be_32_bytes_long'; 
const ALGORITHM = 'aes-256-gcm';

export class CryptoUtil {
  /**
   * Chiffre un objet JSON en une chaîne base64
   */
  static encryptConfig(config: any): string {
    const text = JSON.stringify(config);
    const iv = crypto.randomBytes(12); // Recommandé pour GCM
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY.slice(0, 32)), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag().toString('base64');
    
    // On stocke sous la forme: iv:authTag:encryptedData
    return `${iv.toString('base64')}:${authTag}:${encrypted}`;
  }

  /**
   * Déchiffre une chaîne base64 en objet JSON
   */
  static decryptConfig(encryptedDataStr: string): any {
    try {
      const parts = encryptedDataStr.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }
      
      const [ivStr, authTagStr, encryptedText] = parts;
      const iv = Buffer.from(ivStr, 'base64');
      const authTag = Buffer.from(authTagStr, 'base64');
      
      const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY.slice(0, 32)), iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('[CryptoUtil] Error decrypting config', error);
      return {};
    }
  }
}
