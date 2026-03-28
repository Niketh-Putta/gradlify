import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TopicCatalogItem {
  topic_key: string;
  subtopic_key: string;
  title: string;
  order_index: number;
}

interface SubtopicProgress {
  id: string;
  topic_key: string;
  subtopic_key: string;
  score: number;
  user_id: string;
  last_updated: string;
}

const TOPIC_KEYS = ['number', 'algebra', 'ratio', 'geometry', 'probability', 'statistics'];

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the user from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, code: 'NO_AUTH', message: 'Authorization header required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ ok: false, code: 'INVALID_AUTH', message: 'Invalid or expired token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const userId = user.id;
    console.log(`Processing request for user: ${userId}`);

    // 1. Fetch topic catalog (static data)
    const { data: catalogData, error: catalogError } = await supabase
      .from('topic_catalog')
      .select('*')
      .order('topic_key, order_index');

    if (catalogError) {
      console.error('Error fetching topic catalog:', catalogError);
      return new Response(
        JSON.stringify({ 
          ok: false, 
          code: 'CATALOG_ERROR', 
          message: 'Failed to load topic catalog' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 2. Fetch existing subtopic progress
    const { data: existingProgress, error: progressError } = await supabase
      .from('subtopic_progress')
      .select('*')
      .eq('user_id', userId);

    if (progressError) {
      console.error('Error fetching subtopic progress:', progressError);
      return new Response(
        JSON.stringify({ 
          ok: false, 
          code: 'PROGRESS_ERROR', 
          message: 'Failed to load progress data' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Found ${existingProgress?.length || 0} existing progress records`);
    console.log(`Catalog has ${catalogData?.length || 0} subtopics`);

    // 3. Determine which subtopics need seeding
    const existingKeys = new Set(
      existingProgress?.map(p => `${p.topic_key}.${p.subtopic_key}`) || []
    );
    
    const missingSubtopics = catalogData?.filter(
      item => !existingKeys.has(`${item.topic_key}.${item.subtopic_key}`)
    ) || [];

    console.log(`Need to seed ${missingSubtopics.length} missing subtopics`);

    // 4. Seed missing subtopics
    if (missingSubtopics.length > 0) {
      const seedData = missingSubtopics.map(item => ({
        user_id: userId,
        topic_key: item.topic_key,
        subtopic_key: item.subtopic_key,
        score: 0,
        last_updated: new Date().toISOString()
      }));

      const { error: seedError } = await supabase
        .from('subtopic_progress')
        .insert(seedData);

      if (seedError) {
        console.error('Error seeding subtopics:', seedError);
        return new Response(
          JSON.stringify({ 
            ok: false, 
            code: 'SEED_ERROR', 
            message: 'Failed to initialize progress data' 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      console.log(`Seeded ${seedData.length} new subtopic progress records`);
    }

    // 5. Re-fetch all progress data (including newly seeded)
    const { data: allProgress, error: finalProgressError } = await supabase
      .from('subtopic_progress')
      .select('*')
      .eq('user_id', userId);

    if (finalProgressError) {
      console.error('Error fetching final progress:', finalProgressError);
      return new Response(
        JSON.stringify({ 
          ok: false, 
          code: 'FINAL_FETCH_ERROR', 
          message: 'Failed to load updated progress data' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 6. Group data by topics
    const topicsMap = new Map();
    
    // Initialize topics
    TOPIC_KEYS.forEach(topicKey => {
      topicsMap.set(topicKey, {
        topic_key: topicKey,
        topic_name: getTopicName(topicKey),
        subtopics: [],
        average_score: 0
      });
    });

    // Add subtopics to topics
    catalogData?.forEach((catalogItem: TopicCatalogItem) => {
      const progress = allProgress?.find(
        (p: SubtopicProgress) => 
          p.topic_key === catalogItem.topic_key && 
          p.subtopic_key === catalogItem.subtopic_key
      );

      if (topicsMap.has(catalogItem.topic_key)) {
        const topic = topicsMap.get(catalogItem.topic_key);
        topic.subtopics.push({
          subtopic_key: catalogItem.subtopic_key,
          title: catalogItem.title,
          score: progress?.score || 0,
          order_index: catalogItem.order_index
        });
      }
    });

    // Calculate average scores
    const topics = Array.from(topicsMap.values()).map(topic => ({
      ...topic,
      subtopics: topic.subtopics.sort((a, b) => a.order_index - b.order_index),
      average_score: topic.subtopics.length > 0 
        ? Math.round(topic.subtopics.reduce((sum, sub) => sum + sub.score, 0) / topic.subtopics.length)
        : 0
    }));

    const overallReadiness = topics.length > 0 
      ? Math.round(topics.reduce((sum, topic) => sum + topic.average_score, 0) / topics.length)
      : 0;

    console.log(`Returning data for ${topics.length} topics, overall readiness: ${overallReadiness}%`);

    return new Response(
      JSON.stringify({ 
        ok: true, 
        data: {
          topics,
          overallReadiness,
          stats: {
            totalSubtopics: catalogData?.length || 0,
            userProgress: allProgress?.length || 0,
            seededCount: missingSubtopics.length
          }
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        ok: false, 
        code: 'UNEXPECTED_ERROR', 
        message: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function getTopicName(topicKey: string): string {
  const names = {
    number: 'Number',
    algebra: 'Algebra', 
    ratio: 'Ratio & Proportion',
    geometry: 'Geometry & Measures',
    probability: 'Probability',
    statistics: 'Statistics'
  };
  return names[topicKey as keyof typeof names] || topicKey;
}