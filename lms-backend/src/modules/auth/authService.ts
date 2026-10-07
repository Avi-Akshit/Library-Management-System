import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { config } from "../../config";
import { ApiError } from "../../middleware/errorHandler";
import { RefreshToken } from "../../models/RefreshToken";
import { PasswordResetToken } from "../../models/PasswordResetToken";
import { User } from "../../models/User";
import { Role, MemberType } from "../../types";
import { sendEmail } from "../notifications/emailProvider";

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface AuthTokenPayload {
  userId: string;
  roles: Role[];
  branchId?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

export class AuthService {
  async register(input: {
    name: string;
    email: string;
    username?: string | null;
    password: string;
    memberType?: MemberType;
    branchId?: string;
  }) {
    const email = input.email.toLowerCase();
    const username = input.username?.toLowerCase();
    const existing = await User.findOne(username ? { $or: [{ email }, { username }] } : { email });
    if (existing) throw new ApiError(409, "Email already registered");

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const user = await User.create({
      name: input.name,
      email,
      username,
      passwordHash,
      roles: ["member"],
      memberType: input.memberType ?? "student",
      branchId: input.branchId,
    });

    const tokens = await this.issueTokenPair(user);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(input: { identity: string; password: string }) {
    const identity = input.identity.toLowerCase();
    const user = await User.findOne({ $or: [{ email: identity }, { username: identity }] });
    if (!user || !user.isActive) throw new ApiError(401, "Invalid credentials");

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) throw new ApiError(401, "Invalid credentials");

    const tokens = await this.issueTokenPair(user);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async refresh(incomingRefreshToken: string): Promise<TokenPair> {
    const tokenHash = this.hashToken(incomingRefreshToken);
    const stored = await RefreshToken.findOne({ tokenHash, revoked: false });
    if (!stored || stored.expiresAt < new Date()) {
      throw new ApiError(401, "Invalid or expired refresh token");
    }

    const user = await User.findById(stored.userId);
    if (!user || !user.isActive) throw new ApiError(401, "User not found or inactive");

    // Rotate: revoke old, issue new
    stored.revoked = true;
    await stored.save();

    return this.issueTokenPair(user);
  }

  async logout(incomingRefreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(incomingRefreshToken);
    await RefreshToken.updateOne({ tokenHash }, { revoked: true });
  }

  async requestPasswordReset(identity: string): Promise<void> {
    const normalizedIdentity = identity.toLowerCase();
    const user = await User.findOne({ $or: [{ email: normalizedIdentity }, { username: normalizedIdentity }] });
    // Do not disclose whether an account exists.
    if (!user || !user.isActive) return;

    const rawToken = crypto.randomBytes(32).toString("hex");
    await PasswordResetToken.updateMany({ userId: user._id, usedAt: { $exists: false } }, { usedAt: new Date() });
    await PasswordResetToken.create({
      userId: user._id,
      tokenHash: this.hashToken(rawToken),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    });
    const resetUrl = `${config.webOrigin}/reset-password?token=${rawToken}`;
    await sendEmail({
      to: user.email,
      subject: "Reset your library password",
      body: `A password reset was requested for your library account. Use this link within 30 minutes: ${resetUrl}`,
    });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const reset = await PasswordResetToken.findOne({ tokenHash: this.hashToken(token), usedAt: { $exists: false } });
    if (!reset || reset.expiresAt <= new Date()) throw new ApiError(400, "Invalid or expired password reset link");
    const user = await User.findById(reset.userId);
    if (!user || !user.isActive) throw new ApiError(400, "Invalid or expired password reset link");

    user.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    reset.usedAt = new Date();
    await Promise.all([user.save(), reset.save(), RefreshToken.updateMany({ userId: user._id, revoked: false }, { revoked: true })]);
  }

  async changePassword(userId: string, currentPassword: string, password: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user || !user.isActive || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new ApiError(401, "Current password is incorrect");
    }
    user.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await Promise.all([user.save(), RefreshToken.updateMany({ userId: user._id, revoked: false }, { revoked: true })]);
  }

  async getMe(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");
    return this.sanitizeUser(user);
  }

  // Still exposed so middleware (attachAuth) can verify access tokens
  verifyToken(token: string): AuthTokenPayload {
    try {
      return jwt.verify(token, config.jwtSecret) as AuthTokenPayload;
    } catch {
      throw new ApiError(401, "Invalid or expired token");
    }
  }

  private async issueTokenPair(user: {
    _id: unknown;
    roles: Role[];
    branchId?: unknown;
  }): Promise<TokenPair> {
    const payload: AuthTokenPayload = {
      userId: String(user._id),
      roles: user.roles as Role[],
      branchId: user.branchId ? String(user.branchId) : undefined,
    };
    const accessToken = jwt.sign(payload, config.jwtSecret, { expiresIn: ACCESS_TOKEN_TTL });

    const rawRefreshToken = crypto.randomBytes(40).toString("hex");
    const tokenHash = this.hashToken(rawRefreshToken);
    await RefreshToken.create({
      userId: String(user._id),
      tokenHash,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    });

    return { accessToken, refreshToken: rawRefreshToken, expiresIn: 15 * 60 };
  }

  private hashToken(raw: string): string {
    return crypto.createHash("sha256").update(raw).digest("hex");
  }

  private sanitizeUser(user: {
    _id: unknown;
    name: string;
    email: string;
    username?: string | null;
    roles: Role[];
    memberType: MemberType;
    branchId?: unknown;
    isActive: boolean;
  }) {
    return {
      id: String(user._id),
      name: user.name,
      email: user.email,
      username: user.username,
      roles: user.roles,
      memberType: user.memberType,
      branchId: user.branchId ? String(user.branchId) : undefined,
      isActive: user.isActive,
    };
  }
}
