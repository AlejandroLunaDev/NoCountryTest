import { CreateProjectDTO } from '../types';

export interface IProjectService {
  createProject(data: CreateProjectDTO): Promise<any>;
  getProjectById(id: string): Promise<any>;
  getProjectsBySimulationId(simulationId: string): Promise<any>;
}
