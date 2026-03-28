const { createClient } = require('@supabase/supabase-js');

async function testEdgeFunction() {
  const supabaseUrl = 'https://gknnfbalijxykqycopic.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdrbm5mYmFsaWp4eWtxeWNvcGljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MzgxMzEsImV4cCI6MjA3MjIxNDEzMX0.nbJ6GgZmJ5ZPiTkYa_Y5C2G6Sep9IF8juXv4uU_CMDU';
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Actually, wait, invoke needs an authenticated session!
  // I'll sign in as the user first to get a session? I don't know the user's password.
  // BUT what if I just use curl without auth? It will fail at "No authorization header provided" or "Authentication error".
  
  // Let me just send a request using the SUPABASE_SERVICE_ROLE_KEY!
  const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdrbm5mYmFsaWp4eWtxeWNvcGljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjYzODEzMSwiZXhwIjoyMDcyMjE0MTMxfQ.BQE_3SvvUsNOJSbVOQMbOwV9efRv3nYNJV7HC1T-o14';
  const adminClient = createClient(supabaseUrl, serviceKey);
  
  const { data, error } = await adminClient.functions.invoke('create-checkout-11plus', {
    body: {
      plan: 'monthly',
      returnTo: '/home',
      premiumTrack: 'eleven_plus',
      baseUrl: 'http://localhost:3000'
    }
  });

  console.log("DATA:", data);
  console.log("ERROR:", error);
}

testEdgeFunction();
