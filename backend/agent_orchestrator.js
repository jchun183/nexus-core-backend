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

  const embedding = response.data[0].embedding;
  return embedding;
}

async function searchInternalKnowledge(query, tenantId) {
  const queryEmbedding = await createEmbedding(query);

  const { data, error } = await supabase.rpc('match_knowledge_base', {
    query_embedding: queryEmbedding,
    target_tenant_id: tenantId,
    match_count: 3,
  });

  if (error) {
    throw new Error(`Knowledge search failed: ${error.message}`);
  }

  return data;
}

function formatKnowledgeContext(chunks) {
  if (!chunks || chunks.length === 0) {
    return 'No relevant internal knowledge was found.';
  }

  const context = chunks
    .map((chunk, index) => {
      const source = chunk.metadata?.source || 'unknown source';
      const topic = chunk.metadata?.topic || 'unknown topic';

      return `
[Context ${index + 1}]
Source: ${source}
Topic: ${topic}
Similarity: ${chunk.similarity}
Content: ${chunk.content}
`.trim();
    })
    .join('\n\n');

  return context;
}

async function generateCrmOutreach(leadInfo, context) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      {
        role: 'system',
        content: `
You are an AI assistant helping a business create personalized outreach.

Use only the provided internal context when describing the company's process or expertise.
Do not invent services, pricing, guarantees, or claims.
Write in a clear, human, concise style.
Return only the outreach email.
        `.trim(),
      },
      {
        role: 'user',
        content: `
Lead Info:
Name: ${leadInfo.name}
Company: ${leadInfo.company}
Pain Point: ${leadInfo.pain_point}

Internal Context:
${context}

Task:
Draft a short personalized outreach email to this lead. Mention the pain point and connect it to the internal context.
        `.trim(),
      },
    ],
  });

  const email = response.choices[0].message.content;
  return email;
}

async function runAgent(userRequest, tenantId, leadInfo) {
  console.log('\nUSER REQUEST');
  console.log(userRequest);

  console.log('\nTOOL CALL 1: search_internal_knowledge');
  const chunks = await searchInternalKnowledge(userRequest, tenantId);

  const context = formatKnowledgeContext(chunks);

  console.log('\nRETRIEVED CONTEXT');
  console.log(context);

  console.log('\nTOOL CALL 2: generate_crm_outreach');
  const email = await generateCrmOutreach(leadInfo, context);

  console.log('\nFINAL OUTPUT');
  console.log(email);
}

async function main() {
  const userRequest =
    'Draft an outreach email explaining how we evaluate investment properties using ROI, cash flow, cap rate, and risk.';

  const leadInfo = {
    name: 'John',
    company: 'Doe Property Group',
    pain_point: 'wants a clearer way to evaluate rental property deals',
  };

  await runAgent(userRequest, VET_CLINIC_TENANT_ID, leadInfo);
}

main();