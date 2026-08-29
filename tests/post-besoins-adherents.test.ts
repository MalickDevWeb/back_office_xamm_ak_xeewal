import { POST } from '../src/app/api/v1/besoins/route';
import { POST as postAdherent } from '../src/app/api/v1/adherents/route';
import { prisma } from '../src/core/lib/prisma';

describe('POST endpoints field mapping', () => {

  afterAll(async () => {
    await prisma.besoin.deleteMany({ where: { contact: '99912345' } });
    await prisma.besoin.deleteMany({ where: { contact: '88999000' } });
    await prisma.adherent.deleteMany({ where: { telephone: '99912345' } });
    await prisma.adherent.deleteMany({ where: { telephone: '88999000' } });
  });

  describe('POST /api/v1/besoins', () => {
    it('should create a besoin with mapped vocalUrl from media_url (201)', async () => {
      const req = {
        json: async () => ({
          contact: '99912345',
          description: 'Test besoin field mapping',
          media_url: 'https://example.com/audio.mp3',
          quartier: 'Nguinth',
          categorie: 'Transport',
          urgence: 'HAUTE',
          statut: 'NOUVEAU'
        })
      } as any;

      const res = await POST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.urgence).toBe('HAUTE');
      expect(json.data.vocalUrl).toBe('https://example.com/audio.mp3');
    });

    it('should return 500 when required fields are missing', async () => {
      const req = {
        json: async () => ({
          contact: '99912345'
          // missing description and quartier
        })
      } as any;

      const res = await POST(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  describe('POST /api/v1/adherents', () => {
    it('should create an adherent with quartier field (201)', async () => {
      const req = {
        json: async () => ({
          telephone: '99912345',
          nom: 'Test',
          prenom: 'User',
          quartier: 'Som',
          profession: 'Enseignant',
          statut: 'ACTIF'
        })
      } as any;

      const res = await postAdherent(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.quartier).toBe('Som');
    });

    it('should map frontend field aliases correctly', async () => {
      const req = {
        json: async () => ({
          telephone_citoyen: '88999000',
          nom_citoyen: 'AliasTest',
          quartier: 'Nguinth',
          pole: 'Economie',
          motivation: 'Très motivé'
        })
      } as any;

      const res = await postAdherent(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.telephone).toBe('88999000');
      expect(json.data.nom).toBe('AliasTest');
      expect(json.data.profession).toBe('Economie');
      expect(json.data.competences).toBe('Très motivé');
    });
  });
});
