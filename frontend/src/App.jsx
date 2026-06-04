import { useEffect, useState } from 'react';
import './App.css';

const FALLBACK_TENANTS = [
  {
    company_name: 'Real Estate Firm',
    id: '6b0d35a8-085f-47b7-be71-abb92d5c164e',
    membership_active: true,
  },
  {
    company_name: 'Vet Clinic',
    id: '4d817c28-f27e-45dd-831a-126e38a36184',
    membership_active: true,
  },
];

function App() {
  const [tenants, setTenants] = useState(FALLBACK_TENANTS);
  const [tenantId, setTenantId] = useState(FALLBACK_TENANTS[0].id);

  const [newTenantName, setNewTenantName] = useState('');
  const [tenantMessage, setTenantMessage] = useState('');

  const [taskType, setTaskType] = useState('answer');
  const [userRequest, setUserRequest] = useState(
    'How should we review a deal with strong ROI but poor cash flow?'
  );

  const [leadName, setLeadName] = useState('John');
  const [leadCompany, setLeadCompany] = useState('Doe Property Group');
  const [painPoint, setPainPoint] = useState(
    'wants a clearer way to evaluate rental property deals'
  );

  const [answer, setAnswer] = useState('');
  const [email, setEmail] = useState('');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [sources, setSources] = useState([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourcesError, setSourcesError] = useState('');

  const [documentSource, setDocumentSource] = useState('new_policy.txt');
  const [documentSourceType, setDocumentSourceType] = useState('text');
  const [documentRawText, setDocumentRawText] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [ingestMessage, setIngestMessage] = useState('');
  const [ingestLoading, setIngestLoading] = useState(false);

  async function loadTenants() {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/tenants`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load tenants');
      }

      if (data.tenants && data.tenants.length > 0) {
        setTenants(data.tenants);

        const stillExists = data.tenants.some((tenant) => tenant.id === tenantId);

        if (!stillExists) {
          setTenantId(data.tenants[0].id);
        }
      }
    } catch (error) {
      console.warn('Using fallback tenants:', error.message);
    }
  }

  async function createTenant(event) {
    event.preventDefault();

    setTenantMessage('');

    if (!newTenantName.trim()) {
      setTenantMessage('Please enter a tenant name.');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/tenants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ company_name: newTenantName.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create tenant');
      }

      setTenantMessage(`Created tenant: ${data.tenant.company_name}`);
      setNewTenantName('');

      await loadTenants();

      if (data.tenant?.id) {
        setTenantId(data.tenant.id);
      }
    } catch (error) {
      setTenantMessage(error.message);
    }
  }

  async function loadKnowledgeSources() {
    setSourcesLoading(true);
    setSourcesError('');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/knowledge_sources?tenant_id=${tenantId}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load knowledge sources');
      }

      setSources(data.sources || []);
    } catch (error) {
      setSourcesError(error.message);
    } finally {
      setSourcesLoading(false);
    }
  }

  async function handleFileUpload(event) {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    const text = await file.text();

    setDocumentSource(file.name);
    setDocumentRawText(text);

    if (file.name.toLowerCase().endsWith('.pdf')) {
      setDocumentSourceType('pdf_text');
    } else {
      setDocumentSourceType('text');
    }
  }

  async function submitDocument(event) {
    event.preventDefault();

    setIngestLoading(true);
    setIngestMessage('');

    try {
      const payload = {
        tenant_id: tenantId,
        source: documentSource,
        source_type: documentSourceType,
      };

      if (documentSourceType === 'website') {
        payload.url = documentUrl;
      } else {
        payload.raw_text = documentRawText;
      }

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/ingest_document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Document ingestion failed');
      }

      setIngestMessage('Document sent to ingestion pipeline.');
      setDocumentRawText('');
      setDocumentUrl('');

      await loadKnowledgeSources();
    } catch (error) {
      setIngestMessage(error.message);
    } finally {
      setIngestLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setAnswer('');
    setEmail('');
    setContext('');
    setErrorMessage('');

    try {
      let endpoint = '';
      let payload = {};

      if (taskType === 'answer') {
        endpoint = '/agent_answer';

        payload = {
          tenant_id: tenantId,
          user_question: userRequest,
          match_count: 3,
        };
      } else {
        endpoint = '/agent_outreach';

        payload = {
          tenant_id: tenantId,
          user_request: userRequest,
          lead_info: {
            name: leadName,
            company: leadCompany,
            pain_point: painPoint,
          },
          match_count: 3,
        };
      }

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      if (taskType === 'answer') {
        setAnswer(data.answer || '');
      } else {
        setEmail(data.email || '');
      }

      setContext(data.formatted_context || '');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTenants();
  }, []);

  useEffect(() => {
    loadKnowledgeSources();
  }, [tenantId]);

  const selectedTenant = tenants.find((tenant) => tenant.id === tenantId);

  return (
    <main className="page">
      <section className="card">
        <div className="header">
          <div>
            <p className="eyebrow">Nexus Core Demo</p>
            <h1>AI Agent Dashboard</h1>
          </div>
          <span className="badge">Local Demo</span>
        </div>

        <section className="output">
          <h2>Tenant Workspace</h2>

          <label>
            Current Tenant
            <select value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.company_name || tenant.name || tenant.label || tenant.id}
                </option>
              ))}
            </select>
          </label>

          <p>
            Status:{' '}
            {selectedTenant?.membership_active === false ? 'Inactive' : 'Active'}
          </p>
        </section>

        <section className="output">
          <h2>Create New Tenant</h2>

          <form onSubmit={createTenant} className="form">
            <label>
              Tenant Name
              <input
                value={newTenantName}
                onChange={(e) => setNewTenantName(e.target.value)}
                placeholder="Example: Accounting Firm"
              />
            </label>

            <button type="submit">Create Tenant</button>
          </form>

          {tenantMessage && <p>{tenantMessage}</p>}
        </section>

        <section className="output">
          <h2>Submit Document for Current Tenant</h2>

          <form onSubmit={submitDocument} className="form">
            <label>
              Source Name
              <input
                value={documentSource}
                onChange={(e) => setDocumentSource(e.target.value)}
                placeholder="policy_manual.txt"
              />
            </label>

            <label>
              Source Type
              <select
                value={documentSourceType}
                onChange={(e) => setDocumentSourceType(e.target.value)}
              >
                <option value="text">Text</option>
                <option value="pdf_text">PDF-Origin Text</option>
                <option value="website">Website</option>
              </select>
            </label>

            {documentSourceType !== 'website' && (
              <>
                <label>
                  Upload Text File
                  <input type="file" accept=".txt,.md,.csv,.pdf" onChange={handleFileUpload} />
                </label>

                <label>
                  Raw Text
                  <textarea
                    value={documentRawText}
                    onChange={(e) => setDocumentRawText(e.target.value)}
                    rows={7}
                    placeholder="Paste document text here..."
                  />
                </label>
              </>
            )}

            {documentSourceType === 'website' && (
              <label>
                Website URL
                <input
                  value={documentUrl}
                  onChange={(e) => setDocumentUrl(e.target.value)}
                  placeholder="https://example.com"
                />
              </label>
            )}

            <button type="submit" disabled={ingestLoading}>
              {ingestLoading ? 'Submitting...' : 'Submit Document'}
            </button>
          </form>

          {ingestMessage && <p>{ingestMessage}</p>}
        </section>

        <form onSubmit={handleSubmit} className="form">
          <label>
            Task Type
            <select value={taskType} onChange={(e) => setTaskType(e.target.value)}>
              <option value="answer">Ask Internal Question</option>
              <option value="outreach">Generate Outreach Email</option>
            </select>
          </label>

          <label>
            {taskType === 'answer' ? 'Question' : 'User Request'}
            <textarea
              value={userRequest}
              onChange={(e) => setUserRequest(e.target.value)}
              rows={4}
            />
          </label>

          {taskType === 'outreach' && (
            <>
              <div className="grid">
                <label>
                  Lead Name
                  <input
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                  />
                </label>

                <label>
                  Lead Company
                  <input
                    value={leadCompany}
                    onChange={(e) => setLeadCompany(e.target.value)}
                  />
                </label>
              </div>

              <label>
                Lead Pain Point
                <textarea
                  value={painPoint}
                  onChange={(e) => setPainPoint(e.target.value)}
                  rows={3}
                />
              </label>
            </>
          )}

          <button type="submit" disabled={loading}>
            {loading
              ? 'Generating...'
              : taskType === 'answer'
                ? 'Ask Internal Question'
                : 'Generate Outreach Email'}
          </button>
        </form>

        {errorMessage && <p className="error">{errorMessage}</p>}

        {taskType === 'answer' && (
          <section className="output">
            <h2>Answer</h2>
            <pre>{answer || 'No answer generated yet.'}</pre>
          </section>
        )}

        {taskType === 'outreach' && (
          <section className="output">
            <h2>Final Email</h2>
            <pre>{email || 'No email generated yet.'}</pre>
          </section>
        )}

        <section className="output">
          <div className="sectionHeader">
            <h2>Processed Knowledge Sources</h2>
            <button
              type="button"
              className="secondaryButton"
              onClick={loadKnowledgeSources}
            >
              Refresh Sources
            </button>
          </div>

          {sourcesLoading && <p>Loading sources...</p>}

          {sourcesError && <p className="error">{sourcesError}</p>}

          {!sourcesLoading && !sourcesError && sources.length === 0 && (
            <pre>No processed sources found for this tenant.</pre>
          )}

          {!sourcesLoading && sources.length > 0 && (
            <div className="sourceList">
              {sources.map((source) => (
                <div className="sourceItem" key={source.source}>
                  <strong>{source.source}</strong>
                  <span>Type: {source.source_type}</span>
                  <span>Chunks: {source.chunk_count}</span>
                  <span>Strategy: {source.chunk_strategy}</span>
                  <span>
                    Last Ingested:{' '}
                    {source.last_ingested_at
                      ? new Date(source.last_ingested_at).toLocaleString()
                      : 'Unknown'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="output">
          <h2>Retrieved Context</h2>
          <pre>{context || 'No context retrieved yet.'}</pre>
        </section>
      </section>
    </main>
  );
}

export default App;