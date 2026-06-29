/**
 * Email service module (Resend).
 *
 * Configuration via environment variables (never hardcode the API key):
 * - RESEND_API_KEY   (required to actually send; if absent, sending is skipped)
 * - RESEND_FROM      (optional, defaults to "onboarding@resend.dev")
 * - APP_BASE_URL     (optional, used to build the reset link; defaults to localhost)
 */

import { Resend } from "resend";

type UserLike = {
  id: string;
  email: string;
  name: string;
};

const DEFAULT_FROM = "onboarding@resend.dev";
const DEFAULT_BASE_URL = "http://localhost:3000";

function buildResetUrl(token: string): string {
  const base = (process.env.APP_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}

export async function sendPasswordResetEmail(user: UserLike, token: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  // Graceful degradation: without a key we skip delivery instead of throwing,
  // so the forgot-password flow keeps its uniform (anti-enumeration) response.
  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY not set; skipping reset email for userId=${user.id}`);
    return;
  }

  const resend = new Resend(apiKey);
  const resetUrl = buildResetUrl(token);

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM ?? DEFAULT_FROM,
    to: user.email,
    subject: "Redefinição de senha — Clube Pimbas",
    html: `
      <p>Olá, ${user.name}!</p>
      <p>Recebemos um pedido para redefinir a senha da sua conta no Clube Pimbas.</p>
      <p><a href="${resetUrl}">Clique aqui para criar uma nova senha</a>. O link expira em 1 hora.</p>
      <p>Se você não solicitou isso, pode ignorar este e-mail com segurança.</p>
    `,
  });

  if (error) {
    // Surface the failure to the caller without leaking the token or the link.
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
}
