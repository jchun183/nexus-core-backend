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

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setAnswer('');
    setEmail('');
    setContext('');
    setErrorMessage('');

    const selectedTenant = TENANTS[tenantKey];

    try {
      let endpoint = '';
      let payload = {};

      if (taskType === 'answer') {
        endpoint = '/agent_answer';

        payload = {
          tenant_id: selectedTenant.id,
          user_question: userRequest,
          match_count: 3,
        };
      } else {
        endpoint = '/agent_outreach';

        payload = {
          tenant_id: selectedTenant.id,
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

        <form onSubmit={handleSubmit} className="form">
          <label>
            Tenant
            <select value={tenantKey} onChange={(e) => setTenantKey(e.target.value)}>
              <option value="realEstate">Real Estate Firm</option>
              <option value="vetClinic">Vet Clinic</option>
            </select>
          </label>

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
          <h2>Retrieved Context</h2>
          <pre>{context || 'No context retrieved yet.'}</pre>
        </section>
      </section>
    </main>
  );
}

export default App;