import prisma from '../../../../config/prisma';
import { ITeamService } from '../../interfaces/ITeamService';
import { CreateTeamDTO } from '../../types';

class TeamService implements ITeamService {
  async createTeam(data: CreateTeamDTO) {
    const { projectId, name, members } = data;

    // Crear el equipo
    const team = await prisma.projectTeam.create({
      data: {
        projectId,
        name
      }
    });

    // Agregar miembros al equipo
    for (const member of members) {
      await prisma.projectTeamMember.create({
        data: {
          teamId: team.id,
          userId: member.userId,
          role: member.role
        }
      });
    }

    return this.getTeamById(team.id);
  }

  async getTeamById(id: string) {
    return prisma.projectTeam.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                profileType: true,
                experienceYears: true,
                userSkills: {
                  include: {
                    skill: true
                  }
                }
              }
            }
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            projectType: true,
            simulation: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });
  }

  async getTeamsByProjectId(projectId: string) {
    return prisma.projectTeam.findMany({
      where: {
        projectId
      },
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
    });
  }

  async addTeamMember(teamId: string, userId: string, role: string) {
    return prisma.projectTeamMember.create({
      data: {
        teamId,
        userId,
        role
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profileType: true
          }
        }
      }
    });
  }

  async removeTeamMember(teamId: string, userId: string) {
    return prisma.projectTeamMember.deleteMany({
      where: {
        teamId,
        userId
      }
    });
  }
}

export const teamService = new TeamService();
