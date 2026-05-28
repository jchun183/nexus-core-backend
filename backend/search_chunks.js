import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const REAL_ESTATE_TENANT_ID = '6b0d35a8-085f-47b7-be71-abb92d5c164e';
const VET_CLINIC_TENANT_ID = '4d817c28-f27e-45dd-831a-126e38a36184';

async function createEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  return response.data[0].embedding;
}

async function searchKnowledge(query, tenantId) {
  const queryEmbedding = await createEmbedding(query);

  const { data, error } = await supabase.rpc('match_knowledge_base', {
    query_embedding: queryEmbedding,
    target_tenant_id: tenantId,
    match_count: 3,
  });

  if (error) {
    console.error('Search error:', error);
    return;
  }

  console.log('\nQuery:', query);
  console.log('Tenant:', tenantId);
  console.log('Results:');

  for (const row of data) {
    console.log('---');
    console.log('Similarity:', row.similarity);
    console.log('Chunk Index:', row.chunk_index);
    console.log('Content:', row.content);
    console.log('Metadata:', row.metadata);
  }
}

async function main() {
  await searchKnowledge(
    'What should staff do during an emergency?',
    REAL_ESTATE_TENANT_ID
  );
}

main();