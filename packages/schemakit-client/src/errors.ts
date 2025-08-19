export class SchemaKitError extends Error {
  status?: number;
  code?: string;
  details?: any;
  response?: Response;

  constructor(message: string, options?: { status?: number; code?: string; details?: any; response?: Response }) {
    super(message);
    this.name = 'SchemaKitError';
    this.status = options?.status;
    this.code = options?.code;
    this.details = options?.details;
    this.response = options?.response;
  }

  static async fromResponse(response: Response): Promise<SchemaKitError> {
    let message = `Request failed with status ${response.status}`;
    let details: any = undefined;
    try {
      const data: unknown = await response.clone().json();
      if (data && typeof data === 'object') {
        const anyData = data as Record<string, any>;
        if (typeof anyData.error === 'string' || typeof anyData.message === 'string') {
          message = (anyData.error as string) || (anyData.message as string);
        }
        details = data;
      }
    } catch {
      // ignore JSON parse errors
    }
    return new SchemaKitError(message, { status: response.status, details, response });
  }
}
