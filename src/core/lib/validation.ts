import { z } from 'zod';
import { NextResponse } from 'next/server';

export const LoginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string(),
});

export const AdherentSchema = z.object({
  prenom: z.string().min(1, 'Prénom requis').max(100),
  nom: z.string().min(1, 'Nom requis').max(100),
  telephone: z.string().regex(/^(\+221[\s\-]?)?[7]\d[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}$/, 'Format de téléphone invalide'),
  quartier: z.string().min(1, 'Quartier requis').max(100),
  profession: z.string().max(100).optional().nullable(),
  competences: z.string().max(500).optional().nullable(),
  disponibilite: z.string().max(100).optional().nullable(),
  carteRectoUrl: z.string().url().optional().nullable(),
  carteVersoUrl: z.string().url().optional().nullable(),
  statut: z.enum(['NOUVEAU', 'ACTIF', 'SUSPENDU']).optional(),
  poleId: z.string().optional().nullable(),
});

export const ActiviteSchema = z.object({
  titre: z.string().min(1, 'Titre requis').max(200),
  description: z.string().max(2000).optional().nullable(),
  categorie: z.string().min(1, 'Catégorie requise').max(100),
  date: z.string().datetime().optional().nullable(),
  typeMedia: z.enum(['PHOTOS', 'VIDEOS']).optional(),
  mediaUrl: z.string().max(2000).optional().nullable(),
  mediaCount: z.number().int().min(0).optional(),
  statut: z.enum(['PUBLIE', 'BROUILLON']).optional(),
});

export const BesoinSchema = z.object({
  quartier: z.string().min(1, 'Quartier requis').max(100),
  description: z.string().min(1, 'Description requise').max(2000),
  categorie: z.string().max(100).optional().nullable(),
  urgence: z.enum(['BASSE', 'MOYENNE', 'HAUTE']).optional(),
  contact: z.string().max(100).optional().nullable(),
  statut: z.enum(['EN_ATTENTE', 'EN_COURS', 'RESOLU']).optional(),
  vocalUrl: z.string().url().optional().nullable(),
  photoUrl: z.string().max(2000).optional().nullable(),
  telephone: z.string().max(50).optional().nullable(),
  nom: z.string().max(100).optional().nullable(),
});

export const IdeeSchema = z.object({
  titre: z.string().min(1, 'Titre requis').max(200),
  description: z.string().max(2000),
  pole: z.string().max(100).optional().nullable(),
  auteur: z.string().max(100).optional().nullable(),
  categorie: z.string().max(100).optional().nullable(),
  statut: z.enum(['NOUVELLE', 'EN_COURS', 'REALISE']).optional(),
});

export const MessageSchema = z.object({
  nom: z.string().min(1, 'Nom requis').max(100),
  email: z.string().email('Email invalide').optional().nullable(),
  telephone: z.string().max(20).optional().nullable(),
  sujet: z.string().min(1, 'Sujet requis').max(200),
  contenu: z.string().min(1, 'Message requis').max(2000),
  lu: z.boolean().optional(),
});

export const CommissionSchema = z.object({
  nom: z.string().min(1, 'Nom requis').max(100),
  description: z.string().max(500).optional().nullable(),
  responsable: z.string().max(100).optional().nullable(),
  membres: z.string().max(500).optional().nullable(),
  reunions: z.string().max(1000).optional().nullable(),
  dernierProjet: z.string().max(500).optional().nullable(),
  statut: z.enum(['ACTIF', 'INACTIF']).optional(),
});

export const CompteRenduSchema = z.object({
  titre: z.string().min(1, 'Titre requis').max(200),
  lieu: z.string().max(100).optional().nullable(),
  date: z.string().datetime().optional().nullable(),
  auteur: z.string().max(100).optional().nullable(),
  contenu: z.string().max(5000).optional().nullable(),
  statut: z.enum(['BROUILLON', 'PUBLIE']).optional(),
});

export const SondageSchema = z.object({
  question: z.string().min(1, 'Question requise').max(500),
  options: z.array(z.string().min(1).max(200)).min(2, 'Au moins 2 options requises'),
  statut: z.enum(['ACTIF', 'CLOS']).optional(),
});

export const OptionSchema = z.object({
  type: z.string().min(1, 'Type requis').max(50),
  value: z.string().min(1, 'Value requise').max(100),
  label: z.string().min(1, 'Label requis').max(100),
  ordre: z.number().int().min(0).optional(),
  actif: z.boolean().optional(),
});

export const EditorialSchema = z.object({
  page: z.string().min(1, 'Page requise').max(50),
  content: z.any().optional(),
});

export const EvenementSchema = z.object({
  titre: z.string().min(1, 'Titre requis').max(200),
  description: z.string().max(1000).optional().nullable(),
  date: z.string().datetime('Date invalide'),
  heureDebut: z.string().regex(/^([01]?\d|2[0-3]):([0-5]\d)$/, 'Heure invalide (HH:MM)').optional().nullable(),
  heureFin: z.string().regex(/^([01]?\d|2[0-3]):([0-5]\d)$/, 'Heure invalide (HH:MM)').optional().nullable(),
  lieu: z.string().max(200).optional().nullable(),
  categorie: z.enum(['Causerie', 'Rencontre', 'Formation', 'Sport', 'Culture', 'Autre']).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  statut: z.enum(['A_VENIR', 'EN_COURS', 'TERMINE', 'ANNULE']).optional(),
});

export const SettingsSchema = z.object({
  telephone: z.string().max(20).optional(),
  email: z.string().email('Email invalide').optional(),
  adresse: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  facebook: z.string().url().optional().nullable(),
  twitter: z.string().url().optional().nullable(),
  linkedin: z.string().url().optional().nullable(),
  instagram: z.string().url().optional().nullable(),
  youtube: z.string().url().optional().nullable(),
  tiktok: z.string().url().optional().nullable(),
  mapUrl: z.string().url().optional().nullable(),
  qrCode: z.string().url().optional().nullable(),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type AdherentInput = z.infer<typeof AdherentSchema>;
export type ActiviteInput = z.infer<typeof ActiviteSchema>;
export type BesoinInput = z.infer<typeof BesoinSchema>;
export type IdeeInput = z.infer<typeof IdeeSchema>;
export type MessageInput = z.infer<typeof MessageSchema>;
export type CommissionInput = z.infer<typeof CommissionSchema>;
export type CompteRenduInput = z.infer<typeof CompteRenduSchema>;
export type SondageInput = z.infer<typeof SondageSchema>;
export type OptionInput = z.infer<typeof OptionSchema>;
export type EditorialInput = z.infer<typeof EditorialSchema>;
export type EvenementInput = z.infer<typeof EvenementSchema>;
export type SettingsInput = z.infer<typeof SettingsSchema>;

export const PoleSchema = z.object({
  titre: z.string().min(1, 'Titre requis').max(200),
  description: z.string().min(1, 'Description requise').max(5000),
  objectifs: z.string().max(5000).optional().nullable(),
  statut: z.enum(['PUBLIE', 'BROUILLON']).optional(),
});
export type PoleInput = z.infer<typeof PoleSchema>;
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const zodError = result.error as any;
  const errors = (zodError.errors || zodError.issues || []).map((e: any) => `${e.path?.join('.')}: ${e.message}`).join(', ');
  return { success: false, error: errors || 'Erreur de validation' };
}

export function validationErrorResponse(error: string, status = 400) {
  return NextResponse.json({ success: false, message: 'Erreur de validation', error }, { status });
}
