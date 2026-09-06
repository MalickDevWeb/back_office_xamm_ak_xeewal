import { prisma } from '../../../lib/prisma';

export class ContributionService {
  
  static async createContribution(data: {
    organizationId: string;
    memberId: string;
    contributionTypeId: string;
    expectedAmount: number;
    currency?: string;
    dueDate?: Date;
    notes?: string;
    createdBy: string;
  }) {
    return await prisma.contribution.create({
      data: {
        organizationId: data.organizationId,
        memberId: data.memberId,
        contributionTypeId: data.contributionTypeId,
        expectedAmount: data.expectedAmount,
        currency: data.currency || 'XOF',
        dueDate: data.dueDate,
        notes: data.notes,
        status: 'EN_ATTENTE',
        createdBy: data.createdBy
      }
    });
  }

  static async getContributionDetails(contributionId: string) {
    const contribution = await prisma.contribution.findUnique({
      where: { id: contributionId },
      include: {
        payments: true,
        contributionType: true,
        Adherent: true
      }
    });

    if (!contribution) throw new Error("Cotisation non trouvée");

    const totalPaid = contribution.payments
      .filter(p => p.status === 'CONFIRMED')
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      ...contribution,
      totalPaid,
      remainingAmount: contribution.expectedAmount - totalPaid
    };
  }
}
