require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env', override: false });
const { createClient } = require('@supabase/supabase-js');
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function check() {
  const fetch = require('node-fetch');
  const res = await fetch(url + '/rest/v1/', { headers: { apikey: key, Authorization: 'Bearer ' + key }});
  const data = await res.json();
  console.log(data);
}
check();
