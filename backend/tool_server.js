import 'dotenv/config';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3001;

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

  return response.data[0].embedding;
}

function formatKnowledgeContext(chunks) {
  if (!chunks || chunks.length === 0) {
    return 'No relevant internal knowledge was found.';
  }

  return chunks
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
}

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Tool server is running',
  });
});

app.post('/search_internal_knowledge', async (req, res) => {
  try {
    const { query, tenant_id, match_count = 3 } = req.body;

    if (!query || !tenant_id) {
      return res.status(400).json({
        error: 'Missing query or tenant_id',
      });
    }

    const queryEmbedding = await createEmbedding(query);

    const { data, error } = await supabase.rpc('match_knowledge_base', {
      query_embedding: queryEmbedding,
      target_tenant_id: tenant_id,
      match_count,
    });

    if (error) {
      return res.status(500).json({
        error: error.message,
      });
    }

    res.json({
      tool: 'search_internal_knowledge',
      query,
      tenant_id,
      chunks: data,
      formatted_context: formatKnowledgeContext(data),
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

app.post('/generate_crm_outreach', async (req, res) => {
  try {
    const { lead_info, context } = req.body;

    if (!lead_info || !context) {
      return res.status(400).json({
        error: 'Missing lead_info or context',
      });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: `
You are an AI assistant helping a business create personalized outreach.

Use only the provided internal context when describing the company's process or expertise.
Do not invent services, pricing, guarantees, or claims.
Write in a natural, concise, non-pushy tone.

The email should include:
- A short subject line
- A personalized opener
- A clear connection to the lead's pain point
- A brief explanation based on the internal context
- A soft CTA for a quick call

Return only the outreach email.
          `.trim(),
        },
        {
          role: 'user',
          content: `
Lead Info:
Name: ${lead_info.name}
Company: ${lead_info.company}
Pain Point: ${lead_info.pain_point}

Internal Context:
${context}

Task:
Draft a short personalized outreach email to this lead.
          `.trim(),
        },
      ],
    });

    res.json({
      tool: 'generate_crm_outreach',
      email: response.choices[0].message.content,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});
app.post('/agent_outreach', async (req, res) => {
  try {
    const { user_request, tenant_id, lead_info, match_count = 3 } = req.body;

    if (!user_request || !tenant_id || !lead_info) {
      return res.status(400).json({
        error: 'Missing user_request, tenant_id, or lead_info',
      });
    }

    const queryEmbedding = await createEmbedding(user_request);

    const { data: chunks, error: searchError } = await supabase.rpc('match_knowledge_base', {
      query_embedding: queryEmbedding,
      target_tenant_id: tenant_id,
      match_count,
    });

    if (searchError) {
      return res.status(500).json({
        error: searchError.message,
      });
    }

    const context = formatKnowledgeContext(chunks);

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: `
You are an AI assistant helping a business create personalized outreach.

Use only the provided internal context when describing the company's process or expertise.
Do not invent services, pricing, guarantees, or claims.
Write in a natural, concise, non-pushy tone.

The email should include:
- A short subject line
- A personalized opener
- A clear connection to the lead's pain point
- A brief explanation based on the internal context
- A soft CTA for a quick call

Return only the outreach email.
          `.trim(),
        },
        {
          role: 'user',
          content: `
User Request:
${user_request}

Lead Info:
Name: ${lead_info.name}
Company: ${lead_info.company}
Pain Point: ${lead_info.pain_point}

Internal Context:
${context}

Task:
Draft a short personalized outreach email to this lead.
          `.trim(),
        },
      ],
    });

    res.json({
      tool: 'agent_outreach',
      user_request,
      tenant_id,
      chunks,
      formatted_context: context,
      email: response.choices[0].message.content,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Nexus Core backend is running',
    routes: [
      'GET /health',
      'POST /agent_outreach',
      'POST /search_internal_knowledge',
      'POST /generate_crm_outreach'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`Tool server running at http://localhost:${PORT}`);
});