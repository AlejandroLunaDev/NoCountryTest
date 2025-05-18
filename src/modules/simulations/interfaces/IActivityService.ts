import { ActivityType } from '@prisma/client';

export interface ActivityQueryParams {
  userId?: string;
  type?: ActivityType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface ActivityRecordDTO {
  userId: string;
  simulationId: string;
  type: ActivityType;
  details?: string;
}

export interface IActivityService {
  recordActivity(data: ActivityRecordDTO): Promise<any>;
  getActivityBySimulation(
    simulationId: string,
    params?: ActivityQueryParams
  ): Promise<any>;
  getActivityByUser(userId: string, params?: ActivityQueryParams): Promise<any>;
  getActivityStats(simulationId: string): Promise<any>;
}
