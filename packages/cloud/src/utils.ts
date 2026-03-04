/**
 * Utility functions for cloud package
 */

/**
 * Format API error messages with helpful context and instructions
 */
export function formatApiError(
  statusCode: number,
  errorMessage: string,
  endpoint: string
): string {
  const baseMessage = `API Error (${statusCode}): ${errorMessage}`;

  let helpText = '';

  // Provide specific help based on error type
  if (statusCode === 401 || errorMessage.toLowerCase().includes('invalid api key')) {
    helpText = `
Please check your API key:
- Ensure CHONKIE_API_KEY environment variable is set correctly
- Or pass apiKey in the constructor options
- Verify your key at https://api.chonkie.ai/dashboard`;
  } else if (statusCode === 403) {
    helpText = `
You don't have permission to access this resource.
- Check your API key permissions
- Contact support if you believe this is an error`;
  } else if (statusCode === 429) {
    helpText = `
Rate limit exceeded. Please:
- Wait a moment before retrying
- Check your usage limits at https://api.chonkie.ai/dashboard`;
  } else if (statusCode === 404) {
    helpText = `
Endpoint not found: ${endpoint}
- Verify you're using the latest version of @chonkiejs/cloud
- Check the API documentation`;
  } else if (statusCode >= 500) {
    helpText = `
Server error on api.chonkie.ai
- This is likely a temporary issue
- Try again in a few moments
- Check status at https://status.chonkie.ai (if available)`;
  } else {
    helpText = `
Unexpected error occurred.`;
  }

  const footer = `
  
If this error persists:
- Open an issue: https://github.com/chonkie-inc/chonkiejs/issues
- Contact maintainer: bhavnick@chonkie.ai
- Include the error message and what you were trying to do`;

  return baseMessage + helpText + footer;
}

/**
 * Common API error types
 */
export const API_ERRORS = {
  INVALID_API_KEY: 'Invalid API key',
  RATE_LIMIT: 'Rate limit exceeded',
  SERVER_ERROR: 'Server error',
  NOT_FOUND: 'Endpoint not found',
  FORBIDDEN: 'Access forbidden',
} as const;

/**
 * File reference type for API requests
 */
export interface FileReference {
  /** Type of file reference */
  type: 'document' | 'base64';
  /** Content - either document name or base64 string */
  content: string;
}

/**
 * Response from file upload endpoint
 */
export interface FileUploadResponse {
  /** The document name/ID that can be used in subsequent API calls */
  document: string;
  /** Optional additional metadata */
  [key: string]: unknown;
}

/**
 * Create a file reference object for use in JSON API requests
 *
 * @param type - Type of file reference ('document' or 'base64')
 * @param content - The document name or base64 encoded string
 * @returns FileReference object that can be included in API request bodies
 *
 * @example
 * ```typescript
 * // Using a document reference
 * const fileRef = createFileReference('document', 'my-uploaded-file.pdf');
 *
 * // Using base64
 * const base64Data = btoa('file contents');
 * const fileRef = createFileReference('base64', base64Data);
 * ```
 */
export function createFileReference(type: 'document' | 'base64', content: string): FileReference {
  if (!type || (type !== 'document' && type !== 'base64')) {
    throw new Error('File reference type must be either "document" or "base64"');
  }
  if (!content || typeof content !== 'string') {
    throw new Error('File reference content must be a non-empty string');
  }
  return { type, content };
}
