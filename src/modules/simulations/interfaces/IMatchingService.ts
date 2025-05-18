import { TeamMatchingCriteria } from '../types';

export interface MatchingResult {
  teamId: string;
  assignedUsers: {
    userId: string;
    role: string;
    matchScore: number; // 0-100 qué tan bien coincide con los requerimientos
    matchReason: string; // Explicación de por qué se asignó
  }[];
  unassignedRoles: {
    role: string;
    count: number;
    reason: string; // Razón por la que no se pudo asignar
  }[];
}

export interface IMatchingService {
  // Generar un equipo basado en las habilidades y requisitos
  generateTeamMatch(
    simulationId: string,
    criteria: TeamMatchingCriteria
  ): Promise<MatchingResult>;

  // Sugerir usuarios para un rol específico
  suggestUsersForRole(
    simulationId: string,
    role: string,
    requiredSkills?: {
      category: string;
      minProficiencyLevel?: string;
    }[]
  ): Promise<any[]>;

  // Calcular la compatibilidad de un usuario con un proyecto
  calculateUserProjectCompatibility(
    userId: string,
    projectId: string
  ): Promise<{ score: number; compatibility: Record<string, number> }>;
}
