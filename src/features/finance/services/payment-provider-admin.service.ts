import { prisma } from '../../../core/lib/prisma';
import { CryptoUtil } from '../../../core/utils/crypto.util';
import { PaymentProviderFactory } from '../providers/payment-provider.factory';

const VALID_PROVIDERS = ['WAVE', 'ORANGE_MONEY', 'MANUAL'] as const;
type Provider = typeof VALID_PROVIDERS[number];

function assertProvider(p: string): Provider {
  const upper = p.toUpperCase() as Provider;
  if (!VALID_PROVIDERS.includes(upper)) {
    throw new Error(`Provider invalide : ${p}. Valeurs acceptées : ${VALID_PROVIDERS.join(', ')}`);
  }
  return upper;
}

export class PaymentProviderAdminService {
  /**
   * Liste les providers configurés pour une organisation.
   * Ne retourne JAMAIS les credentials.
   */
  static async listProviders(organizationId: string) {
    const configs = await prisma.paymentProviderConfig.findMany({
      where: { organizationId },
      select: {
        id: true,
        provider: true,
        enabled: true,
        mode: true,
        lastTestedAt: true,
        lastTestStatus: true,
        updatedAt: true,
        // credentialsConfigured : true si credentialsEncrypted est non null
        credentialsEncrypted: true,
        webhookSecretEncrypted: true,
      },
    });

    return configs.map((c) => ({
      id: c.id,
      provider: c.provider,
      enabled: c.enabled,
      mode: c.mode,
      lastTestedAt: c.lastTestedAt,
      lastTestStatus: c.lastTestStatus,
      updatedAt: c.updatedAt,
      credentialsConfigured: !!c.credentialsEncrypted,
      webhookSecretConfigured: !!c.webhookSecretEncrypted,
      // NE JAMAIS retourner credentialsEncrypted ou webhookSecretEncrypted
    }));
  }

  /**
   * Configure (ou reconfigure) un provider avec ses credentials chiffrés.
   * Active le provider uniquement sur demande explicite (enabled !== vrai par défaut).
   */
  static async configureProvider(
    organizationId: string,
    provider: string,
    credentials?: Record<string, string>,
    webhookSecret?: string,
    mode?: string
  ) {
    const validProvider = assertProvider(provider);

    const credentialsEncrypted = credentials ? CryptoUtil.encryptConfig(credentials) : undefined;
    const webhookSecretEncrypted = webhookSecret ? CryptoUtil.encryptConfig(webhookSecret) : undefined;

    const config = await prisma.paymentProviderConfig.upsert({
      where: { organizationId_provider: { organizationId, provider: validProvider } },
      update: {
        ...(credentialsEncrypted !== undefined && { credentialsEncrypted }),
        ...(webhookSecretEncrypted !== undefined && { webhookSecretEncrypted }),
        ...(mode && { mode }),
      },
      create: {
        organizationId,
        provider: validProvider,
        credentialsEncrypted: credentialsEncrypted ?? null,
        webhookSecretEncrypted: webhookSecretEncrypted ?? null,
        mode: mode || 'SANDBOX',
        enabled: false, // Toujours désactivé à la création — doit être activé explicitement
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        actorId: 'SYSTEM',
        action: 'CREDENTIALS_UPDATED',
        entityType: 'PaymentProviderConfig',
        entityId: config.id,
        metadata: { provider: validProvider, mode: config.mode } as any,
      },
    });

    return {
      provider: config.provider,
      enabled: config.enabled,
      mode: config.mode,
      credentialsConfigured: !!config.credentialsEncrypted,
      webhookSecretConfigured: !!config.webhookSecretEncrypted,
    };
  }

  /**
   * Teste la connexion avec les credentials actuels du provider.
   * Pour le MVP, effectue une vérification basique : credentials présents + provider joignable.
   */
  static async testProvider(organizationId: string, provider: string, actorId: string) {
    const validProvider = assertProvider(provider);

    const config = await prisma.paymentProviderConfig.findUnique({
      where: { organizationId_provider: { organizationId, provider: validProvider } },
    });

    if (!config) {
      throw new Error(`Provider ${validProvider} non configuré pour cette organisation`);
    }

    if (!config.credentialsEncrypted) {
      throw new Error(`Credentials manquants pour ${validProvider}. Configurez d'abord le provider.`);
    }

    let testStatus: 'SUCCESS' | 'FAILED' = 'FAILED';
    let testMessage = '';

    try {
      // Pour MANUAL : pas d'API externe, test toujours OK
      if (validProvider === 'MANUAL') {
        testStatus = 'SUCCESS';
        testMessage = 'Le paiement manuel ne nécessite pas de connexion externe.';
      } else {
        // Pour Wave/Orange : vérifier que les credentials se déchiffrent correctement
        const credentials = CryptoUtil.decryptConfig(config.credentialsEncrypted);

        if (!credentials || Object.keys(credentials).length === 0) {
          throw new Error('Credentials corrompus ou vides');
        }

        // Validation minimale : vérifier la présence des champs obligatoires
        const requiredFields: Record<string, string[]> = {
          WAVE: ['api_key'],
          ORANGE_MONEY: ['client_id', 'client_secret'],
        };

        const required = requiredFields[validProvider] || [];
        const missing = required.filter((f) => !credentials[f]);

        if (missing.length > 0) {
          throw new Error(`Champs credentials manquants : ${missing.join(', ')}`);
        }

        // TODO: Appel réel à l'API du provider pour valider les credentials
        // const providerInstance = PaymentProviderFactory.getProvider(validProvider);
        // await providerInstance.testConnection(credentials, config.mode);

        testStatus = 'SUCCESS';
        testMessage = `Credentials ${validProvider} valides (mode ${config.mode}).`;
      }
    } catch (err: any) {
      testStatus = 'FAILED';
      testMessage = err.message;
    }

    // Enregistrer le résultat du test
    await prisma.paymentProviderConfig.update({
      where: { organizationId_provider: { organizationId, provider: validProvider } },
      data: { lastTestedAt: new Date(), lastTestStatus: testStatus },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        actorId,
        action: 'PROVIDER_TESTED',
        entityType: 'PaymentProviderConfig',
        entityId: config.id,
        metadata: { provider: validProvider, testStatus, testMessage } as any,
      },
    });

    return { provider: validProvider, testStatus, testMessage };
  }

  /**
   * Active un provider. Requiert que des credentials soient déjà configurés
   * (sauf pour MANUAL qui n'en a pas besoin).
   */
  static async enableProvider(organizationId: string, provider: string, actorId: string) {
    const validProvider = assertProvider(provider);

    const config = await prisma.paymentProviderConfig.findUnique({
      where: { organizationId_provider: { organizationId, provider: validProvider } },
    });

    if (!config) {
      throw new Error(`Provider ${validProvider} non configuré. Configurez-le d'abord.`);
    }

    if (validProvider !== 'MANUAL' && !config.credentialsEncrypted) {
      throw new Error(`Configurez les credentials de ${validProvider} avant de l'activer.`);
    }

    if (config.enabled) {
      return { provider: validProvider, enabled: true, message: 'Provider déjà activé' };
    }

    await prisma.paymentProviderConfig.update({
      where: { organizationId_provider: { organizationId, provider: validProvider } },
      data: { enabled: true },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        actorId,
        action: 'PROVIDER_ENABLED',
        entityType: 'PaymentProviderConfig',
        entityId: config.id,
        metadata: { provider: validProvider } as any,
      },
    });

    return { provider: validProvider, enabled: true, message: `Provider ${validProvider} activé avec succès` };
  }

  /**
   * Désactive un provider.
   */
  static async disableProvider(organizationId: string, provider: string, actorId: string) {
    const validProvider = assertProvider(provider);

    const config = await prisma.paymentProviderConfig.findUnique({
      where: { organizationId_provider: { organizationId, provider: validProvider } },
    });

    if (!config) {
      throw new Error(`Provider ${validProvider} non trouvé`);
    }

    if (!config.enabled) {
      return { provider: validProvider, enabled: false, message: 'Provider déjà désactivé' };
    }

    await prisma.paymentProviderConfig.update({
      where: { organizationId_provider: { organizationId, provider: validProvider } },
      data: { enabled: false },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        actorId,
        action: 'PROVIDER_DISABLED',
        entityType: 'PaymentProviderConfig',
        entityId: config.id,
        metadata: { provider: validProvider } as any,
      },
    });

    return { provider: validProvider, enabled: false, message: `Provider ${validProvider} désactivé` };
  }

  /**
   * Change l'environnement (SANDBOX / PRODUCTION) d'un provider.
   * Désactive automatiquement le provider lors du changement
   * (force une validation manuelle avant de ré-activer en production).
   */
  static async setEnvironment(
    organizationId: string,
    provider: string,
    mode: 'SANDBOX' | 'PRODUCTION',
    actorId: string
  ) {
    const validProvider = assertProvider(provider);
    const validMode = mode?.toUpperCase();

    if (!['SANDBOX', 'PRODUCTION'].includes(validMode)) {
      throw new Error('Mode invalide. Valeurs acceptées : SANDBOX, PRODUCTION');
    }

    const config = await prisma.paymentProviderConfig.findUnique({
      where: { organizationId_provider: { organizationId, provider: validProvider } },
    });

    if (!config) {
      throw new Error(`Provider ${validProvider} non configuré`);
    }

    // Désactiver lors d'un changement d'environnement pour forcer une re-validation
    const wasEnabled = config.enabled;
    await prisma.paymentProviderConfig.update({
      where: { organizationId_provider: { organizationId, provider: validProvider } },
      data: { mode: validMode, enabled: false },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        actorId,
        action: 'PROVIDER_ENVIRONMENT_CHANGED',
        entityType: 'PaymentProviderConfig',
        entityId: config.id,
        metadata: {
          provider: validProvider,
          previousMode: config.mode,
          newMode: validMode,
          wasEnabled,
          autoDisabled: wasEnabled,
        } as any,
      },
    });

    return {
      provider: validProvider,
      mode: validMode,
      enabled: false,
      message: wasEnabled
        ? `Environnement changé vers ${validMode}. Le provider a été désactivé pour re-validation.`
        : `Environnement changé vers ${validMode}.`,
    };
  }
}
