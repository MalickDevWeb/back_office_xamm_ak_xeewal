import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../core/security/permission.guard';
import { prisma } from '../../../../../core/lib/prisma';
import { FinancialMovementService } from '../../../../../features/finance/services/financial-movement.service';

/**
 * GET /api/v1/financial/accounts
 * Liste les comptes financiers avec solde calculé dynamiquement.
 *
 * POST /api/v1/financial/accounts
 * Crée un nouveau compte financier.
 * Body: { name, type, currency? }
 * Types: CAISSE | WAVE | ORANGE_MONEY | BANQUE | AUTRE
 */

const VALID_ACCOUNT_TYPES = ['CAISSE', 'WAVE', 'ORANGE_MONEY', 'BANQUE', 'AUTRE'];

async function listAccountsHandler(request: Request) {
  try {
    const organizationId = request.headers.get('x-organization-id') || 'DEFAULT_ORG';
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;

    const where: any = { organizationId };
    if (status) where.status = status;

    const accounts = await prisma.financialAccount.findMany({
      where,
      include: { movements: { select: { direction: true, amount: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const data = accounts.map((acc) => {
      const credit = acc.movements
        .filter((m) => m.direction === 'CREDIT')
        .reduce((s, m) => s + m.amount, 0);
      const debit = acc.movements
        .filter((m) => m.direction === 'DEBIT')
        .reduce((s, m) => s + m.amount, 0);
      return {
        id: acc.id,
        name: acc.name,
        type: acc.type,
        currency: acc.currency,
        status: acc.status,
        balance: credit - debit,
        totalCredit: credit,
        totalDebit: debit,
        createdAt: acc.createdAt,
        updatedAt: acc.updatedAt,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

async function createAccountHandler(request: Request) {
  try {
    const organizationId = request.headers.get('x-organization-id') || 'DEFAULT_ORG';
    const body = await request.json();
    const { name, type, currency } = body;

    if (!name || !type) {
      return NextResponse.json({ success: false, message: 'name et type sont requis' }, { status: 400 });
    }

    if (!VALID_ACCOUNT_TYPES.includes(type.toUpperCase())) {
      return NextResponse.json({
        success: false,
        message: `Type invalide. Valeurs acceptées : ${VALID_ACCOUNT_TYPES.join(', ')}`
      }, { status: 400 });
    }

    // Empêcher la création d'un second compte WAVE ou ORANGE_MONEY (unicité logique par provider)
    if (['WAVE', 'ORANGE_MONEY'].includes(type.toUpperCase())) {
      const existing = await prisma.financialAccount.findFirst({
        where: { organizationId, type: type.toUpperCase(), status: 'ACTIVE' }
      });
      if (existing) {
        return NextResponse.json({
          success: false,
          message: `Un compte ${type.toUpperCase()} actif existe déjà (id: ${existing.id})`
        }, { status: 409 });
      }
    }

    const account = await prisma.financialAccount.create({
      data: {
        organizationId,
        name,
        type: type.toUpperCase(),
        currency: currency || 'XOF',
        status: 'ACTIVE',
      }
    });

    return NextResponse.json({ success: true, data: { ...account, balance: 0 } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export const GET = requirePermission('finance.accounts.read', listAccountsHandler);
export const POST = requirePermission('finance.accounts.write', createAccountHandler);
