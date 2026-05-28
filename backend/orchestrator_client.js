const TOOL_SERVER_URL = 'http://localhost:3001';

const REAL_ESTATE_TENANT_ID = '6b0d35a8-085f-47b7-be71-abb92d5c164e';
const VET_CLINIC_TENANT_ID = '4d817c28-f27e-45dd-831a-126e38a36184';

async function callTool(path, payload) {
  const response = await fetch(`${TOOL_SERVER_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Tool call failed');
  }

  return data;
}

async function runOrchestrator() {
  const userRequest =
    'Draft an outreach email explaining how we evaluate investment properties using ROI, cash flow, cap rate, and risk.';

  const leadInfo = {
    name: 'John',
    company: 'Doe Property Group',
    pain_point: 'wants a clearer way to evaluate rental property deals',
  };

  console.log('\nUSER REQUEST');
  console.log(userRequest);

  console.log('\nCALLING TOOL: search_internal_knowledge');
  const searchResult = await callTool('/search_internal_knowledge', {
    query: userRequest,
    tenant_id: VET_CLINIC_TENANT_ID,
    match_count: 3,
  });

  console.log('\nRETRIEVED CONTEXT');
  console.log(searchResult.formatted_context);

  console.log('\nCALLING TOOL: generate_crm_outreach');
  const outreachResult = await callTool('/generate_crm_outreach', {
    lead_info: leadInfo,
    context: searchResult.formatted_context,
  });

  console.log('\nFINAL EMAIL');
  console.log(outreachResult.email);
}

runOrchestrator().catch((error) => {
  console.error('Orchestrator failed:', error.message);
});