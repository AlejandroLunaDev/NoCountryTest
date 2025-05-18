import { SimulationStatus } from '@prisma/client';
import {
  CreateSimulationDTO,
  QuerySimulationsDTO,
  CloseSimulationDTO
} from '../types';

export interface ISimulationService {
  createSimulation(data: CreateSimulationDTO): Promise<any>;
  getSimulationById(id: string): Promise<any>;
  getSimulations(query: QuerySimulationsDTO): Promise<any>;
  updateSimulationStatus(id: string, status: SimulationStatus): Promise<any>;
  closeSimulation(id: string, data?: CloseSimulationDTO): Promise<any>;
}
