import { CreateTeamDTO } from '../types';

export interface ITeamService {
  createTeam(data: CreateTeamDTO): Promise<any>;
  getTeamById(id: string): Promise<any>;
  getTeamsByProjectId(projectId: string): Promise<any>;
}
