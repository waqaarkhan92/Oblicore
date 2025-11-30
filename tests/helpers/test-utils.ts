/**
 * Test Utilities
 * Helper functions for tests
 */

/**
 * Safely parse JSON response, handling HTML error pages
 */
export async function safeJsonParse(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type') || '';
  
  if (contentType.includes('text/html')) {
    const text = await response.text();
    throw new Error(`Received HTML instead of JSON (status: ${response.status}). Response: ${text.substring(0, 200)}`);
  }
  
  try {
    return await response.json();
  } catch (error) {
    const text = await response.text();
    throw new Error(`Failed to parse JSON response (status: ${response.status}). Response: ${text.substring(0, 200)}`);
  }
}

/**
 * Check if response is a valid API error response
 */
export function isValidApiError(data: any): boolean {
  return (
    data &&
    typeof data === 'object' &&
    data.error &&
    typeof data.error === 'object' &&
    typeof data.error.code === 'string' &&
    typeof data.error.message === 'string'
  );
}

