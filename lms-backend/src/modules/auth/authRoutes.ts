import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { memberTypes } from "../../types";
import { AuthService } from "./authService";
import { authRateLimit } from "../../middleware/rateLimit";

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9._-]+$/).optional(),
  password: z.string().min(8),
  memberType: z.enum(memberTypes).optional(),
  branchId: z.string().optional(),
});

const loginSchema = z.object({
  identity: z.string().trim().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(1),
}).refine((input) => Boolean(input.identity || input.email), { message: "Username or email is required" });

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
const forgotPasswordSchema = z.object({ identity: z.string().trim().min(1) });
const resetPasswordSchema = z.object({ token: z.string().length(64), password: z.string().min(12).max(128) });
const changePasswordSchema = z.object({ currentPassword: z.string().min(1), password: z.string().min(12).max(128) });

export function createAuthRouter(auth = new AuthService()) {
  const router = Router();

  router.post("/register", validateBody(registerSchema), async (req, res, next) => {
    try {
      const result = await auth.register(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/login", authRateLimit, validateBody(loginSchema), async (req, res, next) => {
    try {
      res.json(await auth.login({ identity: req.body.identity ?? req.body.email, password: req.body.password }));
    } catch (error) {
      next(error);
    }
  });

  router.post("/forgot-password", authRateLimit, validateBody(forgotPasswordSchema), async (req, res, next) => {
    try {
      await auth.requestPasswordReset(req.body.identity);
      res.status(202).json({ message: "If an account matches that record, password reset instructions have been sent." });
    } catch (error) { next(error); }
  });

  router.post("/reset-password", authRateLimit, validateBody(resetPasswordSchema), async (req, res, next) => {
    try {
      await auth.resetPassword(req.body.token, req.body.password);
      res.status(204).send();
    } catch (error) { next(error); }
  });

  router.post("/change-password", requireAuth, validateBody(changePasswordSchema), async (req, res, next) => {
    try {
      await auth.changePassword(req.auth!.userId, req.body.currentPassword, req.body.password);
      res.status(204).send();
    } catch (error) { next(error); }
  });

  // Rotate refresh token — returns a new accessToken + refreshToken pair
  router.post("/refresh", validateBody(refreshSchema), async (req, res, next) => {
    try {
      const tokens = await auth.refresh(req.body.refreshToken as string);
      res.json(tokens);
    } catch (error) {
      next(error);
    }
  });

  // Revoke the refresh token (client should discard the access token too)
  router.post("/logout", validateBody(refreshSchema), async (req, res, next) => {
    try {
      await auth.logout(req.body.refreshToken as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.get("/me", requireAuth, async (req, res, next) => {
    try {
      res.json(await auth.getMe(req.auth!.userId));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
