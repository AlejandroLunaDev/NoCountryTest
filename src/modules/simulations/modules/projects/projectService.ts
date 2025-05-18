import prisma from '../../../../config/prisma';
import { IProjectService } from '../../interfaces/IProjectService';
import { CreateProjectDTO } from '../../types';

class ProjectService implements IProjectService {
  async createProject(data: CreateProjectDTO) {
    const {
      name,
      description,
      simulationId,
      projectType,
      companyId,
      requirements,
      scope,
      resources
    } = data;

    return prisma.project.create({
      data: {
        name,
        description,
        simulationId,
        projectType,
        companyId,
        requirements,
        scope,
        resources: resources || undefined
      },
      include: {
        simulation: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    });
  }

  async getProjectById(id: string) {
    return prisma.project.findUnique({
      where: { id },
      include: {
        simulation: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        teams: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    profileType: true
                  }
                }
              }
            }
          }
        }
      }
    });
  }

  async getProjectsBySimulationId(simulationId: string) {
    return prisma.project.findMany({
      where: {
        simulationId
      },
      include: {
        teams: {
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                members: true
              }
            }
          }
        }
      }
    });
  }

  async updateProject(id: string, data: Partial<CreateProjectDTO>) {
    const {
      name,
      description,
      projectType,
      companyId,
      requirements,
      scope,
      resources
    } = data;

    return prisma.project.update({
      where: { id },
      data: {
        name,
        description,
        projectType,
        companyId,
        requirements,
        scope,
        resources: resources || undefined
      }
    });
  }
}

export const projectService = new ProjectService();
