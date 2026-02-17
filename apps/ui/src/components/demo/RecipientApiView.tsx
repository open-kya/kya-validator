/**
 * Recipient API Documentation View - Displays API documentation for the recipient agent.
 */
import { useState } from 'react';

interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
  requestBody?: {
    type: string;
    properties: Record<string, { type: string; description: string }>;
    example: Record<string, unknown>;
  };
  response?: {
    type: string;
    properties: Record<string, { type: string; description: string }>;
    example: Record<string, unknown>;
  };
}

const API_ENDPOINTS: ApiEndpoint[] = [
  {
    method: 'POST',
    path: '/api/v1/recipient/submit',
    description: 'Submit a KYA manifest for validation by the recipient agent.',
    requestBody: {
      type: 'object',
      properties: {
        manifest_data: {
          type: 'object',
          description: 'The KYA manifest data to validate',
        },
        validation_type: {
          type: 'string',
          description: 'Type of validation (manifest, policy, etc.)',
        },
        message_id: {
          type: 'string',
          description: 'Unique identifier for the message',
        },
        timestamp: {
          type: 'string',
          description: 'ISO 8601 timestamp',
        },
      },
      example: {
        message_id: 'msg-1234567890',
        timestamp: '2024-01-15T10:30:00Z',
        message_type: 'validation_request',
        manifest_data: {
          id: 'manifest-001',
          name: 'GPU Inference Service',
          version: '1.0.0',
          provider: 'demo_provider',
          services: ['gpu_inference', 'data_pipeline'],
          mcp_evidence: {
            attestation: 'base64encoded...',
            certificates: ['cert1.pem'],
          },
          tee_evidence: {
            quote: 'base64encoded...',
            measurement: '0x1234...',
          },
          blockchain_evidence: {
            transaction_hash: '0xabcd...',
            block_number: 12345678,
          },
        },
        validation_type: 'manifest',
      },
    },
    response: {
      type: 'object',
      properties: {
        validation_status: {
          type: 'string',
          description: 'Status of validation (valid, invalid, pending)',
        },
        mcp_validated: {
          type: 'boolean',
          description: 'Whether MCP validation passed',
        },
        tee_validated: {
          type: 'boolean',
          description: 'Whether TEE validation passed',
        },
        blockchain_validated: {
          type: 'boolean',
          description: 'Whether blockchain validation passed',
        },
        validation_errors: {
          type: 'array',
          description: 'List of validation errors if any',
        },
      },
      example: {
        manifest_id: 'manifest-001',
        validation_status: 'valid',
        mcp_validated: true,
        tee_validated: true,
        blockchain_validated: true,
        validation_errors: [],
      },
    },
  },
  {
    method: 'GET',
    path: '/api/v1/recipient/status/{request_id}',
    description: 'Check the validation status of a previously submitted request.',
    response: {
      type: 'object',
      properties: {
        request_id: {
          type: 'string',
          description: 'The request identifier',
        },
        status: {
          type: 'string',
          description: 'Current status (pending, completed, failed)',
        },
        result: {
          type: 'object',
          description: 'Validation result if completed',
        },
        created_at: {
          type: 'string',
          description: 'Request creation timestamp',
        },
        updated_at: {
          type: 'string',
          description: 'Last update timestamp',
        },
      },
      example: {
        request_id: 'req-1234567890',
        status: 'completed',
        result: {
          validation_status: 'valid',
          mcp_validated: true,
          tee_validated: true,
          blockchain_validated: true,
        },
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:05Z',
      },
    },
  },
  {
    method: 'GET',
    path: '/api/v1/recipient/policy',
    description: 'Get the current policy requirements that manifests must satisfy.',
    response: {
      type: 'object',
      properties: {
        policy_id: {
          type: 'string',
          description: 'Policy identifier',
        },
        policy_version: {
          type: 'string',
          description: 'Policy version',
        },
        requirements: {
          type: 'array',
          description: 'List of policy requirements',
        },
        constraints: {
          type: 'object',
          description: 'Policy constraints',
        },
      },
      example: {
        policy_id: 'policy-001',
        policy_version: '1.2.0',
        requirements: [
          {
            type: 'mcp_attestation',
            level: 'strict',
            description: 'MCP attestation required for all services',
          },
          {
            type: 'tee_evidence',
            level: 'required',
            description: 'TEE evidence required for compute services',
          },
          {
            type: 'blockchain_proof',
            level: 'optional',
            description: 'Blockchain proof optional but recommended',
          },
        ],
        constraints: {
          max_manifest_size: '10MB',
          allowed_providers: ['demo_provider', 'trusted_provider'],
          required_fields: ['id', 'name', 'version', 'provider'],
        },
      },
    },
  },
  {
    method: 'POST',
    path: '/api/v1/recipient/negotiate',
    description: 'Submit a negotiation offer to the recipient agent.',
    requestBody: {
      type: 'object',
      properties: {
        offer_id: {
          type: 'string',
          description: 'Unique identifier for the offer',
        },
        terms: {
          type: 'object',
          description: 'Negotiation terms (price, duration, etc.)',
        },
        constraints: {
          type: 'array',
          description: 'Constraints on the negotiation',
        },
      },
      example: {
        offer_id: 'offer-1234567890',
        terms: {
          price: 5000,
          currency: 'USD',
          duration: '12 months',
          sla: '99.9%',
        },
        constraints: ['max_budget:6000', 'min_sla:99.5%'],
      },
    },
    response: {
      type: 'object',
      properties: {
        response_type: {
          type: 'string',
          description: 'Response type (accept, reject, counter)',
        },
        counter_terms: {
          type: 'object',
          description: 'Counter offer terms if response_type is counter',
        },
        reasoning: {
          type: 'string',
          description: 'Reasoning for the response',
        },
      },
      example: {
        response_type: 'counter',
        counter_terms: {
          price: 4750,
          currency: 'USD',
          duration: '12 months',
          sla: '99.9%',
        },
        reasoning: 'We can offer a 5% discount for annual commitment.',
      },
    },
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-600',
  POST: 'bg-blue-600',
  PUT: 'bg-yellow-600',
  DELETE: 'bg-red-600',
};

export default function RecipientApiView() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'request' | 'response'>('request');

  const endpoint = API_ENDPOINTS[selectedEndpoint];

  return (
    <div className="bg-slate-900/50 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800/80 px-4 py-3 border-b border-slate-700">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Recipient Agent API Documentation
        </h3>
      </div>

      {/* Endpoint List */}
      <div className="divide-y divide-slate-700">
        {API_ENDPOINTS.map((ep, index) => (
          <button
            key={index}
            onClick={() => setSelectedEndpoint(index)}
            className={`w-full text-left px-4 py-3 hover:bg-slate-700/50 transition-colors ${
              selectedEndpoint === index ? 'bg-slate-700/50' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`px-2 py-1 rounded text-xs font-bold text-white ${METHOD_COLORS[ep.method] || 'bg-gray-600'}`}
              >
                {ep.method}
              </span>
              <code className="text-sm text-slate-300 font-mono">{ep.path}</code>
            </div>
            <p className="mt-1 text-xs text-slate-400 ml-14">{ep.description}</p>
          </button>
        ))}
      </div>

      {/* Endpoint Details */}
      <div className="border-t border-slate-700 bg-slate-800/30">
        <div className="px-4 py-3 border-b border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-2 py-1 rounded text-xs font-bold text-white ${METHOD_COLORS[endpoint.method] || 'bg-gray-600'}`}
            >
              {endpoint.method}
            </span>
            <code className="text-sm text-slate-200 font-mono">{endpoint.path}</code>
          </div>
          <p className="text-sm text-slate-400">{endpoint.description}</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          {endpoint.requestBody && (
            <button
              onClick={() => setActiveTab('request')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'request'
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Request
            </button>
          )}
          {endpoint.response && (
            <button
              onClick={() => setActiveTab('response')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'response'
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Response
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === 'request' && endpoint.requestBody && (
            <div className="space-y-4">
              {/* Schema */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Request Schema</h4>
                <div className="bg-slate-900 rounded-lg p-3 text-xs font-mono text-slate-300">
                  <div className="text-purple-400">{'{'}</div>
                  {Object.entries(endpoint.requestBody.properties).map(([key, prop]) => (
                    <div key={key} className="ml-4">
                      <span className="text-cyan-400">"{key}"</span>
                      <span className="text-slate-500">: </span>
                      <span className="text-green-400">{prop.type}</span>
                      <span className="text-slate-500">, // {prop.description}</span>
                    </div>
                  ))}
                  <div className="text-purple-400">{'}'}</div>
                </div>
              </div>

              {/* Example */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Example Payload</h4>
                <pre className="bg-slate-900 rounded-lg p-3 text-xs font-mono text-slate-300 overflow-x-auto">
                  {JSON.stringify(endpoint.requestBody.example, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'response' && endpoint.response && (
            <div className="space-y-4">
              {/* Schema */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Response Schema</h4>
                <div className="bg-slate-900 rounded-lg p-3 text-xs font-mono text-slate-300">
                  <div className="text-purple-400">{'{'}</div>
                  {Object.entries(endpoint.response.properties).map(([key, prop]) => (
                    <div key={key} className="ml-4">
                      <span className="text-cyan-400">"{key}"</span>
                      <span className="text-slate-500">: </span>
                      <span className="text-green-400">{prop.type}</span>
                      <span className="text-slate-500">, // {prop.description}</span>
                    </div>
                  ))}
                  <div className="text-purple-400">{'}'}</div>
                </div>
              </div>

              {/* Example */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Example Response</h4>
                <pre className="bg-slate-900 rounded-lg p-3 text-xs font-mono text-slate-300 overflow-x-auto">
                  {JSON.stringify(endpoint.response.example, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-4 py-3 bg-slate-800/80 border-t border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              No authentication required
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Rate limit: 100 requests/minute
            </span>
          </div>
          <span>Base URL: /api/v1/recipient</span>
        </div>
      </div>
    </div>
  );
}
