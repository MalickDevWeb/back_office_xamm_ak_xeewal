import { PaymentProviderInterface } from './payment-provider.interface';
import { ManualPaymentProvider } from './manual-payment.provider';
import { WavePaymentProvider } from './wave-payment.provider';
import { OrangeMoneyPaymentProvider } from './orange-money-payment.provider';

export class PaymentProviderFactory {
  static getProvider(providerName: string): PaymentProviderInterface {
    switch (providerName.toUpperCase()) {
      case 'MANUAL':
        return new ManualPaymentProvider();
      case 'WAVE':
        return new WavePaymentProvider();
      case 'ORANGE_MONEY':
        return new OrangeMoneyPaymentProvider();
      default:
        throw new Error(`Provider de paiement non supporté : ${providerName}`);
    }
  }
}
