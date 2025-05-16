import prisma from '../../../config/prisma';
import { ActivityType } from '@prisma/client';

interface RecordActivityParams {
  userId: string;
  simulationId: string;
  type: ActivityType;
  details?: string;
}

interface QueryActivityParams {
  userId?: string;
  simulationId?: string;
  type?: ActivityType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export const activityService = {
  async recordActivity(data: RecordActivityParams) {
    const { userId, simulationId, type, details } = data;

    return prisma.activity.create({
      data: {
        userId,
        simulationId,
        type,
        details
      }
    });
  },

  async getActivityByUser(userId: string, params?: QueryActivityParams) {
    const {
      limit = 50,
      offset = 0,
      simulationId,
      type,
      startDate,
      endDate
    } = params || {};

    const whereClause: any = { userId };

    if (simulationId) {
      whereClause.simulationId = simulationId;
    }

    if (type) {
      whereClause.type = type;
    }

    if (startDate || endDate) {
      whereClause.timestamp = {};

      if (startDate) {
        whereClause.timestamp.gte = startDate;
      }

      if (endDate) {
        whereClause.timestamp.lte = endDate;
      }
    }

    return prisma.activity.findMany({
      where: whereClause,
      skip: offset,
      take: limit,
      orderBy: {
        timestamp: 'desc'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        simulation: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    });
  },

  async getActivityBySimulation(
    simulationId: string,
    params?: QueryActivityParams
  ) {
    const {
      limit = 50,
      offset = 0,
      userId,
      type,
      startDate,
      endDate
    } = params || {};

    const whereClause: any = { simulationId };

    if (userId) {
      whereClause.userId = userId;
    }

    if (type) {
      whereClause.type = type;
    }

    if (startDate || endDate) {
      whereClause.timestamp = {};

      if (startDate) {
        whereClause.timestamp.gte = startDate;
      }

      if (endDate) {
        whereClause.timestamp.lte = endDate;
      }
    }

    return prisma.activity.findMany({
      where: whereClause,
      skip: offset,
      take: limit,
      orderBy: {
        timestamp: 'desc'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  },

  async getActivityStats(simulationId: string) {
    // Obtener estadísticas de actividad por tipo
    const activityCounts = await prisma.activity.groupBy({
      by: ['type'],
      where: {
        simulationId
      },
      _count: {
        id: true
      }
    });

    // Obtener usuarios más activos
    const userActivity = await prisma.activity.groupBy({
      by: ['userId'],
      where: {
        simulationId
      },
      _count: {
        id: true
      }
    });

    const userIds = userActivity.map(ua => ua.userId);

    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds
        }
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    const userActivityWithDetails = userActivity.map(ua => {
      const user = users.find(u => u.id === ua.userId);
      return {
        user,
        activityCount: ua._count.id
      };
    });

    return {
      activityByType: activityCounts,
      topUsers: userActivityWithDetails
        .sort((a, b) => b.activityCount - a.activityCount)
        .slice(0, 10)
    };
  }
};
