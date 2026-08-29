import { NextRequest } from 'next/server';
import { GET } from '../src/app/api/v1/besoins/search/route';
import { prisma } from '../src/core/lib/prisma';

describe('GET /api/v1/besoins/search', () => {

  beforeAll(async () => {
    // Create test adherent
    await prisma.adherent.create({
      data: {
        telephone: '77123456',
        nom: 'TestUser',
        prenom: 'Search',
        quartier: 'Nguinth',
        statut: 'NOUVEAU'
      }
    });

    // Create a besoin in August 2026
    await prisma.besoin.create({
      data: {
        contact: '77123456',
        description: 'Test search signalement',
        vocalUrl: 'https://example.com/audio.mp3',
        quartier: 'Nguinth',
        categorie: 'Transport',
        urgence: 'HAUTE',
        statut: 'NOUVEAU'
      }
    });

    // Create a besoin in January 2025 (for month/year filtering test)
    await prisma.besoin.create({
      data: {
        contact: '77123456',
        description: 'Old signalement from 2025',
        vocalUrl: 'https://example.com/audio2.mp3',
        quartier: 'Nguinth',
        categorie: 'Education',
        urgence: 'BASSE',
        statut: 'NOUVEAU',
        createdAt: new Date('2025-01-15')
      }
    });
  });

  afterAll(async () => {
    await prisma.besoin.deleteMany({ where: { contact: '77123456' } });
    await prisma.adherent.deleteMany({ where: { telephone: '77123456' } });
  });

  it('should return 400 when contact parameter is missing', async () => {
    const req = new NextRequest('http://localhost/api/v1/besoins/search');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.message).toContain('contact');
  });

  it('should return 200 with personne info and signalements when contact is provided', async () => {
    const req = new NextRequest('http://localhost/api/v1/besoins/search?contact=77123456');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.personne).toBeDefined();
    expect(json.data.personne.telephone).toBe('77123456');
    expect(json.data.personne.nom).toBe('TestUser');
    expect(json.data.personne.prenom).toBe('Search');
    expect(json.data.signalements).toBeDefined();
    expect(Array.isArray(json.data.signalements)).toBe(true);
    expect(json.data.signalements.length).toBe(2);
  });

  it('should return 0 results when filtering by month=8&year=2025 (no data in Aug 2025)', async () => {
    const req = new NextRequest('http://localhost/api/v1/besoins/search?contact=77123456&month=8&year=2025');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.signalements.length).toBe(0);
  });

  it('should return 1 result when filtering by month=1&year=2025', async () => {
    const req = new NextRequest('http://localhost/api/v1/besoins/search?contact=77123456&month=1&year=2025');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.signalements.length).toBe(1);
    expect(json.data.signalements[0].description).toBe('Old signalement from 2025');
  });

  it('should return 0 results when filtering by non-existent quartier', async () => {
    const req = new NextRequest('http://localhost/api/v1/besoins/search?contact=77123456&quartier=NonExistentQuartier');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.signalements.length).toBe(0);
  });

  it('should return personne as null when contact has no adherent record', async () => {
    const req = new NextRequest('http://localhost/api/v1/besoins/search?contact=00000000');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.personne).toBeNull();
    expect(json.data.signalements).toEqual([]);
  });
});
