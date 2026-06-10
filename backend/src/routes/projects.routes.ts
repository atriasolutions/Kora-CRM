import { Router } from 'express'

import { hasElevatedTenantScope } from '../lib/access-profile-admin.js'
import { getAuditActor, getAuthProfile } from '../middleware/audit-actor.js'
import { requirePermission } from '../middleware/require-permission.js'
import { routeParam } from '../lib/route-params.js'
import {
  assertProjectTeamAccess,
} from '../repositories/projects.repository.js'
import * as projectsRepo from '../repositories/projects.repository.js'
import * as projectWorkPlanRepo from '../repositories/project-work-plan.repository.js'
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from '../types/project.js'
import {
  createProjectSchema,
  listProjectsQuerySchema,
  projectWorkPlanSchema,
  updateProjectSchema,
} from '../validators/project.validator.js'

export const projectsRouter = Router()

projectsRouter.get(
  '/',
  requirePermission('proyectos', 'view'),
  async (req, res, next) => {
    try {
      const query = listProjectsQuerySchema.parse(req.query)
      const profile = getAuthProfile(req)
      const actor = getAuditActor(req)
      const result = await projectsRepo.listProjects({
        page: query.page,
        pageSize: query.pageSize,
        q: query.q,
        status: query.status,
        opportunityId: query.opportunityId,
        solicitudId: query.solicitudId,
        companyId: query.companyId,
        archivedOnly: query.archived === true,
        memberAccess: hasElevatedTenantScope(profile)
          ? undefined
          : { userId: actor.userId, userName: actor.userName },
      })
      res.json({
        data: result.items,
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / query.pageSize) || 1,
        },
      })
    } catch (e) {
      next(e)
    }
  },
)

projectsRouter.get(
  '/:id',
  requirePermission('proyectos', 'view'),
  async (req, res, next) => {
    try {
      const profile = getAuthProfile(req)
      const item = await projectsRepo.getProjectById(routeParam(req))
      if (!hasElevatedTenantScope(profile)) {
        assertProjectTeamAccess(item.manager, item.team, getAuditActor(req))
      }
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

projectsRouter.post(
  '/',
  requirePermission('proyectos', 'create'),
  async (req, res, next) => {
    try {
      const body = createProjectSchema.parse(req.body) as CreateProjectInput
      const item = await projectsRepo.createProject(body, getAuditActor(req))
      res.status(201).json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

projectsRouter.get(
  '/:id/work-plan',
  requirePermission('proyectos', 'view'),
  async (req, res, next) => {
    try {
      const profile = getAuthProfile(req)
      const id = routeParam(req)
      if (!hasElevatedTenantScope(profile)) {
        const project = await projectsRepo.getProjectById(id)
        assertProjectTeamAccess(project.manager, project.team, getAuditActor(req))
      }
      const plan = await projectWorkPlanRepo.getProjectWorkPlan(id)
      res.json({ data: plan })
    } catch (e) {
      next(e)
    }
  },
)

projectsRouter.put(
  '/:id/work-plan',
  requirePermission('proyectos', 'edit'),
  async (req, res, next) => {
    try {
      const body = projectWorkPlanSchema.parse(req.body)
      const plan = await projectWorkPlanRepo.saveProjectWorkPlan(
        routeParam(req),
        body,
        getAuditActor(req),
      )
      res.json({ data: plan })
    } catch (e) {
      next(e)
    }
  },
)

projectsRouter.patch(
  '/:id',
  requirePermission('proyectos', 'edit'),
  async (req, res, next) => {
    try {
      const body = updateProjectSchema.parse(req.body) as UpdateProjectInput
      const item = await projectsRepo.updateProject(
        routeParam(req),
        body,
        getAuditActor(req),
      )
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

projectsRouter.post(
  '/:id/archive',
  requirePermission('proyectos', 'delete'),
  async (req, res, next) => {
    try {
      const item = await projectsRepo.archiveProject(
        routeParam(req),
        getAuditActor(req),
      )
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

projectsRouter.post(
  '/:id/restore',
  requirePermission('proyectos', 'delete'),
  async (req, res, next) => {
    try {
      const item = await projectsRepo.restoreProject(
        routeParam(req),
        getAuditActor(req),
      )
      res.json({ data: item })
    } catch (e) {
      next(e)
    }
  },
)

projectsRouter.delete(
  '/:id',
  requirePermission('proyectos', 'delete'),
  async (req, res, next) => {
    try {
      await projectsRepo.permanentlyDeleteProject(routeParam(req))
      res.status(204).send()
    } catch (e) {
      next(e)
    }
  },
)
