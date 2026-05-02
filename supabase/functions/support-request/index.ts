import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const SUPPORT_INBOX = 'team@gradlify.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const requestSchema = z.object({
  kind: z.enum(['support', 'suggestion']).default('support'),
  message: z.string().trim().min(1).max(5000),
  email: z.string().trim().email().nullable().optional(),
});

const jsonResponse = (body: unknown, status = 200) =>
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

const sendSupportEmail = async (args: {
  kind: 'support' | 'suggestion';
  message: string;
  email: string | null;
  userId: string | null;
  requestId: string;
}) => {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    throw new Error('Missing RESEND_API_KEY');
  }

  const from = Deno.env.get('SUPPORT_EMAIL_FROM') || 'Gradlify <onboarding@resend.dev>';
  const subjectPrefix = args.kind === 'suggestion' ? 'Suggestion' : 'Support request';
  const replyTo = args.email || SUPPORT_INBOX;
  const submittedBy = args.email || 'No email provided';
  const userId = args.userId || 'Anonymous visitor';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: SUPPORT_INBOX,
      reply_to: replyTo,
      subject: `[Gradlify] ${subjectPrefix}`,
      text: [
        `Type: ${args.kind}`,
        `From: ${submittedBy}`,
        `User ID: ${userId}`,
        `Request ID: ${args.requestId}`,
        '',
        args.message,
      ].join('\n'),
      html: `
        <h2>${escapeHtml(subjectPrefix)}</h2>
        <p><strong>Type:</strong> ${escapeHtml(args.kind)}</p>
        <p><strong>From:</strong> ${escapeHtml(submittedBy)}</p>
        <p><strong>User ID:</strong> ${escapeHtml(userId)}</p>
        <p><strong>Request ID:</strong> ${escapeHtml(args.requestId)}</p>
        <hr />
        <p style="white-space: pre-wrap;">${escapeHtml(args.message)}</p>
      `,
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Resend email failed: ${response.status} ${details}`);
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
    const rawBody = await req.json().catch(() => null);
    const parsed = requestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonResponse(
        { ok: false, code: 'BAD_REQUEST', message: parsed.error.errors[0]?.message || 'Invalid support request' },
        400,
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
    const authenticatedUserId = token
      ? (await supabase.auth.getUser(token)).data.user?.id ?? null
      : null;
    const userId = authenticatedUserId || null;

    const { data, error } = await supabase
      .from('support_requests')
      .insert({
        kind: parsed.data.kind,
        message: parsed.data.message,
        email: parsed.data.email || null,
        user_id: userId,
      })
      .select('id')
      .single();

    if (error) {
      console.error('support-request insert error:', error);
      return jsonResponse({ ok: false, code: 'INSERT_FAILED', message: 'Failed to save support request' }, 500);
    }

    await sendSupportEmail({
      kind: parsed.data.kind,
      message: parsed.data.message,
      email: parsed.data.email || null,
      userId,
      requestId: data.id,
    });

    return jsonResponse({ ok: true, id: data.id });
  } catch (error) {
    console.error('support-request unexpected error:', error);
    return jsonResponse({ ok: false, code: 'UNEXPECTED', message: 'Could not send support request' }, 500);
  }
});
