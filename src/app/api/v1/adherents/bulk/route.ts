export const runtime = 'nodejs';
import { NextRequest } from 'next/server';
import { handleBulkDelete } from '../../../../../core/lib/bulk-delete';
import { requirePermission } from '../../../../../core/security/permission.guard';

export const POST = requirePermission('members.delete', async (req: NextRequest) => {
  return handleBulkDelete(req, 'adherent');
});
