import { config } from "../../config";
import nodemailer from "nodemailer";

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

export async function sendEmail(message: EmailMessage) {
  if (config.emailProvider === "gmail") {
    if (!config.gmailUser || !config.gmailAppPassword) {
      console.warn("[email] Gmail is selected but GMAIL_USER or GMAIL_APP_PASSWORD is not configured");
      return { sent: false, mode: "gmail_unconfigured" as const };
    }
    try {
      const transport = nodemailer.createTransport({
        service: "gmail",
        auth: { user: config.gmailUser, pass: config.gmailAppPassword },
      });
      await transport.sendMail({
        from: process.env.EMAIL_FROM ?? config.gmailUser,
        to: message.to,
        subject: message.subject,
        text: message.body,
      });
      return { sent: true, mode: "gmail" as const };
    } catch (error) {
      console.error("[email] Gmail error", error);
      return { sent: false, mode: "gmail_error" as const };
    }
  }

  if (config.emailProvider === "console" || !process.env.RESEND_API_KEY) {
    console.log(`[email] to=${message.to} subject="${message.subject}" body="${message.body.slice(0, 80)}..."`);
    return { sent: false, mode: "console" as const };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "LMS <onboarding@resend.dev>",
        to: message.to,
        subject: message.subject,
        text: message.body,
      }),
    });
    if (!response.ok) {
      console.error("[email] Resend failed", await response.text());
      return { sent: false, mode: "resend_failed" as const };
    }
    return { sent: true, mode: "resend" as const };
  } catch (error) {
    console.error("[email] Resend error", error);
    return { sent: false, mode: "resend_error" as const };
  }
}
