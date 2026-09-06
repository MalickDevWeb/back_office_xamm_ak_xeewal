import { prisma } from '@/core/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export class GroupService {
  /**
   * Créer un nouveau groupe
   */
  async createGroup(organizationId: string, data: { name: string; type: string; description?: string }) {
    return prisma.group.create({
      data: {
        id: `group-${uuidv4()}`,
        organizationId,
        name: data.name,
        type: data.type,
        description: data.description,
        status: 'ACTIVE',
        updatedAt: new Date()
      },
    });
  }

  /**
   * Récupérer les groupes d'une organisation
   */
  async getGroups(organizationId: string, status?: string) {
    return prisma.group.findMany({
      where: {
        organizationId,
        ...(status ? { status } : {}),
      },
      include: {
        _count: {
          select: { GroupMember: { where: { removedAt: null } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Récupérer un groupe spécifique
   */
  async getGroup(organizationId: string, groupId: string) {
    return prisma.group.findFirst({
      where: {
        id: groupId,
        organizationId
      }
    });
  }

  /**
   * Mettre à jour un groupe
   */
  async updateGroup(organizationId: string, groupId: string, data: { name?: string; type?: string; description?: string }) {
    // S'assurer que le groupe appartient bien à l'organisation
    const group = await this.getGroup(organizationId, groupId);
    if (!group) throw new Error('Group not found');

    return prisma.group.update({
      where: { id: groupId },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Archiver un groupe
   */
  async archiveGroup(organizationId: string, groupId: string) {
    const group = await this.getGroup(organizationId, groupId);
    if (!group) throw new Error('Group not found');

    return prisma.group.update({
      where: { id: groupId },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  /**
   * Activer un groupe
   */
  async activateGroup(organizationId: string, groupId: string) {
    const group = await this.getGroup(organizationId, groupId);
    if (!group) throw new Error('Group not found');

    return prisma.group.update({
      where: { id: groupId },
      data: {
        status: 'ACTIVE',
        archivedAt: null,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Ajouter des adhérents à un groupe
   */
  async addMembersToGroup(organizationId: string, groupId: string, memberIds: string[], assignedBy?: string) {
    const group = await this.getGroup(organizationId, groupId);
    if (!group || group.status === 'ARCHIVED') {
      throw new Error('Group not found or is archived');
    }

    const payload = memberIds.map(memberId => ({
      id: `gm-${uuidv4()}`,
      groupId,
      memberId,
      assignedBy,
      assignedAt: new Date()
    }));

    // On utilise createMany avec skipDuplicates pour éviter les crashs si l'adhérent est déjà dans le groupe
    const result = await prisma.groupMember.createMany({
      data: payload,
      skipDuplicates: true
    });

    return result;
  }

  /**
   * Retirer un membre d'un groupe (Soft delete pour l'historique ou hard delete ?)
   * D'après le schéma, il y a un removedAt
   */
  async removeMemberFromGroup(organizationId: string, groupId: string, memberId: string) {
    const group = await this.getGroup(organizationId, groupId);
    if (!group) throw new Error('Group not found');

    // On fait un soft delete en peuplant removedAt
    const membership = await prisma.groupMember.findFirst({
      where: { groupId, memberId, removedAt: null }
    });

    if (!membership) return null;

    return prisma.groupMember.update({
      where: {
        groupId_memberId: { groupId, memberId }
      },
      data: {
        removedAt: new Date()
      }
    });
  }

  /**
   * Récupérer les membres actifs d'un groupe
   */
  async getGroupMembers(organizationId: string, groupId: string) {
    const group = await this.getGroup(organizationId, groupId);
    if (!group) throw new Error('Group not found');

    const memberships = await prisma.groupMember.findMany({
      where: {
        groupId,
        removedAt: null
      },
      include: {
        Adherent: true
      }
    });

    return memberships.map(m => m.Adherent);
  }
}
