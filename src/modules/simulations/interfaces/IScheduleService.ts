import { CreateScheduleDTO } from '../types';

export interface IScheduleService {
  createWeeklySchedule(data: CreateScheduleDTO): Promise<any>;
  getWeeklySchedule(simulationId: string, weekNumber?: number): Promise<any>;
}
