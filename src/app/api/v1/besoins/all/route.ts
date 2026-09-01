export const runtime = 'nodejs';
import { NextRequest } from 'next/server';
import { handleDeleteAll } from '../../../../../core/lib/bulk-delete';
import { withAuth } from '../../../../../core/middlewares/authGuard';
export async function DELETE(req: NextRequest) {
  return withAuth(req as any, async (req: NextRequest) => handleDeleteAll(req, 'besoin'));
}
