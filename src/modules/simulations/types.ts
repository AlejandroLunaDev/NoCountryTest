import {
  SimulationType,
  SimulationStatus,
  ProjectType,
  SkillCategory,
  ProficiencyLevel
} from '@prisma/client';

export interface CreateSimulationDTO {
  name: string;
  description?: string;
  type: SimulationType;
  startDate: Date;
  endDate: Date;
  status: SimulationStatus;
  companyId?: string; // ID de la empresa si es una simulación tipo COMPANY
}

export interface UserSkillDTO {
  skillId?: string;
  skillName?: string;
  category: SkillCategory;
  proficiencyLevel: ProficiencyLevel;
  yearsOfExperience?: number;
  isMainSkill?: boolean;
}

export interface EnrollUserDTO {
  userId: string;
  simulationId: string;
  role: string;
  vertical: string;
  experienceYears?: number;
  skills?: UserSkillDTO[];
}

export interface CreateProjectDTO {
  name: string;
  description: string;
  simulationId: string;
  projectType: ProjectType;
  companyId?: string;
  requirements?: string;
  scope?: string;
  resources?: any; // Recursos en formato JSON
}

export interface CreateScheduleDTO {
  simulationId: string;
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  theme?: string;
  objectives?: string;
  tasks?: CreateTaskDTO[];
  meetings?: CreateMeetingDTO[];
  deliverables?: CreateDeliverableDTO[];
}

export interface CreateTaskDTO {
  title: string;
  description: string;
  dueDate: Date;
  assignedRoles: string[];
}

export interface CreateMeetingDTO {
  title: string;
  description?: string;
  dateTime: Date;
  duration: number;
  isRequired?: boolean;
}

export interface CreateDeliverableDTO {
  title: string;
  description: string;
  dueDate: Date;
  assignedRoles: string[];
}

export interface QuerySimulationsDTO {
  userId?: string;
  companyId?: string;
  status?: SimulationStatus;
  limit?: number;
  offset?: number;
}

export interface CloseSimulationDTO {
  simulationId: string;
  conclusions?: string;
  metrics?: Record<string, any>;
}

export interface CreateTeamDTO {
  projectId: string;
  name: string;
  members: { userId: string; role: string }[];
}

export interface TeamMatchingCriteria {
  projectId: string;
  requiredRoles: {
    role: string;
    count: number;
    requiredSkills?: {
      category: SkillCategory;
      minProficiencyLevel?: ProficiencyLevel;
    }[];
  }[];
  balanceExperience?: boolean; // Si debe balancear experiencia entre equipo
  preferSameVertical?: boolean; // Si debe preferir usuarios de la misma vertical
}
