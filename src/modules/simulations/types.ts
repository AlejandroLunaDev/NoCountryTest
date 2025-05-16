import { SimulationType, SimulationStatus } from '@prisma/client';

export interface CreateSimulationDTO {
  name: string;
  description?: string;
  type: SimulationType;
  startDate: Date;
  endDate: Date;
  status: SimulationStatus;
}

export interface EnrollUserDTO {
  userId: string;
  simulationId: string;
  role: string;
  vertical: string;
}

export interface CreateProjectDTO {
  name: string;
  description: string;
  simulationId: string;
}

export interface QuerySimulationsDTO {
  userId?: string;
  companyId?: string;
  status?: SimulationStatus;
  limit?: number;
  offset?: number;
}
