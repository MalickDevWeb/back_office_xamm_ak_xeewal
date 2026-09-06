import { ISmsProvider } from '@/core/interfaces/notification-providers.interface';

export class MockSmsProvider implements ISmsProvider {
  constructor(private config: any = {}) {}

  async sendSms(phoneNumber: string, message: string): Promise<boolean> {
    try {
      console.log(`[MockSmsProvider] Simulated SMS sent to ${phoneNumber}`);
      console.log(`[MockSmsProvider] Message content: "${message}"`);
      if (this.config.senderId) {
        console.log(`[MockSmsProvider] Sender: ${this.config.senderId}`);
      }
      
      // Simulation d'un appel réseau (50ms)
      await new Promise(resolve => setTimeout(resolve, 50));

      return true;
    } catch (error) {
      console.error('[MockSmsProvider] Error sending SMS:', error);
      return false;
    }
  }
}
