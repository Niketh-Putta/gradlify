import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const RESET_CONFIRM_URL = 'https://gradlify.com/auth/reset-confirm';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdrbm5mYmFsaWp4eWtxeWNvcGljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MzgxMzEsImV4cCI6MjA3MjIxNDEzMX0.nbJ6GgZmJ5ZPiTkYa_Y5C2G6Sep9IF8juXv4uU_CMDU';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const requestSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
});

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const sendRecoveryEmail = async (args: { to: string; resetUrl: string }) => {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    throw new Error('Missing RESEND_API_KEY');
  }

  const from = Deno.env.get('SUPPORT_EMAIL_FROM') || 'Gradlify <onboarding@resend.dev>';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: args.to,
      subject: 'Reset your Gradlify password',
      text: [
        'We received a request to reset your Gradlify password.',
        '',
        `Open this link to choose a new password: ${args.resetUrl}`,
        '',
        'If you did not request this, you can ignore this email.',
        'This link expires in 1 hour.',
      ].join('\n'),
      html: `
        <h2>Reset your password</h2>
        <p>We received a request to reset the password for your Gradlify account.</p>
        <p>
          <a href="${escapeHtml(args.resetUrl)}" style="display:inline-block;padding:12px 18px;background:#dc2626;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">
            Reset password
          </a>
        </p>
        <p style="color:#6b7280;font-size:14px;">If you did not request this, you can ignore this email. The link expires in 1 hour.</p>
      `,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend failed (${response.status}): ${body.slice(0, 200)}`);
  }
};

const sendSupabaseRecoveryEmail = async (args: {
  supabaseUrl: string;
  anonKey: string;
  email: string;
}) => {
  const response = await fetch(`${args.supabaseUrl.replace(/\/$/, '')}/auth/v1/recover`, {
    method: 'POST',
    headers: {
      apikey: args.anonKey,
      Authorization: `Bearer ${args.anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: args.email,
      redirect_to: RESET_CONFIRM_URL,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase recover failed (${response.status}): ${body.slice(0, 200)}`);
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, message: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || DEFAULT_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return jsonResponse({ ok: false, code: 'CONFIG', message: 'Server misconfigured' }, 500);
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = requestSchema.safeParse(rawBody);
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message || 'Invalid email';
      return jsonResponse({ ok: false, code: 'BAD_REQUEST', message }, 400);
    }

    const email = parsed.data.email;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: RESET_CONFIRM_URL,
      },
    });

    if (linkError) {
      const message = linkError.message?.toLowerCase() ?? '';
      if (message.includes('not found') || message.includes('no user')) {
        return jsonResponse({ ok: true, sent: false, exists: false });
      }
      console.error('request-password-reset generateLink failed:', linkError);
      return jsonResponse({ ok: false, code: 'LINK_FAILED', message: 'Failed to create reset link' }, 500);
    }

    const tokenHash = linkData?.properties?.hashed_token;
    if (!tokenHash) {
      console.error('request-password-reset missing hashed_token');
      return jsonResponse({ ok: false, code: 'LINK_FAILED', message: 'Failed to create reset link' }, 500);
    }

    const resetUrl = `${RESET_CONFIRM_URL}?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;

    try {
      await sendRecoveryEmail({ to: email, resetUrl });
    } catch (resendError) {
      console.error('request-password-reset Resend failed, falling back to Supabase recover:', resendError);
      await sendSupabaseRecoveryEmail({
        supabaseUrl,
        anonKey: supabaseAnonKey,
        email,
      });
    }

    return jsonResponse({ ok: true, sent: true, exists: true });
  } catch (error) {
    console.error('request-password-reset unexpected error:', error);
    return jsonResponse({ ok: false, code: 'UNEXPECTED', message: 'Failed to send reset email' }, 500);
  }
});
