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

async function createEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  const embedding = response.data[0].embedding;
  return embedding;
}

async function main() {
  const { data: chunks, error } = await supabase
    .from('knowledge_base')
    .select('id, content')
    .is('embedding', null);

  if (error) {
    console.error('Error fetching chunks:', error);
    return;
  }

  console.log(`Found ${chunks.length} chunks without embeddings.`);

  for (const chunk of chunks) {
    console.log(`Embedding chunk: ${chunk.id}`);

    const embedding = await createEmbedding(chunk.content);

    const { error: updateError } = await supabase
      .from('knowledge_base')
      .update({ embedding: embedding })
      .eq('id', chunk.id);

    if (updateError) {
      console.error('Error updating chunk:', updateError);
    } else {
      console.log(`Updated chunk: ${chunk.id}`);
    }
  }

  console.log('Done.');
}

main();