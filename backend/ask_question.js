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

async function retrieveRelevantChunks(question, tenantId) {
  const questionEmbedding = await createEmbedding(question);

  const { data, error } = await supabase.rpc('match_knowledge_base', {
    query_embedding: questionEmbedding,
    target_tenant_id: tenantId,
    match_count: 3,
  });

  if (error) {
    throw new Error(`Error retrieving chunks: ${error.message}`);
  }

  return data;
}

function buildContext(chunks) {
  if (!chunks || chunks.length === 0) {
    return 'No relevant internal context was found.';
  }

  return chunks
    .map((chunk, index) => {
      const source = chunk.metadata?.source || 'unknown source';
      const topic = chunk.metadata?.topic || 'unknown topic';

      return `
[Chunk ${index + 1}]
Source: ${source}
Topic: ${topic}
Content: ${chunk.content}
`;
    })
    .join('\n');
}

async function answerQuestion(question, tenantId) {
  const chunks = await retrieveRelevantChunks(question, tenantId);
  const context = buildContext(chunks);

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      {
        role: 'system',
        content: `
You are a helpful internal company assistant.

Answer the user's question using only the provided internal context.
If the context does not contain the answer, say you do not have enough information from the internal documents.
Do not make up details.
Keep the answer clear and concise.
        `.trim(),
      },
      {
        role: 'user',
        content: `
Relevant Internal Context:
${context}

User Question:
${question}
        `.trim(),
      },
    ],
  });

  const answer = response.choices[0].message.content;

  console.log('\nQuestion:');
  console.log(question);

  console.log('\nRetrieved Context:');
  console.log(context);

  console.log('\nAnswer:');
  console.log(answer);
}

async function main() {
  await answerQuestion(
    'How should I evaluate a strong investment property?',
    REAL_ESTATE_TENANT_ID
  );
}

main();