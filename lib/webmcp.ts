import { z } from 'zod';
import { CITY_BY_ID } from './cities';
import { METRICS, type MetricKey } from './forecast';
interface Tool {
  name: string;
  description: string;
  title?: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => unknown;
}
interface ModelContext {
  registerTool: (
    tool: Tool,
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
}
export function registerAtlasTools(actions: {
  selectCity: (id: string) => void;
  setMetric: (metric: MetricKey) => void;
  startSurvey: () => void;
}) {
  const context = (document as Document & { modelContext?: ModelContext })
    .modelContext;
  if (!context?.registerTool) return () => {};
  const lifecycle = new AbortController();
  const citySchema = z
    .object({
      cityId: z.string().refine((id) => CITY_BY_ID.has(id), 'Unknown city.'),
    })
    .strict();
  const metricSchema = z
    .object({ metric: z.enum(['chemistry', 'fog', 'friction']) })
    .strict();
  const tools: Tool[] = [
    {
      name: 'select_atlas_city',
      title: 'Explore an atlas city',
      description:
        'Select a known city in the visible atlas. This changes the view, not survey answers. Preview remains explicitly illustrative.',
      inputSchema: {
        type: 'object',
        properties: { cityId: { type: 'string' } },
        required: ['cityId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const { cityId } = citySchema.parse(input);
        actions.selectCity(cityId);
        return { selectedCity: cityId };
      },
    },
    {
      name: 'set_atlas_metric',
      title: 'Change the dating score',
      description:
        'Switch the globe and city list: chemistry means Connection, fog means Mixed messages, and friction means Date hassles.',
      inputSchema: {
        type: 'object',
        properties: {
          metric: { type: 'string', enum: ['chemistry', 'fog', 'friction'] },
        },
        required: ['metric'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const { metric } = metricSchema.parse(input);
        actions.setMetric(metric);
        return { metric, label: METRICS[metric].label };
      },
    },
    {
      name: 'start_signal_report',
      title: 'Open a private survey',
      description:
        'Open the survey. Does not submit answers or consent on a person’s behalf.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        z.object({}).strict().parse(input);
        actions.startSurvey();
        return { survey: 'opened', submitted: false };
      },
    },
  ];
  for (const tool of tools) {
    try {
      void Promise.resolve(
        context.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {});
    } catch {
      /* An optional browser feature must not break the atlas. */
    }
  }
  return () => lifecycle.abort();
}
