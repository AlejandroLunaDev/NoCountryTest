import prisma from '../../../../config/prisma';
import { IEnrollmentService } from '../../interfaces/IEnrollmentService';
import { EnrollUserDTO, UserSkillDTO } from '../../types';
import { ProficiencyLevel, SkillCategory } from '@prisma/client';

class EnrollmentService implements IEnrollmentService {
  async enrollUser(data: EnrollUserDTO) {
    const { userId, simulationId, role, vertical, experienceYears, skills } =
      data;

    // Actualizar información técnica del usuario si se proporciona
    if (experienceYears !== undefined || skills?.length) {
      const updateData: any = {};

      if (experienceYears !== undefined) {
        updateData.experienceYears = experienceYears;
      }

      if (role) {
        updateData.profileType = role; // Usar rol como tipo de perfil
      }

      // Actualizar usuario
      await prisma.user.update({
        where: { id: userId },
        data: updateData
      });

      // Agregar o actualizar habilidades técnicas
      if (skills?.length) {
        await this.updateUserSkills(userId, skills);
      }
    }

    // Inscribir al usuario en la simulación
    return prisma.userSimulation.create({
      data: {
        userId,
        simulationId,
        role,
        vertical
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            profileType: true,
            experienceYears: true,
            userSkills: {
              include: {
                skill: true
              }
            }
          }
        },
        simulation: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true
          }
        }
      }
    });
  }

  async getUsersBySimulationId(simulationId: string) {
    return prisma.userSimulation.findMany({
      where: {
        simulationId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
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
    });
  }

  async getSimulationsByUserId(userId: string) {
    return prisma.userSimulation.findMany({
      where: {
        userId
      },
      include: {
        simulation: true
      }
    });
  }

  // Método auxiliar para agregar o actualizar habilidades técnicas
  private async updateUserSkills(userId: string, skills: UserSkillDTO[]) {
    for (const skillData of skills) {
      let skillId = skillData.skillId;

      // Si no se proporcionó ID de skill pero sí nombre y categoría
      if (!skillId && skillData.skillName) {
        // Buscar o crear skill
        const skill = await prisma.skill.upsert({
          where: {
            name_category: {
              name: skillData.skillName,
              category: skillData.category
            }
          },
          update: {},
          create: {
            name: skillData.skillName,
            category: skillData.category
          }
        });

        skillId = skill.id;
      }

      if (skillId) {
        // Verificar si ya existe esta relación usuario-skill
        const existingUserSkill = await prisma.userSkill.findUnique({
          where: {
            userId_skillId: {
              userId,
              skillId
            }
          }
        });

        if (existingUserSkill) {
          // Actualizar si ya existe
          await prisma.userSkill.update({
            where: {
              id: existingUserSkill.id
            },
            data: {
              proficiencyLevel: skillData.proficiencyLevel,
              yearsOfExperience: skillData.yearsOfExperience,
              isMainSkill: skillData.isMainSkill
            }
          });
        } else {
          // Crear nueva relación
          await prisma.userSkill.create({
            data: {
              userId,
              skillId,
              proficiencyLevel: skillData.proficiencyLevel,
              yearsOfExperience: skillData.yearsOfExperience,
              isMainSkill: skillData.isMainSkill || false
            }
          });
        }
      }
    }
  }
}

export const enrollmentService = new EnrollmentService();
