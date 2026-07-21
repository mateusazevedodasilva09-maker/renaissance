/**
 * Domaine AGENDA — tâches personnelles de l'admin / des coachs.
 */
import prisma from "@/lib/prisma";
import { ApiError } from "@/lib/api";

export function listTasks({ assigneeId, status, from, to } = {}) {
  return prisma.task.findMany({
    where: {
      ...(assigneeId && { assigneeId }),
      ...(status && { status }),
      ...((from || to) && {
        dueAt: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
    },
    include: { assignee: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
  });
}

/** progress : null = tâche normale, 0-100 = tâche progressive. */
function normalizeProgress(progress) {
  if (progress === null || progress === "" || progress === undefined) return null;
  const n = Math.max(0, Math.min(100, Number(progress)));
  if (Number.isNaN(n)) throw new ApiError("Progression invalide (0 à 100).");
  return Math.round(n);
}

export function createTask({ title, description, dueAt, assigneeId, category, priority, progress, createdById }) {
  if (!title?.trim()) throw new ApiError("Le titre est requis.");
  return prisma.task.create({
    data: {
      title: title.trim(),
      description,
      dueAt: dueAt ? new Date(dueAt) : null,
      assigneeId: assigneeId || createdById,
      category: category?.trim() || null,
      priority: priority || "NORMAL",
      progress: normalizeProgress(progress),
      createdById,
    },
  });
}

export function updateTask(id, { title, description, dueAt, status, assigneeId, category, priority, progress }) {
  return prisma.task.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(dueAt !== undefined && { dueAt: dueAt ? new Date(dueAt) : null }),
      ...(assigneeId !== undefined && { assigneeId }),
      ...(category !== undefined && { category: category?.trim() || null }),
      ...(priority !== undefined && { priority }),
      ...(progress !== undefined && { progress: normalizeProgress(progress) }),
      ...(status !== undefined && {
        status,
        completedAt: status === "DONE" ? new Date() : null,
      }),
    },
  });
}

export function deleteTask(id) {
  return prisma.task.delete({ where: { id } });
}
