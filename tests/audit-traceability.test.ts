import { NextRequest } from 'next/server';
import { prisma } from '../src/core/lib/prisma';
import { AuditService } from '../src/features/financial/services/audit.service';
import { splitFullName, resolveAdminActorFromRequest } from '../src/core/lib/auth-actor';
import { GET } from '../src/app/api/v1/audit/route';

describe('Module Audit & Traçabilité des Actions Dangereuses & Financières', () => {
  let testAdminUser: any;
  let testSimpleAdherent: any;
  const createdAuditLogIds: string[] = [];

  beforeAll(async () => {
    // 1. Créer un administrateur avec profil pour les tests
    testAdminUser = await prisma.adminUser.create({
      data: {
        email: `test.tresorier.${Date.now()}@jammakxeewal.sn`,
        name: 'Amadou Moustapha Fall',
        telephone: '+221 77 555 44 33',
        password: 'hashed-secret-pass',
        role: 'ADMIN',
        actif: true,
      },
    });

    // 2. Créer un adhérent simple (citoyen) pour tester l'exclusion stricte
    testSimpleAdherent = await prisma.adherent.create({
      data: {
        prenom: 'Ibrahima',
        nom: 'Ndiaye',
        telephone: `77${Math.floor(1000000 + Math.random() * 9000000)}`,
        quartier: 'Médina Fall',
        statut: 'NOUVEAU',
      },
    });
  });

  afterAll(async () => {
    // Nettoyage des logs de test créés
    if (createdAuditLogIds.length > 0) {
      await prisma.auditLog.deleteMany({
        where: { id: { in: createdAuditLogIds } },
      });
    }

    // Nettoyage des utilisateurs de test
    if (testAdminUser) {
      await prisma.adminUser.delete({ where: { id: testAdminUser.id } }).catch(() => {});
    }
    if (testSimpleAdherent) {
      await prisma.adherent.delete({ where: { id: testSimpleAdherent.id } }).catch(() => {});
    }
  });

  describe('1. Découpage du Nom Complet (splitFullName)', () => {
    it('devrait séparer correctement le prénom et le nom de famille composé', () => {
      const res = splitFullName('Amadou Moustapha Fall');
      expect(res.prenom).toBe('Amadou Moustapha');
      expect(res.nom).toBe('Fall');
    });

    it('devrait gérer un prénom et nom standard', () => {
      const res = splitFullName('Moussa Diop');
      expect(res.prenom).toBe('Moussa');
      expect(res.nom).toBe('Diop');
    });

    it('devrait fournir un fallback élégant pour un nom vide', () => {
      const res = splitFullName('');
      expect(res.prenom).toBe('Admin');
      expect(res.nom).toBe('JÀMM');
    });
  });

  describe('2. Résolution d\'Acteur (resolveAdminActorFromRequest)', () => {
    it('devrait résoudre un administrateur existant avec son prénom, nom, email et téléphone', async () => {
      const actor = await resolveAdminActorFromRequest(null, testAdminUser.id);
      expect(actor.actorId).toBe(testAdminUser.id);
      expect(actor.actorPrenom).toBe('Amadou Moustapha');
      expect(actor.actorNom).toBe('Fall');
      expect(actor.actorEmail).toBe(testAdminUser.email);
      expect(actor.actorPhone).toBe('+221 77 555 44 33');
      expect(actor.isStaff).toBe(true);
    });
  });

  describe('3. Moteur d\'Audit (AuditService.log)', () => {
    it('devrait STRICTEMENT EXCLURE les simples adhérents du journal d\'audit de gestion', async () => {
      // Un adhérent simple ne doit pas être enregistré dans l'audit des actions sensibles
      const logResult = await AuditService.log({
        actorId: testSimpleAdherent.id,
        action: 'PUBLIC_FORM_SUBMISSION',
        entityType: 'Adherent',
        entityId: testSimpleAdherent.id,
      });

      expect(logResult).toBeNull();
    });

    it('devrait enregistrer une action financière critique avec coordonnées complètes de l\'admin', async () => {
      const testEntityId = `expense-test-${Date.now()}`;
      const log = await AuditService.log({
        actorId: testAdminUser.id,
        action: 'EXPENSE_APPROVED',
        entityType: 'Expense',
        entityId: testEntityId,
        metadata: {
          amount: 75000,
          beneficiary: 'Fournisseur Matériel Médical',
          secretApiKey: 'super-secret-12345', // Doit être masqué
        },
      });

      expect(log).not.toBeNull();
      if (log) {
        createdAuditLogIds.push(log.id);

        expect(log.category).toBe('FINANCE');
        expect(log.severity).toBe('CRITICAL');
        expect(log.actorPrenom).toBe('Amadou Moustapha');
        expect(log.actorNom).toBe('Fall');
        expect(log.actorEmail).toBe(testAdminUser.email);
        expect(log.actorPhone).toBe('+221 77 555 44 33');

        // Masquage automatique des secrets
        const metadata = log.metadata as Record<string, any>;
        expect(metadata.amount).toBe(75000);
        expect(metadata.beneficiary).toBe('Fournisseur Matériel Médical');
        expect(metadata.secretApiKey).toBe('[MASKED_SECRET]');
      }
    });

    it('devrait classifier une modification de permissions comme action de Sécurité Critique', async () => {
      const log = await AuditService.log({
        actorId: testAdminUser.id,
        action: 'PROFILE_PERMISSIONS_CHANGED',
        entityType: 'Profile',
        entityId: 'profile-uuid-xyz',
        metadata: {
          profileName: 'Trésorier Général',
          addedPermissions: ['finances', 'finances_providers'],
        },
      });

      expect(log).not.toBeNull();
      if (log) {
        createdAuditLogIds.push(log.id);
        expect(log.category).toBe('SECURITY');
        expect(log.severity).toBe('CRITICAL');
      }
    });
  });

  describe('4. Endpoint API HTTP (GET /api/v1/audit)', () => {
    it('devrait retourner les logs avec pagination et calcul des statistiques', async () => {
      const req = new NextRequest('http://localhost:3001/api/v1/audit?limit=5&page=1');
      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.page).toBe(1);
      expect(json.limit).toBe(5);
      expect(json.stats).toBeDefined();
      expect(json.stats.total).toBeGreaterThanOrEqual(1);
      expect(typeof json.stats.criticalCount).toBe('number');
      expect(typeof json.stats.financeCount).toBe('number');
    });

    it('devrait filtrer efficacement par catégorie FINANCE', async () => {
      const req = new NextRequest('http://localhost:3001/api/v1/audit?category=FINANCE&limit=10');
      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      for (const item of json.data) {
        expect(item.category).toBe('FINANCE');
      }
    });

    it('devrait filtrer par niveau de gravité CRITICAL', async () => {
      const req = new NextRequest('http://localhost:3001/api/v1/audit?severity=CRITICAL&limit=10');
      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      for (const item of json.data) {
        expect(item.severity).toBe('CRITICAL');
      }
    });

    it('devrait permettre la recherche textuelle par prénom ou nom d\'auteur', async () => {
      const req = new NextRequest('http://localhost:3001/api/v1/audit?search=Amadou');
      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(1);
      const found = json.data.some((l: any) => l.actorPrenom?.includes('Amadou') || l.actorName?.includes('Amadou'));
      expect(found).toBe(true);
    });
  });
});
