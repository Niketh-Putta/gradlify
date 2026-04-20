const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envText = fs.readFileSync('.env', 'utf8');
const getVal = (key) => {
  const match = envText.match(new RegExp(key + '="?([^"\n]+)"?'));
  return match ? match[1] : null;
};

const url = getVal('VITE_SUPABASE_URL');
const serviceKey = getVal('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(url, serviceKey);

async function findInDB() {
  const tables = ['profiles', 'mock_attempts', 'practice_results'];
  for (const table of tables) {
    console.log(`Searching in ${table}...`);
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.error(`Error in ${table}:`, error.message);
      continue;
    }
    if (data && data.length > 0) {
      const cols = Object.keys(data[0]);
      console.log(`Columns in ${table}:`, cols);
      for (const col of cols) {
        if (typeof data[0][col] === 'string') {
           const { data: searchData, error: searchError } = await supabase
             .from(table)
             .select('*')
             .ilike(col, '%varu%');
           if (!searchError && searchData && searchData.length > 0) {
             console.log(`Found in ${table}.${col}:`, searchData.map(r => r[col]));
           }
        }
      }
    }
  }
}

findInDB();
