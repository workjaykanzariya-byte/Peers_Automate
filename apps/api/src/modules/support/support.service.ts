import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { IAuthUser } from '@doot/shared';

export interface CreateTicketDto {
  subject: string;
  description: string;
  category?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List tickets with tenant isolation (or all tickets if platform admin)
   */
  async listTickets(organizationId: string, user: IAuthUser, status?: string) {
    const where: any = {};

    // Customer can only view their organization's tickets
    if (!user.isPlatformAdmin) {
      where.organizationId = organizationId;
    }

    if (status) {
      where.status = status;
    }

    return this.prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: {
          select: { comments: true },
        },
      },
    });
  }

  async getTicket(organizationId: string, ticketId: string, user: IAuthUser) {
    const where: any = { id: ticketId };
    if (!user.isPlatformAdmin) {
      where.organizationId = organizationId;
    }

    const ticket = await this.prisma.supportTicket.findFirst({
      where,
      include: {
        organization: { select: { id: true, name: true } },
        creator: { select: { id: true, firstName: true, lastName: true, email: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, firstName: true, lastName: true, isPlatformAdmin: true } },
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    // Hide internal staff notes from regular customers
    if (!user.isPlatformAdmin) {
      ticket.comments = ticket.comments.filter((c) => !c.isInternalNote);
    }

    return ticket;
  }

  async createTicket(organizationId: string, userId: string, dto: CreateTicketDto) {
    const ticketNumber = `TICK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    return this.prisma.supportTicket.create({
      data: {
        organizationId,
        userId,
        ticketNumber,
        subject: dto.subject,
        description: dto.description,
        category: dto.category || 'GENERAL',
        priority: dto.priority || 'MEDIUM',
        status: 'NEW',
      },
    });
  }

  async addComment(
    organizationId: string,
    ticketId: string,
    userId: string,
    content: string,
    isInternalNote = false,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    return this.prisma.ticketComment.create({
      data: {
        ticketId,
        userId,
        content,
        isInternalNote,
      },
    });
  }

  async updateTicketStatus(ticketId: string, status: string) {
    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status },
    });
  }

  /**
   * In-app Notification Center
   */
  async getNotifications(organizationId: string) {
    return this.prisma.notification.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async markNotificationRead(organizationId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, organizationId },
      data: { isRead: true },
    });
  }
}
