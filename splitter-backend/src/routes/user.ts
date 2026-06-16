import { Router } from "express";
import type { Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../config/prisma.js";
import { authenticateToken, type AuthRequest } from "../middleware/auth.js";
import {
  hasJsonContentType,
  isStrongPassword,
  PASSWORD_POLICY_MESSAGE,
} from "../utils/validation.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: User
 *   description: User management
 */

/**
 * @swagger
 * /user/update:
 *   patch:
 *     summary: Update user profile (username or password)
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: NewName
 *               password:
 *                 type: string
 *                 example: newStrongPassword123
 *     responses:
 *       200:
 *         description: User data updated
 *       400:
 *         description: No fields to update
 *       415:
 *         description: Invalid Content-Type (application/json required)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.patch(
  "/update",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!hasJsonContentType(req)) {
        return res
          .status(415)
          .json({ error: "Content-Type must be application/json" });
      }
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { username, password } = req.body ?? {};
      if (!username && !password) {
        return res.status(400).json({ error: "Provide username or password" });
      }

      const data: Record<string, unknown> = {};
      if (typeof username === "string" && username.trim()) {
        data.username = username.trim();
      }
      if (typeof password === "string" && password) {
        if (!isStrongPassword(password)) {
          return res.status(400).json({ error: PASSWORD_POLICY_MESSAGE });
        }
        data.password = await bcrypt.hash(password, 10);
      }

      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: "Invalid field values" });
      }

      const updated = await prisma.user
        .update({
          where: { id: req.user.id },
          data,
          select: {
            id: true,
            email: true,
            username: true,
            uniqueId: true,
            avatarUrl: true,
          },
        })
        .catch((e) => {
          if ((e as any)?.code === "P2025") return null; // Prisma: record not found
          throw e;
        });

      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }
      console.log("/user/update success:", { id: updated.id });
      return res.json(updated);
    } catch (err) {
      console.error("/user/update error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }
);

/**
 * @swagger
 * /user/username:
 *   patch:
 *     summary: Update username
 *     description: Change only the username of the current user.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username]
 *             properties:
 *               username:
 *                 type: string
 *                 example: NewName
 *     responses:
 *       200:
 *         description: Username updated
 *       400:
 *         description: Invalid username
 *       415:
 *         description: Invalid Content-Type (application/json required)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.patch(
  "/username",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!hasJsonContentType(req)) {
        return res
          .status(415)
          .json({ error: "Content-Type must be application/json" });
      }
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const { username } = req.body ?? {};
      if (typeof username !== "string") {
        return res.status(400).json({ error: "Username must be a string" });
      }
      const clean = username.trim();
      if (!clean || clean.length < 2 || clean.length > 32) {
        return res
          .status(400)
          .json({ error: "Username must be 2-32 characters" });
      }

      const updated = await prisma.user
        .update({
          where: { id: req.user.id },
          data: { username: clean },
          select: {
            id: true,
            email: true,
            username: true,
            uniqueId: true,
            avatarUrl: true,
          },
        })
        .catch((e) => {
          if ((e as any)?.code === "P2025") return null;
          throw e;
        });

      if (!updated) return res.status(404).json({ error: "User not found" });
      return res.json(updated);
    } catch (err) {
      console.error("/user/username error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }
);

/**
 * @swagger
 * /user/email:
 *   patch:
 *     summary: Update email
 *     description: Change only the email of the current user.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 example: new@example.com
 *     responses:
 *       200:
 *         description: Email updated
 *       400:
 *         description: Invalid email
 *       415:
 *         description: Invalid Content-Type (application/json required)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       409:
 *         description: Email already in use
 */
router.patch(
  "/email",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!hasJsonContentType(req)) {
        return res
          .status(415)
          .json({ error: "Content-Type must be application/json" });
      }
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const { email } = req.body ?? {};
      if (typeof email !== "string") {
        return res.status(400).json({ error: "Email must be a string" });
      }
      const clean = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!clean || !emailRegex.test(clean)) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      try {
        const updated = await prisma.user.update({
          where: { id: req.user.id },
          data: { email: clean },
          select: {
            id: true,
            email: true,
            username: true,
            uniqueId: true,
            avatarUrl: true,
          },
        });
        return res.json(updated);
      } catch (e: any) {
        if (e?.code === "P2002") {
          return res.status(409).json({ error: "Email already in use" });
        }
        if (e?.code === "P2025") {
          return res.status(404).json({ error: "User not found" });
        }
        throw e;
      }
    } catch (err) {
      console.error("/user/email error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }
);

/**
 * @swagger
 * /user/password:
 *   patch:
 *     summary: Update password
 *     description: Change password by providing the current password and a new one.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: oldPass123
 *               newPassword:
 *                 type: string
 *                 example: Aa1!secure
 *                 description: Must be at least 8 characters and include uppercase, lowercase, number, and special character
 *     responses:
 *       200:
 *         description: Password updated
 *       400:
 *         description: Invalid input or wrong current password
 *       415:
 *         description: Invalid Content-Type (application/json required)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.patch(
  "/password",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!hasJsonContentType(req)) {
        return res
          .status(415)
          .json({ error: "Content-Type must be application/json" });
      }
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const { currentPassword, newPassword } = req.body ?? {};
      if (
        typeof currentPassword !== "string" ||
        typeof newPassword !== "string"
      ) {
        return res
          .status(400)
          .json({ error: "Both currentPassword and newPassword are required" });
      }
      if (!isStrongPassword(newPassword)) {
        return res.status(400).json({ error: PASSWORD_POLICY_MESSAGE });
      }

      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const ok = await bcrypt.compare(currentPassword, user.password);
      if (!ok) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      const hashed = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: req.user.id },
        data: { password: hashed },
      });

      return res.json({ success: true });
    } catch (err) {
      console.error("/user/password error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }
);

/**
 * @swagger
 * /user/delete:
 *   delete:
 *     summary: Delete user account
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.delete(
  "/delete",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const deleted = await prisma.user
        .delete({
          where: { id: req.user.id },
          select: { id: true },
        })
        .catch((e) => {
          if ((e as any)?.code === "P2025") return null; // record not found
          throw e;
        });

      if (!deleted) {
        return res.status(404).json({ error: "User not found" });
      }
      console.log("/user/delete success:", { id: req.user.id });
      return res.json({ success: true });
    } catch (err) {
      console.error("/user/delete error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }
);

/**
 * @swagger
 * /user/list:
 *   get:
 *     summary: List users (temporary)
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список пользователей
 */
router.get(
  "/list",
  authenticateToken,
  async (_req: AuthRequest, res: Response) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          username: true,
          uniqueId: true,
          avatarUrl: true,
        },
        orderBy: { id: "asc" },
      });
      console.log("/user/list count:", users.length);
      return res.json(users);
    } catch (err) {
      console.error("/user/list error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }
);

/**
 * @swagger
 * /user/stats:
 *   get:
 *     summary: Get user profile statistics (groups, expenses, friends counts)
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Counts of groups, expenses, and friends
 */
router.get(
  "/stats",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const userId = req.user.id;
      const [groups, expenses, friends] = await Promise.all([
        prisma.groupMember.count({
          where: { userId }
        }),
        prisma.sessionParticipant.count({
          where: { userId }
        }),
        prisma.friendship.count({
          where: {
            OR: [
              { requesterId: userId, status: "ACCEPTED" },
              { receiverId: userId, status: "ACCEPTED" }
            ]
          }
        })
      ]);
      return res.json({ groups, expenses, friends });
    } catch (err) {
      console.error("GET /user/stats error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }
);

/**
 * @swagger
 * /user/insights:
 *   get:
 *     summary: Get AI-powered or rule-based insights based on actual user transactions
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of localized insights
 */
router.get(
  "/insights",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const userId = req.user.id;

      // Fetch user profile and sessions
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { uniqueId: true, username: true } });
      const myUid = user?.uniqueId || "";

      const historyEntries = await prisma.sessionHistoryEntry.findMany({
        where: {
          OR: [
            { creatorId: userId },
            { participantUniqueIds: { has: myUid } },
          ],
        },
        orderBy: { finalizedAt: "desc" },
        take: 10,
      });

      let totalOwe = 0;
      let totalOwed = 0;
      let totalSpent = 0;

      historyEntries.forEach(entry => {
        const payload = entry.payload as any;
        const byParticipant = payload?.totals?.byParticipant || [];
        const grandTotal = entry.grandTotal.toNumber();

        if (entry.creatorId === userId) {
          let othersOwed = 0;
          byParticipant.forEach((p: any) => {
            if (p.uniqueId !== myUid) {
              totalOwed += Number(p.amountOwed || 0);
              othersOwed += Number(p.amountOwed || 0);
            }
          });
          totalSpent += Math.max(0, grandTotal - othersOwed);
        } else {
          const myEntry = byParticipant.find((p: any) => p.uniqueId === myUid);
          if (myEntry) {
            totalOwe += Number(myEntry.amountOwed || 0);
            totalSpent += Number(myEntry.amountOwed || 0);
          }
        }
      });

      const hasGemini = !!process.env.GEMINI_API_KEY;
      if (hasGemini) {
        try {
          const prompt = `You are a financial AI advisor for a bill splitting app. Generate two brief personalized insights in JSON format for the user "${user?.username}".
Current stats of the user:
- Total spent: ${totalSpent} UZS
- Total they owe to others: ${totalOwe} UZS
- Total others owe them: ${totalOwed} UZS
- Recent bills count: ${historyEntries.length}

Response format MUST be strictly:
{
  "insights": [
    {
      "type": "smartSplit" | "savings" | "general",
      "titleUz": "Short Title in Uzbek",
      "descUz": "Insight text in Uzbek referencing their actual stats",
      "titleEn": "Short Title in English",
      "descEn": "Insight text in English referencing their actual stats",
      "titleJa": "Short Title in Japanese",
      "descJa": "Insight text in Japanese referencing their actual stats",
      "variant": "purple" | "teal" | "amber"
    }
  ]
}
Return only JSON. No formatting.`;

          const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY!)}`;
          const body = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
          };
          const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

          if (resp.ok) {
            const raw = await resp.json();
            const text = raw.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const parsed = JSON.parse(text.trim());
            if (parsed.insights && Array.isArray(parsed.insights)) {
              return res.json(parsed.insights);
            }
          }
        } catch (geminiError) {
          console.warn("Gemini insights fallback triggered:", geminiError);
        }
      }

      // High-fidelity fallback based on actual database stats
      const insights = [
        {
          type: "smartSplit",
          titleUz: "Aqlli taqsimot tavsiyasi",
          descUz: totalOwed > 0 
            ? `Do'stlaringizdan ${totalOwed.toLocaleString()} UZS qaytarib olishingiz kerak. Qarz hisob-kitobini tezlashtirish uchun ularga havola yuboring.`
            : "Sizda faol qarzdorliklar yo'q. Guruh xarajatlarini teng bo'lish uchun do'stlaringizni taklif qiling.",
          titleEn: "Smart Split Recommendation",
          descEn: totalOwed > 0
            ? `You need to collect ${totalOwed.toLocaleString()} UZS from friends. Send a reminder link to settle debts.`
            : "No active debts to collect. Invite friends to start splitting group expenses.",
          titleJa: "スマート分割の推奨事項",
          descJa: totalOwed > 0
            ? `友だちから ${totalOwed.toLocaleString()} UZS を回収する必要があります。リンクを送信して精算してください。`
            : "アクティブな売掛金はありません。友だちを招待してグループ分割を始めましょう。",
          variant: "purple"
        },
        {
          type: "savings",
          titleUz: "Xarajatlar nazorati",
          descUz: totalSpent > 0
            ? `Sizning jami xarajatlaringiz ${totalSpent.toLocaleString()} UZS ga yetdi. Buni osonroq boshqarish uchun guruh tahlillaridan foydalaning.`
            : "Hali xarajatlar tahlili mavjud emas. Chekni skanerlash orqali birinchi xarajatni qo'shing.",
          titleEn: "Savings Tracker",
          descEn: totalSpent > 0
            ? `Your total split expenses reached ${totalSpent.toLocaleString()} UZS. Monitor group analytics to optimize your budget.`
            : "No expenses tracked yet. Try scanning a receipt to add your first bill.",
          titleJa: "貯蓄トラッカー",
          descJa: totalSpent > 0
            ? `合計分割費用は ${totalSpent.toLocaleString()} UZS に達しました。予算を最適化するためにグループ分析を監視してください。`
            : "まだ追跡された費用はありません。レシートをスキャンして最初の請求書を追加してください。",
          variant: "teal"
        }
      ];

      return res.json(insights);
    } catch (err) {
      console.error("GET /user/insights error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }
);

export default router;
