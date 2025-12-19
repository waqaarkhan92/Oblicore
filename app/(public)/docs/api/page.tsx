/**
 * API Documentation Page
 * Public documentation for EcoComply REST API
 */

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Documentation - EcoComply',
  description: 'REST API documentation for EcoComply integration',
};

interface EndpointDoc {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  auth: 'Required' | 'Optional' | 'None';
}

const endpoints: Record<string, EndpointDoc[]> = {
  Authentication: [
    { method: 'POST', path: '/api/v1/auth/login', description: 'Authenticate user', auth: 'None' },
  ],
  Obligations: [
    { method: 'GET', path: '/api/v1/obligations', description: 'List obligations', auth: 'Required' },
    { method: 'GET', path: '/api/v1/obligations/{id}', description: 'Get obligation by ID', auth: 'Required' },
  ],
  Evidence: [
    { method: 'GET', path: '/api/v1/evidence', description: 'List evidence', auth: 'Required' },
    { method: 'POST', path: '/api/v1/evidence', description: 'Upload evidence', auth: 'Required' },
  ],
  'Audit Packs': [
    { method: 'GET', path: '/api/v1/packs', description: 'List packs', auth: 'Required' },
    { method: 'GET', path: '/api/v1/packs/{packId}/verify', description: 'Verify pack authenticity', auth: 'None' },
  ],
  'Review Queue': [
    { method: 'GET', path: '/api/v1/review-queue', description: 'List review items', auth: 'Required' },
    { method: 'POST', path: '/api/v1/review-queue/bulk', description: 'Bulk operations', auth: 'Required' },
  ],
  Webhooks: [
    { method: 'POST', path: '/api/v1/webhooks', description: 'Register webhook', auth: 'Required' },
    { method: 'GET', path: '/api/v1/webhooks', description: 'List webhooks', auth: 'Required' },
  ],
};

const webhookEvents = [
  { event: 'obligation.created', description: 'New obligation created' },
  { event: 'evidence.uploaded', description: 'Evidence uploaded' },
  { event: 'pack.generated', description: 'Pack generated' },
  { event: 'breach.detected', description: 'Breach detected' },
];

function MethodBadge({ method }: { method: string }) {
  const colors = {
    GET: 'bg-blue-100 text-blue-800',
    POST: 'bg-green-100 text-green-800',
    PUT: 'bg-yellow-100 text-yellow-800',
    PATCH: 'bg-orange-100 text-orange-800',
    DELETE: 'bg-red-100 text-red-800',
  } as const;
  return (
    <span className={`px-2 py-1 rounded text-xs font-mono font-bold ${colors[method as keyof typeof colors] || 'bg-gray-100'}`}>
      {method}
    </span>
  );
}

function AuthBadge({ auth }: { auth: string }) {
  const colors = {
    Required: 'bg-purple-100 text-purple-800',
    None: 'bg-gray-100 text-gray-600',
  } as const;
  return (
    <span className={`px-2 py-0.5 rounded text-xs ${colors[auth as keyof typeof colors] || 'bg-gray-100'}`}>
      {auth === 'None' ? 'Public' : auth}
    </span>
  );
}

export default function APIDocsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto py-12 px-4">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">EcoComply API Documentation</h1>
          <p className="text-lg text-gray-600">REST API for EcoComply compliance management.</p>
        </div>

        <section className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Authentication</h2>
          <p className="text-gray-600 mb-4">Use Bearer token in Authorization header.</p>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg">
            Authorization: Bearer YOUR_ACCESS_TOKEN
          </pre>
        </section>

        {Object.entries(endpoints).map(([category, categoryEndpoints]) => (
          <section key={category} className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">{category}</h2>
            <div className="space-y-4">
              {categoryEndpoints.map((endpoint, idx) => (
                <div key={idx} className="flex items-center gap-3 border-b pb-4 last:border-0">
                  <MethodBadge method={endpoint.method} />
                  <code className="text-sm font-mono text-gray-800">{endpoint.path}</code>
                  <AuthBadge auth={endpoint.auth} />
                  <span className="text-gray-600 text-sm ml-2">{endpoint.description}</span>
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Webhook Events</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2 pr-4">Event</th>
                <th className="pb-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {webhookEvents.map((item, idx) => (
                <tr key={idx} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-mono text-blue-600">{item.event}</td>
                  <td className="py-3 text-gray-600">{item.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer className="text-center text-gray-500 text-sm mt-12">
          <p>Contact support@ecocomply.io</p>
        </footer>
      </div>
    </div>
  );
}
