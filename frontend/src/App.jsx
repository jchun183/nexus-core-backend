import { useState } from 'react';
import './App.css';

const TENANTS = {
  realEstate: {
    label: 'Real Estate Firm',
    id: '6b0d35a8-085f-47b7-be71-abb92d5c164e',
  },
  vetClinic: {
    label: 'Vet Clinic',
    id: '4d817c28-f27e-45dd-831a-126e38a36184',
  },
};

function App() {
  const [tenantKey, setTenantKey] = useState('realEstate');
  const [userRequest, setUserRequest] = useState(
    'Draft an outreach email explaining how we evaluate investment properties using ROI, cash flow, cap rate, and risk.'
  );
  const [leadName, setLeadName] = useState('John');
  const [leadCompany, setLeadCompany] = useState('Doe Property Group');
  const [painPoint, setPainPoint] = useState(
    'wants a clearer way to evaluate rental property deals'
  );

  const [email, setEmail] = useState('');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setEmail('');
    setContext('');
    setErrorMessage('');

    const selectedTenant = TENANTS[tenantKey];

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/agent_outreach`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: selectedTenant.id,
          user_request: userRequest,
          lead_info: {
            name: leadName,
            company: leadCompany,
            pain_point: painPoint,
          },
          match_count: 3,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      setEmail(data.email || '');
      setContext(data.formatted_context || '');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <section className="card">
        <div className="header">
          <div>
            <p className="eyebrow">Nexus Core Demo</p>
            <h1>AI Agent Outreach Dashboard</h1>
          </div>
          <span className="badge">Local Demo</span>
        </div>

        <form onSubmit={handleSubmit} className="form">
          <label>
            Tenant
            <select value={tenantKey} onChange={(e) => setTenantKey(e.target.value)}>
              <option value="realEstate">Real Estate Firm</option>
              <option value="vetClinic">Vet Clinic</option>
            </select>
          </label>

          <label>
            User Request
            <textarea
              value={userRequest}
              onChange={(e) => setUserRequest(e.target.value)}
              rows={4}
            />
          </label>

          <div className="grid">
            <label>
              Lead Name
              <input value={leadName} onChange={(e) => setLeadName(e.target.value)} />
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

          <button type="submit" disabled={loading}>
            {loading ? 'Generating...' : 'Generate Outreach Email'}
          </button>
        </form>

        {errorMessage && <p className="error">{errorMessage}</p>}

        <section className="output">
          <h2>Final Email</h2>
          <pre>{email || 'No email generated yet.'}</pre>
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