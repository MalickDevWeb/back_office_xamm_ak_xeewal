export class SmsService {
  /**
   * Envoie un SMS à un numéro de téléphone
   * Retourne true si l'envoi a réussi
   */
  async sendSms(phoneNumber: string, message: string): Promise<boolean> {
    try {
      // TODO: Intégrer l'API du fournisseur (Orange SMS, Twilio, Infobip, etc.)
      // Pour le MVP, on simule l'envoi dans les logs.
      
      console.log(`[SmsService] Simulated SMS sent to ${phoneNumber}`);
      console.log(`[SmsService] Message content: "${message}"`);
      
      // Simulation d'un appel réseau (50ms)
      await new Promise(resolve => setTimeout(resolve, 50));

      return true;
    } catch (error) {
      console.error('[SmsService] Error sending SMS:', error);
      return false;
    }
  }
}
