export const runtime = 'nodejs';
import { NextRequest } from 'next/server';
import { handleBulkDelete } from '../../../../../core/lib/bulk-delete';
import { withAuth } from '../../../../../core/middlewares/authGuard';
export async function POST(req: NextRequest) {
  return withAuth(req as any, async (req: NextRequest) => handleBulkDelete(req, 'sondage'));
}
