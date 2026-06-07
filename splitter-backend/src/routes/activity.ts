import { Router } from "express";
import type { Response } from "express";
import { prisma } from "../config/prisma.js";
import { authenticateToken, type AuthRequest } from "../middleware/auth.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Activity
 *   description: Group activity feed
 */

/**
 * @swagger
 * /groups/{groupId}/activity:
 *   get:
 *     summary: Get activity feed for a group
 *     tags: [Activity]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         schema:
 *           type: integer
 *         required: true
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Activity feed entries
 */
router.get(
  "/:groupId/activity",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const groupId = Number(req.params.groupId);
      if (!Number.isFinite(groupId)) {
        return res.status(400).json({ error: "Invalid groupId" });
      }

      // Check user is member or owner of group
      const membership = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId: req.user.id } },
      });
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        select: { ownerId: true },
      });
      if (!membership && group?.ownerId !== req.user.id) {
        return res.status(403).json({ error: "Not a member of this group" });
      }

      const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
      const offset = Math.max(Number(req.query.offset) || 0, 0);

      const [activities, total] = await Promise.all([
        prisma.groupActivity.findMany({
          where: { groupId },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
          include: {
            actor: {
              select: { id: true, username: true, uniqueId: true, avatarUrl: true },
            },
          },
        }),
        prisma.groupActivity.count({ where: { groupId } }),
      ]);

      const entries = activities.map((a) => ({
        id: a.id,
        type: a.type,
        metadata: a.metadata,
        createdAt: a.createdAt.toISOString(),
        actor: {
          username: a.actor.username,
          uniqueId: a.actor.uniqueId,
          avatarUrl: a.actor.avatarUrl,
        },
      }));

      return res.json({ total, limit, offset, entries });
    } catch (err) {
      console.error("GET /groups/:groupId/activity error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }
);

export default router;
