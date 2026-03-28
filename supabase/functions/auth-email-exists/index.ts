import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const requestSchema = z.object({
  email: z.string().trim().email().transform((e) => e.toLowerCase()),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, message: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.json().catch(() => null);
    const parsed = requestSchema.safeParse(rawBody);
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message || 'Invalid email';
      return new Response(JSON.stringify({ ok: false, code: 'BAD_REQUEST', message: msg }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const email = parsed.data.email;

    // IMPORTANT: This endpoint can be used for account enumeration.
    // Only return a boolean and do not include any additional user data.
    const { data, error } = await supabase
      .schema('auth')
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('auth-email-exists query error:', error);
      return new Response(JSON.stringify({ ok: false, code: 'QUERY_FAILED', message: 'Failed to check email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const exists = Boolean(data?.id);

    return new Response(JSON.stringify({ ok: true, exists }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('auth-email-exists unexpected error:', e);
    return new Response(JSON.stringify({ ok: false, code: 'UNEXPECTED', message: 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
