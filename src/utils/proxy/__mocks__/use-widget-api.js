let mockResponses = {};

export function __setEndpointMockData(endpoint, response) {
  mockResponses[endpoint] = response;
}

export function __clearMocks() {
  mockResponses = {};
}

export default function useWidgetAPI(widget, endpoint) {
  return mockResponses[endpoint] ?? { data: undefined, error: undefined };
}
