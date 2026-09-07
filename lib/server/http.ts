export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string = 'request_error',
  ) {
    super(message);
  }
}
export const PRIVATE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};
export function json(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return Response.json(body, {
    status,
    headers: { ...PRIVATE_HEADERS, ...headers },
  });
}
export async function handle(action: () => Promise<Response>) {
  try {
    return await action();
  } catch (error) {
    if (error instanceof ApiError)
      return json(
        { error: error.message, code: error.code },
        error.status,
        error.status === 429 ? { 'Retry-After': '3600' } : {},
      );
    console.error(
      'api_failure',
      error instanceof Error ? error.name : 'Unknown',
    );
    return json(
      {
        error:
          'The survey service is temporarily unavailable. Please try again shortly.',
        code: 'service_unavailable',
      },
      503,
    );
  }
}
export function requireOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin)
    throw new ApiError(
      403,
      'Please submit from the Mixed Signals website.',
      'invalid_origin',
    );
}
export async function readJson(
  request: Request,
  maxBytes = 4096,
): Promise<unknown> {
  if (
    request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !==
    'application/json'
  )
    throw new ApiError(
      415,
      'Please send a JSON request.',
      'unsupported_media_type',
    );
  if (Number(request.headers.get('content-length') ?? 0) > maxBytes)
    throw new ApiError(413, 'The request is too large.', 'body_too_large');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'A request body is required.');
  const decoder = new TextDecoder();
  let size = 0,
    text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new ApiError(413, 'The request is too large.', 'body_too_large');
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      400,
      'The request format was not valid.',
      'invalid_json',
    );
  } finally {
    reader.releaseLock();
  }
}
export function randomToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}
export async function hash(value: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}
export function cookieName(request: Request) {
  return new URL(request.url).protocol === 'https:'
    ? '__Host-ms-session'
    : 'ms-session';
}
export function getSession(request: Request): string | null {
  const name = cookieName(request);
  const match = request.headers
    .get('cookie')
    ?.split(';')
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${name}=`));
  const value = match?.slice(name.length + 1);
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}
export function requireSession(request: Request) {
  const session = getSession(request);
  if (!session)
    throw new ApiError(
      401,
      'Please reopen the survey to start a private session.',
      'session_required',
    );
  return session;
}
export function sessionCookie(request: Request, token: string) {
  return `${cookieName(request)}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}
