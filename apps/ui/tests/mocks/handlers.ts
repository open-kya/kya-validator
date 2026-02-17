import { http, HttpResponse } from 'msw';
import {
  mockSessionResponse,
  mockConfigResponse,
  mockValidationResponse,
  mockValidationResponseInvalid,
} from '../fixtures/demoFixtures';

const API_URL = 'http://localhost:8003';

export const handlers = [
  // GET /api/v1/config
  http.get(`${API_URL}/api/v1/config`, () => {
    return HttpResponse.json(mockConfigResponse);
  }),

  // POST /api/v1/session/start
  http.post(`${API_URL}/api/v1/session/start`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      ...mockSessionResponse,
      ...body,
      created_at: new Date().toISOString(),
    });
  }),

  // GET /api/v1/session/:sessionId
  http.get(`${API_URL}/api/v1/session/:sessionId`, ({ params }) => {
    return HttpResponse.json({
      ...mockSessionResponse,
      session_id: params.sessionId,
    });
  }),

  // POST /api/v1/session/:sessionId/end
  http.post(`${API_URL}/api/v1/session/:sessionId/end`, ({ params }) => {
    return HttpResponse.json({
      session_id: params.sessionId,
      ended_at: new Date().toISOString(),
      status: 'ended',
    });
  }),

  // GET /api/v1/session/:sessionId/messages
  http.get(`${API_URL}/api/v1/session/:sessionId/messages`, () => {
    return HttpResponse.json({
      messages: [],
      total: 0,
    });
  }),

  // POST /api/v1/session/:sessionId/agent/message
  http.post(`${API_URL}/api/v1/session/:sessionId/agent/message`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      ...body,
      sent_at: new Date().toISOString(),
    });
  }),

  // POST /api/v1/session/:sessionId/agent/thinking
  http.post(`${API_URL}/api/v1/session/:sessionId/agent/thinking`, () => {
    return HttpResponse.json({
      reasoning: 'Agent is thinking...',
      confidence: 0.8,
    });
  }),

  // POST /api/v1/validate/manifest
  http.post(`${API_URL}/api/v1/validate/manifest`, async ({ request }) => {
    const body = await request.json();
    // Return valid response for valid manifest, invalid for invalid
    const isValid = (body as any).manifest_data?.valid !== false;
    return HttpResponse.json(isValid ? mockValidationResponse : mockValidationResponseInvalid);
  }),

  // POST /api/v1/workflow/:workflowId/transition
  http.post(`${API_URL}/api/v1/workflow/:workflowId/transition`, ({ params }) => {
    return HttpResponse.json({
      workflow_id: params.workflowId,
      previous_state: 'initial',
      new_state: 'in_progress',
      transitioned_at: new Date().toISOString(),
    });
  }),

  // Error handlers
  http.get(`${API_URL}/api/v1/error`, () => {
    return HttpResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }),

  http.get(`${API_URL}/api/v1/not-found`, () => {
    return HttpResponse.json(
      { error: 'Not found' },
      { status: 404 }
    );
  }),
];
