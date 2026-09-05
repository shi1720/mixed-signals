import { CAMPAIGN } from './campaign';
import { z } from 'zod';
export async function api<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'same-origin',
      signal: controller.signal,
      headers,
    });
    let result: Record<string, unknown>;
    try {
      result = (await response.json()) as Record<string, unknown>;
    } catch {
      throw new Error(
        'The signal tower sent an unexpected response. Please try again.',
      );
    }
    if (!response.ok)
      throw new Error(
        typeof result.error === 'string'
          ? result.error
          : 'Your signal could not be sent. Please try again.',
      );
    return result as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError')
      throw new Error(
        'That took too long. Your answers are still here. Retry safely.',
      );
    if (error instanceof TypeError)
      throw new Error(
        'You seem to be offline. Your answers are still here. Reconnect and retry.',
      );
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
export function token() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}
export function downloadText(
  name: string,
  content: string,
  type = 'text/plain',
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const RECEIPT_KEY = `mixed-signals:receipt:${CAMPAIGN.id}`;
export const receiptSchema = z
  .object({
    id: z.uuid(),
    cityId: z.string(),
    deletionToken: z.string().regex(/^[a-f0-9]{64}$/),
    campaignId: z.literal(CAMPAIGN.id),
    label: z.string().max(120),
    revealsAt: z.iso.datetime(),
  })
  .strict();
export type Receipt = z.infer<typeof receiptSchema>;
export function readReceipt(): Receipt | null {
  try {
    const value = JSON.parse(localStorage.getItem(RECEIPT_KEY) ?? 'null');
    const result = receiptSchema.safeParse(value);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
export function storeReceipt(value: Receipt) {
  try {
    localStorage.setItem(RECEIPT_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
