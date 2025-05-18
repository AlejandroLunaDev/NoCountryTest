import prisma from '../../../../config/prisma';
import {
  IMatchingService,
  MatchingResult
} from '../../interfaces/IMatchingService';
import { TeamMatchingCriteria } from '../../types';
import { ProficiencyLevel, SkillCategory } from '@prisma/client';

class MatchingService implements IMatchingService {
  async generateTeamMatch(
    simulationId: string,
    criteria: TeamMatchingCriteria
  ): Promise<MatchingResult> {
    // Obtener todos los usuarios de la simulación
    const simulationUsers = await prisma.userSimulation.findMany({
      where: {
        simulationId,
        // Filtrar usuarios que no estén ya asignados al proyecto
        NOT: {
          user: {
            projectTeams: {
              some: {
                team: {
                  projectId: criteria.projectId
                }
              }
            }
          }
        }
      },
      include: {
        user: {
          include: {
            userSkills: {
              include: {
                skill: true
              }
            }
          }
        }
      }
    });

    // Obtener el proyecto
    const project = await prisma.project.findUnique({
      where: { id: criteria.projectId }
    });

    if (!project) {
      throw new Error('Proyecto no encontrado');
    }

    // Crear un equipo nuevo
    const team = await prisma.projectTeam.create({
      data: {
        projectId: criteria.projectId,
        name: `Equipo Automático - ${new Date().toISOString().slice(0, 10)}`
      }
    });

    // Resultado de la asignación
    const matchResult: MatchingResult = {
      teamId: team.id,
      assignedUsers: [],
      unassignedRoles: []
    };

    // Para cada rol requerido
    for (const requiredRole of criteria.requiredRoles) {
      const { role, count, requiredSkills } = requiredRole;
      let assignedCount = 0;

      // Filtrar usuarios con el perfil adecuado
      const eligibleUsers = simulationUsers.filter(
        su => su.user.profileType === role || su.role === role
      );

      // Ordenar usuarios por compatibilidad
      const scoredUsers = eligibleUsers.map(su => {
        // Calcular puntuación por habilidades
        let skillScore = 0;
        let matchDetail = '';

        if (requiredSkills && requiredSkills.length > 0) {
          // Si hay habilidades requeridas, calcular coincidencia
          const userSkills = su.user.userSkills;

          for (const reqSkill of requiredSkills) {
            const matchingSkill = userSkills.find(
              us =>
                us.skill.category === reqSkill.category &&
                this.isProficiencyLevelSufficient(
                  us.proficiencyLevel,
                  reqSkill.minProficiencyLevel
                )
            );

            if (matchingSkill) {
              // Dar puntos según nivel de competencia
              const proficiencyPoints = this.getProficiencyPoints(
                matchingSkill.proficiencyLevel
              );
              skillScore += proficiencyPoints;
              matchDetail += `${matchingSkill.skill.name}(${matchingSkill.proficiencyLevel}), `;
            }
          }
        } else {
          // Sin habilidades específicas, usar experiencia general
          skillScore = (su.user.experienceYears || 1) * 10;
          matchDetail = `${su.user.experienceYears || 0} años de experiencia`;
        }

        // Preferencia por misma vertical si está configurado
        if (criteria.preferSameVertical && su.vertical === 'web') {
          skillScore += 15;
          matchDetail += 'Especialista en vertical web, ';
        }

        return {
          user: su.user,
          score: skillScore,
          matchDetail: matchDetail.trim()
        };
      });

      // Ordenar por puntuación
      scoredUsers.sort((a, b) => b.score - a.score);

      // Asignar los mejores usuarios para este rol
      for (let i = 0; i < Math.min(count, scoredUsers.length); i++) {
        const userToAssign = scoredUsers[i];

        // Crear miembro del equipo
        await prisma.projectTeamMember.create({
          data: {
            teamId: team.id,
            userId: userToAssign.user.id,
            role
          }
        });

        // Agregar al resultado
        matchResult.assignedUsers.push({
          userId: userToAssign.user.id,
          role,
          matchScore: userToAssign.score,
          matchReason: userToAssign.matchDetail
        });

        assignedCount++;

        // Eliminar usuario de la lista de disponibles
        const index = simulationUsers.findIndex(
          su => su.user.id === userToAssign.user.id
        );
        if (index !== -1) {
          simulationUsers.splice(index, 1);
        }
      }

      // Si no se asignaron todos los usuarios necesarios
      if (assignedCount < count) {
        matchResult.unassignedRoles.push({
          role,
          count: count - assignedCount,
          reason: 'No hay suficientes usuarios disponibles con este perfil'
        });
      }
    }

    // Aplicar equilibrio de experiencia si está configurado
    if (criteria.balanceExperience && matchResult.assignedUsers.length > 0) {
      await this.balanceTeamExperience(team.id, matchResult.assignedUsers);
    }

    return matchResult;
  }

  async suggestUsersForRole(
    simulationId: string,
    role: string,
    requiredSkills?: {
      category: string;
      minProficiencyLevel?: string;
    }[]
  ): Promise<any[]> {
    // Obtener usuarios de la simulación
    const users = await prisma.userSimulation.findMany({
      where: {
        simulationId,
        OR: [{ role }, { user: { profileType: role } }]
      },
      include: {
        user: {
          include: {
            userSkills: {
              include: {
                skill: true
              }
            }
          }
        }
      }
    });

    // Si no hay habilidades requeridas, solo devolver los usuarios
    if (!requiredSkills || requiredSkills.length === 0) {
      return users.map(u => ({
        id: u.user.id,
        name: u.user.name,
        profileType: u.user.profileType,
        experienceYears: u.user.experienceYears,
        score: 100 // Puntuación máxima sin requisitos específicos
      }));
    }

    // Calcular puntuación para cada usuario
    return users
      .map(u => {
        let score = 0;
        const skillMatches: Record<string, boolean> = {};
        const userSkills = u.user.userSkills;

        // Para cada habilidad requerida
        for (const reqSkill of requiredSkills) {
          const category = reqSkill.category as SkillCategory;
          const minLevel = reqSkill.minProficiencyLevel as
            | ProficiencyLevel
            | undefined;

          // Buscar habilidades que coincidan
          const matchingSkills = userSkills.filter(
            us =>
              us.skill.category === category &&
              this.isProficiencyLevelSufficient(us.proficiencyLevel, minLevel)
          );

          if (matchingSkills.length > 0) {
            // Usar la habilidad con mayor nivel
            const bestSkill = matchingSkills.reduce(
              (prev, current) =>
                this.getProficiencyPoints(current.proficiencyLevel) >
                this.getProficiencyPoints(prev.proficiencyLevel)
                  ? current
                  : prev,
              matchingSkills[0]
            );

            score += this.getProficiencyPoints(bestSkill.proficiencyLevel);
            skillMatches[category] = true;
          } else {
            skillMatches[category] = false;
          }
        }

        // Normalizar la puntuación al máximo posible
        const maxPossibleScore = requiredSkills.length * 100;
        const normalizedScore = Math.round((score / maxPossibleScore) * 100);

        return {
          id: u.user.id,
          name: u.user.name,
          profileType: u.user.profileType,
          experienceYears: u.user.experienceYears,
          score: normalizedScore,
          skillMatches
        };
      })
      .sort((a, b) => b.score - a.score); // Ordenar por puntuación
  }

  async calculateUserProjectCompatibility(
    userId: string,
    projectId: string
  ): Promise<{ score: number; compatibility: Record<string, number> }> {
    // Obtener usuario con sus habilidades
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userSkills: {
          include: {
            skill: true
          }
        }
      }
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Obtener proyecto
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      throw new Error('Proyecto no encontrado');
    }

    // Extraer requisitos del proyecto (asumiendo que están en formato JSON)
    const projectRequirements = project.requirements
      ? this.parseRequirements(project.requirements)
      : [];

    // Si no hay requisitos, devolver compatibilidad neutral
    if (projectRequirements.length === 0) {
      return {
        score: 50, // Compatibilidad neutral
        compatibility: {
          general: 50
        }
      };
    }

    // Calcular compatibilidad por categoría
    const compatibility: Record<string, number> = {};
    let totalScore = 0;
    let categoryCount = 0;

    for (const category of Object.values(SkillCategory)) {
      // Buscar requisitos para esta categoría
      const categoryRequirements = projectRequirements.filter(
        req => req.category === category
      );

      if (categoryRequirements.length === 0) continue;

      // Buscar habilidades del usuario en esta categoría
      const userSkillsInCategory = user.userSkills.filter(
        us => us.skill.category === category
      );

      // Si no tiene habilidades en esta categoría pero se requiere
      if (userSkillsInCategory.length === 0) {
        compatibility[category] = 0;
        totalScore += 0;
        categoryCount++;
        continue;
      }

      // Calcular puntuación para esta categoría
      let categoryScore = 0;
      for (const req of categoryRequirements) {
        const matchingSkills = userSkillsInCategory.filter(us => {
          if (
            req.skillName &&
            us.skill.name.toLowerCase().includes(req.skillName.toLowerCase())
          ) {
            return this.isProficiencyLevelSufficient(
              us.proficiencyLevel,
              req.minLevel
            );
          }
          return false;
        });

        if (matchingSkills.length > 0) {
          const bestMatch = matchingSkills.reduce(
            (prev, current) =>
              this.getProficiencyPoints(current.proficiencyLevel) >
              this.getProficiencyPoints(prev.proficiencyLevel)
                ? current
                : prev,
            matchingSkills[0]
          );

          categoryScore += this.getProficiencyPoints(
            bestMatch.proficiencyLevel
          );
        }
      }

      // Normalizar puntuación
      const maxPossibleCategoryScore = categoryRequirements.length * 100;
      const normalizedCategoryScore = Math.round(
        (categoryScore / maxPossibleCategoryScore) * 100
      );

      compatibility[category] = normalizedCategoryScore;
      totalScore += normalizedCategoryScore;
      categoryCount++;
    }

    // Puntuación global
    const overallScore =
      categoryCount > 0 ? Math.round(totalScore / categoryCount) : 50;

    return {
      score: overallScore,
      compatibility
    };
  }

  // Métodos auxiliares
  private isProficiencyLevelSufficient(
    userLevel: ProficiencyLevel,
    requiredLevel?: ProficiencyLevel
  ): boolean {
    if (!requiredLevel) return true;

    const levels = {
      [ProficiencyLevel.BEGINNER]: 1,
      [ProficiencyLevel.INTERMEDIATE]: 2,
      [ProficiencyLevel.ADVANCED]: 3,
      [ProficiencyLevel.EXPERT]: 4
    };

    return levels[userLevel] >= levels[requiredLevel];
  }

  private getProficiencyPoints(level: ProficiencyLevel): number {
    const points = {
      [ProficiencyLevel.BEGINNER]: 25,
      [ProficiencyLevel.INTERMEDIATE]: 50,
      [ProficiencyLevel.ADVANCED]: 75,
      [ProficiencyLevel.EXPERT]: 100
    };

    return points[level];
  }

  private parseRequirements(requirements: string): Array<{
    category: SkillCategory;
    skillName?: string;
    minLevel?: ProficiencyLevel;
  }> {
    try {
      // Intentar parsear como JSON
      return JSON.parse(requirements);
    } catch (e) {
      // Si no es JSON, intentar extraer información básica
      const result = [];
      const lines = requirements.split('\n');

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // Buscar menciones de categorías conocidas
        for (const category of Object.values(SkillCategory)) {
          if (trimmedLine.toUpperCase().includes(category)) {
            result.push({ category });
            break;
          }
        }
      }

      return result;
    }
  }

  private async balanceTeamExperience(
    teamId: string,
    assignedUsers: any[]
  ): Promise<void> {
    // Implementar lógica para equilibrar experiencia si es necesario
    // Potencialmente reasignar roles o sugerir cambios
  }
}

export const matchingService = new MatchingService();
