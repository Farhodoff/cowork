import { Router } from "express";
import type { Response } from "express";
import { prisma } from "../config/prisma.js";
import { authenticateToken, type AuthRequest } from "../middleware/auth.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Group expense analytics
 */

/**
 * @swagger
 * /analytics/group/{groupId}:
 *   get:
 *     summary: Get expense analytics for a group
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: Group analytics
 */
router.get(
  "/group/:groupId",
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
        select: { ownerId: true, name: true },
      });
      if (!membership && group?.ownerId !== req.user.id) {
        return res.status(403).json({ error: "Not a member of this group" });
      }

      // Get all finalized sessions for this group
      const sessions = await prisma.session.findMany({
        where: { groupId },
        select: { id: true },
      });
      const sessionIds = sessions.map((s) => s.id);

      if (sessionIds.length === 0) {
        return res.json({
          groupName: group?.name || "Group",
          totalExpense: 0,
          currency: "UZS",
          sessionsCount: 0,
          byMember: [],
          byMonth: [],
        });
      }

      // Get history entries for these sessions
      const historyEntries = await prisma.sessionHistoryEntry.findMany({
        where: { sessionId: { in: sessionIds } },
        orderBy: { finalizedAt: "asc" },
      });

      let totalExpense = 0;
      let currency = "UZS";
      const memberTotals = new Map<string, { username: string; total: number }>();
      const monthTotals = new Map<string, number>();

      for (const entry of historyEntries) {
        const gt = entry.grandTotal.toNumber();
        totalExpense += gt;
        if (entry.currency && entry.currency !== "UNKNOWN") {
          currency = entry.currency;
        }

        // Monthly aggregation
        const monthKey = `${entry.finalizedAt.getFullYear()}-${String(entry.finalizedAt.getMonth() + 1).padStart(2, "0")}`;
        monthTotals.set(monthKey, (monthTotals.get(monthKey) || 0) + gt);

        // Per-member aggregation from payload
        const payload = entry.payload as any;
        if (payload?.totals?.byParticipant) {
          for (const p of payload.totals.byParticipant) {
            const uid = p.uniqueId || p.participantId;
            if (!uid) continue;
            const existing = memberTotals.get(uid);
            const amount = Number(p.amountOwed ?? p.total ?? 0);
            if (existing) {
              existing.total += amount;
            } else {
              memberTotals.set(uid, {
                username: p.username || uid,
                total: amount,
              });
            }
          }
        }
      }

      const byMember = Array.from(memberTotals.entries())
        .map(([uniqueId, data]) => ({
          uniqueId,
          username: data.username,
          total: Math.round(data.total * 100) / 100,
        }))
        .sort((a, b) => b.total - a.total);

      const byMonth = Array.from(monthTotals.entries())
        .map(([month, total]) => ({
          month,
          total: Math.round(total * 100) / 100,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      return res.json({
        groupName: group?.name || "Group",
        totalExpense: Math.round(totalExpense * 100) / 100,
        currency,
        sessionsCount: historyEntries.length,
        byMember,
        byMonth,
      });
    } catch (err) {
      console.error("GET /analytics/group/:groupId error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }
);

/**
 * @swagger
 * /analytics/personal:
 *   get:
 *     summary: Get personal expense analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Personal analytics
 */
router.get(
  "/personal",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { uniqueId: true },
      });
      if (!user) return res.status(404).json({ error: "User not found" });

      const entries = await prisma.sessionHistoryEntry.findMany({
        where: {
          OR: [
            { creatorId: req.user.id },
            { participantUniqueIds: { has: user.uniqueId } },
          ],
        },
        orderBy: { finalizedAt: "asc" },
      });

      let totalExpense = 0;
      let currency = "UZS";
      const monthTotals = new Map<string, number>();

      for (const entry of entries) {
        if (entry.currency && entry.currency !== "UNKNOWN") {
          currency = entry.currency;
        }

        const payload = entry.payload as any;
        if (payload?.totals?.byParticipant) {
          for (const p of payload.totals.byParticipant) {
            const uid = p.uniqueId || p.participantId;
            if (uid === user.uniqueId) {
              const amount = Number(p.amountOwed ?? p.total ?? 0);
              totalExpense += amount;

              const monthKey = `${entry.finalizedAt.getFullYear()}-${String(entry.finalizedAt.getMonth() + 1).padStart(2, "0")}`;
              monthTotals.set(monthKey, (monthTotals.get(monthKey) || 0) + amount);
            }
          }
        }
      }

      const byMonth = Array.from(monthTotals.entries())
        .map(([month, total]) => ({
          month,
          total: Math.round(total * 100) / 100,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      return res.json({
        totalExpense: Math.round(totalExpense * 100) / 100,
        currency,
        sessionsCount: entries.length,
        byMonth,
      });
    } catch (err) {
      console.error("GET /analytics/personal error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }
);

export default router;
