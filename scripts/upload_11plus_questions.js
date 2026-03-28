import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or Service Role Key in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function uploadQuestions() {
  console.log('Connecting to Supabase to update 11+ Question Bank...');
  
  // 1. Delete all existing 11plus questions
  console.log('Removing all existing 11+ questions...');
  const { error: delError } = await supabase
    .from('exam_questions')
    .delete()
    .eq('track', '11plus');
    
  if (delError) {
    console.error('Error deleting old 11+ questions:', delError);
    return;
  }
  
  console.log('Successfully cleared old 11+ questions.');

  // 2. Read huge CSV file
  const csvFilePath = path.resolve(process.cwd(), 'supabase/data/generated/11plus_premium_question_bank_full.csv');
  console.log(`Reading CSV from ${csvFilePath}...`);
  
  const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true
  });
  
  console.log(`Successfully parsed ${records.length} questions from CSV.`);
  
  console.log('Uploading questions in chunks of 500...');
  const chunkSize = 500;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize).map(record => {
      // Massage data structure if necessary; CSV fields match the DB schema natively
      const { id, ...rest } = record;
      return {
        ...rest,
        marks: parseInt(rest.marks),
        difficulty: parseInt(rest.difficulty),
        estimated_time_sec: parseInt(rest.estimated_time_sec)
      };
    });
    
    console.log(`Inserting chunk ${i / chunkSize + 1} of ${Math.ceil(records.length / chunkSize)}...`);
    
    const { error: insertError } = await supabase
      .from('exam_questions')
      .insert(chunk);
      
    if (insertError) {
      console.error('Error inserting chunk:', insertError);
      return;
    }
  }
  
  console.log('✅ Huge Upload complete! 11+ Question Bank has been successfully refreshed with ultra-premium generated content.');
}

uploadQuestions().catch(console.error);
