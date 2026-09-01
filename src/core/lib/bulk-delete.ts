import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './prisma';
import { getCorsHeaders } from './cors';

export type PrismaModelName =
  | 'adherent' | 'besoin' | 'idee' | 'message' | 'evenement' | 'activite'
  | 'commission' | 'sondage' | 'compteRendu' | 'visite' | 'option' | 'editorial' | 'settings';

export interface BulkDeleteResult {
  success: boolean; deleted: number; requested: number; message: string; errors?: string[];
}

export async function bulkDeleteByIds(modelName: PrismaModelName, ids: string[]): Promise<BulkDeleteResult> {
  if (!ids || ids.length === 0) return { success: false, deleted: 0, requested: 0, message: 'Aucun ID fourni' };
  try {
    const model = (prisma as any)[modelName];
    if (!model) return { success: false, deleted: 0, requested: ids.length, message: 'Modele introuvable' };
    const result = await model.deleteMany({ where: { id: { in: ids } } });
    return { success: true, deleted: result.count, requested: ids.length, message: result.count + ' supprime(s) sur ' + ids.length };
  } catch (error: any) {
    return { success: false, deleted: 0, requested: ids.length, message: 'Erreur', errors: [error.message] };
  }
}

export async function deleteAll(modelName: PrismaModelName): Promise<BulkDeleteResult> {
  try {
    const model = (prisma as any)[modelName];
    if (!model) return { success: false, deleted: 0, requested: 0, message: 'Modele introuvable' };
    const countBefore = await model.count();
    if (countBefore === 0) return { success: true, deleted: 0, requested: 0, message: 'Aucun element' };
    const result = await model.deleteMany({});
    return { success: true, deleted: result.count, requested: countBefore, message: 'TOUS les ' + result.count + ' supprimes' };
  } catch (error: any) {
    return { success: false, deleted: 0, requested: 0, message: 'Erreur', errors: [error.message] };
  }
}

export async function handleBulkDelete(req: NextRequest, modelName: PrismaModelName): Promise<NextResponse> {
  const corsHeaders = getCorsHeaders(req);
  try {
    const body = await req.json();
    const ids = Array.isArray(body.ids) ? body.ids.filter((id: any) => typeof id === 'string') : [];
    const result = await bulkDeleteByIds(modelName, ids);
    if (!result.success) return NextResponse.json(result, { status: 400, headers: corsHeaders });
    return NextResponse.json(result, { status: 200, headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ success: false, deleted: 0, message: 'Erreur serveur' }, { status: 500, headers: corsHeaders });
  }
}

export async function handleDeleteAll(req: NextRequest, modelName: PrismaModelName): Promise<NextResponse> {
  const corsHeaders = getCorsHeaders(req);
  const confirm = req.headers.get('x-confirm');
  if (confirm !== 'DELETE_ALL') {
    return NextResponse.json({ success: false, deleted: 0, message: 'Header X-Confirm: DELETE_ALL requis' }, { status: 403, headers: corsHeaders });
  }
  const result = await deleteAll(modelName);
  if (!result.success) return NextResponse.json(result, { status: 400, headers: corsHeaders });
  return NextResponse.json(result, { status: 200, headers: corsHeaders });
}
