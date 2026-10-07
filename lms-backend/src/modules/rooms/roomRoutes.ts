import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { validateBody } from "../../middleware/validate";
import { auditAction } from "../../middleware/audit";
import { ApiError } from "../../middleware/errorHandler";
import { Room } from "../../models/Room";
import { RoomBooking } from "../../models/RoomBooking";

const roomSchema = z.object({ name: z.string().trim().min(2).max(80), capacity: z.number().int().min(1).max(100) });
const bookingSchema = z.object({ roomId: z.string(), startsAt: z.string().datetime(), endsAt: z.string().datetime() }).superRefine((value, context) => {
  const startsAt = new Date(value.startsAt);
  const endsAt = new Date(value.endsAt);
  if (endsAt.getTime() - startsAt.getTime() !== 60 * 60 * 1000 || startsAt.getUTCMinutes() !== 0 || startsAt.getUTCSeconds() !== 0) {
    context.addIssue({ code: "custom", message: "Bookings must use a single hourly slot" });
  }
});

export function createRoomRouter() {
  const router = Router();
  router.get("/", requireAuth, async (_req, res, next) => { try { res.json(await Room.find().sort({ name: 1 })); } catch (error) { next(error); } });
  router.get("/:roomId/bookings", requireAuth, async (req, res, next) => { try { const date = String(req.query.date ?? new Date().toISOString().slice(0, 10)); const start = new Date(`${date}T00:00:00.000Z`); const end = new Date(`${date}T23:59:59.999Z`); res.json(await RoomBooking.find({ roomId: req.params.roomId, startsAt: { $gte: start, $lte: end } }).sort({ startsAt: 1 })); } catch (error) { next(error); } });
  router.post("/bookings", requireAuth, validateBody(bookingSchema), auditAction("room.booking.create", "RoomBooking"), async (req, res, next) => {
    try {
      const room = await Room.findById(req.body.roomId);
      if (!room) throw new ApiError(404, "Room not found");
      if (!room.isEnabled) throw new ApiError(409, "This room is unavailable for new bookings");
      try { const booking = await RoomBooking.create({ ...req.body, userId: req.auth!.userId, startsAt: new Date(req.body.startsAt), endsAt: new Date(req.body.endsAt) }); res.status(201).json(booking); } catch (error: unknown) { if ((error as { code?: number }).code === 11000) throw new ApiError(409, "That room slot has just been booked"); throw error; }
    } catch (error) { next(error); }
  });
  router.post("/", requireAuth, requireRole("branch_admin", "super_admin"), validateBody(roomSchema), auditAction("room.create", "Room"), async (req, res, next) => { try { res.status(201).json(await Room.create(req.body)); } catch (error) { next(error); } });
  router.patch("/:roomId", requireAuth, requireRole("branch_admin", "super_admin"), validateBody(z.object({ isEnabled: z.boolean().optional(), capacity: z.number().int().min(1).max(100).optional() })), auditAction("room.update", "Room"), async (req, res, next) => { try { const room = await Room.findByIdAndUpdate(req.params.roomId, req.body, { returnDocument: "after" }); if (!room) return res.status(404).json({ error: "Room not found" }); res.json(room); } catch (error) { next(error); } });
  return router;
}
