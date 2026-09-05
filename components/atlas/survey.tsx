'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ShieldCheck,
  CalendarPlus,
  Download,
  Radio,
  MapPin,
  Sparkles,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { CityPicker } from './city-picker';
import {
  QUESTIONS,
  EMPTY_ANSWERS,
  HABITATS,
  type Answers,
  type Submission,
  submissionSchema,
  answersSchema,
  draftAnswersSchema,
} from '@/lib/survey';
import { CAMPAIGN } from '@/lib/campaign';
import { CITY_BY_ID } from '@/lib/cities';
import { personalForecast } from '@/lib/forecast';
import {
  api,
  token,
  storeReceipt,
  downloadText,
  type Receipt,
} from '@/lib/client';
const DRAFT_KEY = `mixed-signals:draft:${CAMPAIGN.id}`;
const PENDING_KEY = `mixed-signals:pending:${CAMPAIGN.id}`;
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted: (receipt: Receipt) => void;
  onPrivacy: () => void;
  initialCity?: string | null;
}
export function Survey({
  open,
  onOpenChange,
  onSubmitted,
  onPrivacy,
  initialCity,
}: Props) {
  const [step, setStep] = useState(0),
    [city, setCity] = useState<string | null>(initialCity ?? null),
    [answers, setAnswers] = useState<Answers>({ ...EMPTY_ANSWERS }),
    [adult, setAdult] = useState(false),
    [resident, setResident] = useState(false),
    [consent, setConsent] = useState(false),
    [habitat, setHabitat] = useState<Submission['habitat'] | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false),
    [alreadySubmitted, setAlreadySubmitted] = useState(false),
    [receipt, setReceipt] = useState<Receipt | null>(null),
    [stored, setStored] = useState(true);
  const intent = useRef<{
      idempotencyKey: string;
      deletionToken: string;
    } | null>(null),
    heading = useRef<HTMLHeadingElement>(null),
    submitting = useRef(false),
    pendingBody = useRef<string | null>(null);
  const receiveReceipt = useCallback(
    (
      result: {
        id: string;
        cityId: string;
        revealsAt: string;
        forecast: ReturnType<typeof personalForecast>;
      },
      deletionToken: string,
    ) => {
      const saved: Receipt = {
        id: result.id,
        cityId: result.cityId,
        deletionToken,
        campaignId: CAMPAIGN.id,
        label: result.forecast.label,
        revealsAt: result.revealsAt,
      };
      setStored(storeReceipt(saved));
      setReceipt(saved);
      setCity(result.cityId);
      try {
        sessionStorage.removeItem(DRAFT_KEY);
        sessionStorage.removeItem(PENDING_KEY);
      } catch {}
      setStep(6);
      onSubmitted(saved);
    },
    [onSubmitted],
  );
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem(PENDING_KEY);
      if (pending) {
        const parsed = JSON.parse(pending);
        const { deletionToken, ...payload } = parsed;
        if (
          /^[a-f0-9]{64}$/.test(deletionToken) &&
          submissionSchema.safeParse(payload).success
        )
          pendingBody.current = pending;
      }
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.city && CITY_BY_ID.has(draft.city)) setCity(draft.city);
        const check = draftAnswersSchema.safeParse(draft.answers);
        if (check.success) setAnswers(check.data);
        if (HABITATS.some((h) => h.id === draft.habitat))
          setHabitat(draft.habitat);
        if (
          /^[a-f0-9]{64}$/.test(draft.intent?.deletionToken) &&
          /^[a-f0-9-]{36}$/.test(draft.intent?.idempotencyKey)
        )
          intent.current = draft.intent;
      }
    } catch {
      /* Storage is optional; the form still works. */
    }
  }, []);
  useEffect(() => {
    if (open) {
      setError('');
      setReady(false);
      api<{ submitted: boolean }>('/api/session')
        .then(async (s) => {
          setAlreadySubmitted(s.submitted);
          setReady(true);
          if (s.submitted) {
            let pending;
            try {
              pending = JSON.parse(
                pendingBody.current ??
                  sessionStorage.getItem(PENDING_KEY) ??
                  'null',
              );
            } catch {}
            if (pending && /^[a-f0-9]{64}$/.test(pending.deletionToken)) {
              const { deletionToken, ...payload } = pending;
              const valid = submissionSchema.safeParse(payload);
              if (valid.success) {
                setBusy(true);
                try {
                  const result = await api<{
                    id: string;
                    cityId: string;
                    revealsAt: string;
                    forecast: ReturnType<typeof personalForecast>;
                  }>('/api/signals', {
                    method: 'POST',
                    body: JSON.stringify({ ...valid.data, deletionToken }),
                  });
                  receiveReceipt(result, deletionToken);
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : 'Could not recover your receipt. Reopen to retry.',
                  );
                } finally {
                  setBusy(false);
                }
              }
            }
          }
        })
        .catch((e) => setError(e.message));
    }
  }, [open, receiveReceipt]);
  useEffect(() => {
    if (initialCity && !city) setCity(initialCity);
  }, [initialCity, city]);
  useEffect(() => {
    heading.current?.focus();
  }, [step]);
  const saveDraft = (data: {
    city: string | null;
    answers: Answers;
    habitat: Submission['habitat'] | null;
  }) => {
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ ...data, intent: intent.current }),
      );
    } catch {
      /* Private mode may disable storage. */
    }
  };
  const updateAnswer = (id: keyof Answers, value: number | null) => {
    const next = { ...answers, [id]: value };
    setAnswers(next);
    saveDraft({ city, answers: next, habitat });
  };
  const next = () => {
    setError('');
    if (step === 0) {
      if (!city) {
        setError(
          'Choose the city where you have dated in the last six months.',
        );
        return;
      }
      if (!adult || !resident) {
        setError(
          'Please confirm you are 18 or older and have dating experience in this city.',
        );
        return;
      }
      if (!ready) {
        setError(
          'Your private session is not ready. Close and reopen the survey to retry.',
        );
        return;
      }
    }
    setStep(Math.min(step + 1, 5));
  };
  async function submit() {
    if (submitting.current) return;
    setError('');
    const validation = answersSchema.safeParse(answers);
    if (!validation.success) {
      setError(
        'Please answer at least four questions. You can go back to fill in a few more.',
      );
      return;
    }
    if (!city || !habitat || !consent) {
      setError(
        'Choose a meet-cute habitat and agree to anonymous aggregation.',
      );
      return;
    }
    submitting.current = true;
    setBusy(true);
    if (!intent.current)
      intent.current = {
        idempotencyKey: crypto.randomUUID(),
        deletionToken: token(),
      };
    saveDraft({ city, answers, habitat });
    try {
      const payload = {
        cityId: city,
        answers,
        adult,
        resident,
        consent,
        habitat,
        ...intent.current,
        website: '',
      };
      // Once sent, the body is immutable until its outcome is confirmed.
      // Editing a draft must never destroy the original replay/withdrawal key.
      pendingBody.current ??= JSON.stringify(payload);
      const originalPayload = JSON.parse(pendingBody.current);
      try {
        sessionStorage.setItem(PENDING_KEY, pendingBody.current);
      } catch {}
      const result = await api<{
        id: string;
        cityId: string;
        revealsAt: string;
        forecast: ReturnType<typeof personalForecast>;
      }>('/api/signals', { method: 'POST', body: pendingBody.current });
      receiveReceipt(result, originalPayload.deletionToken);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Your signal could not be sent. Please try again.',
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  const cityName = CITY_BY_ID.get(city ?? '')?.name ?? 'your city';
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!busy) onOpenChange(v);
      }}
    >
      <DialogContent className="survey-dialog" showCloseButton={!busy}>
        <div className="survey-top">
          <span className="mini-brand">
            <Radio size={17} /> FIELD REPORT / 001
          </span>
          <span>
            {step === 6 ? 'SIGNAL RECEIVED' : `${Math.min(step + 1, 6)} OF 6`}
          </span>
        </div>
        {step < 6 && (
          <Progress
            value={((step + 1) / 6) * 100}
            className="survey-progress"
            aria-label="Survey progress"
          />
        )}
        {step === 0 && (
          <>
            <span className="survey-stamp">
              <MapPin size={30} />
            </span>
            <DialogTitle className="survey-title" ref={heading} tabIndex={-1}>
              Where is your heart
              <br />
              currently headquartered?
            </DialogTitle>
            <DialogDescription className="survey-description">
              Tell us about dating in one city over the last six months. No
              names, profiles, or exact locations. Answer any four of eight
              questions. Skip what you don’t know; a skipped question may leave
              part of your personal forecast unread.
            </DialogDescription>
            {alreadySubmitted ? (
              <div className="form-notice">
                <Check size={20} />
                <p>
                  This browser has already sent a signal this season. Thanks for
                  being part of the experiment. Your receipt is under “Your
                  signal” on the atlas.
                </p>
              </div>
            ) : (
              <>
                <label className="field-label" htmlFor="survey-city">
                  YOUR CITY
                </label>
                <CityPicker
                  id="survey-city"
                  value={city}
                  onChange={(id) => {
                    setCity(id);
                    saveDraft({ city: id, answers, habitat });
                  }}
                />
                <p className="input-help">
                  {CITY_BY_ID.size} cities in our first season. Only choose a
                  city you know through dating.
                </p>
                <label className="check-label" htmlFor="adult-consent">
                  <Checkbox
                    id="adult-consent"
                    checked={adult}
                    onCheckedChange={(v) => setAdult(!!v)}
                    aria-label="I am 18 or older"
                  />
                  <span>I am 18 or older.</span>
                </label>
                <label className="check-label" htmlFor="resident-consent">
                  <Checkbox
                    id="resident-consent"
                    checked={resident}
                    onCheckedChange={(v) => setResident(!!v)}
                    aria-label="I have dating experience in this city"
                  />
                  <span>
                    I have lived or dated in this city in the last six months.
                  </span>
                </label>
                <div className="privacy-mini">
                  <ShieldCheck size={17} />
                  <span>
                    Your report stays private. Only city summaries with enough
                    contributions are released.
                  </span>
                </div>
              </>
            )}
          </>
        )}
        {step >= 1 && step <= 4 && (
          <>
            <DialogTitle
              className="survey-title compact"
              ref={heading}
              tabIndex={-1}
            >
              {
                [
                  'Let’s check for chemistry.',
                  'Every city has a price.',
                  'Clear skies or mixed signals?',
                  'One last atmospheric reading.',
                ][step - 1]
              }
            </DialogTitle>
            <DialogDescription className="survey-description">
              Think about your own experiences in {cityName}. All experiences
              are welcome, including the deeply confusing ones.
            </DialogDescription>
            <div className="question-pair">
              {QUESTIONS.slice((step - 1) * 2, step * 2).map((q, i) => (
                <fieldset className="question-block" key={q.id}>
                  <legend>
                    <span>0{(step - 1) * 2 + i + 1}</span>
                    {q.title}
                  </legend>
                  <p id={`${q.id}-question`}>{q.question}</p>
                  <RadioGroup
                    aria-labelledby={`${q.id}-question`}
                    value={
                      answers[q.id] === null ? 'skip' : String(answers[q.id])
                    }
                    onValueChange={(v) =>
                      updateAnswer(q.id, v === 'skip' ? null : Number(v))
                    }
                    className="score-group"
                  >
                    <div className="score-options">
                      {[1, 2, 3, 4, 5].map((v) => (
                        <label
                          key={v}
                          htmlFor={`${q.id}-${v}`}
                          className={`score-option ${answers[q.id] === v ? 'chosen' : ''}`}
                        >
                          <RadioGroupItem
                            id={`${q.id}-${v}`}
                            value={String(v)}
                            aria-label={`${v} of 5${v === 1 ? ', ' + q.low : v === 5 ? ', ' + q.high : ''}`}
                            className="score-radio"
                          />
                          <span>{v}</span>
                        </label>
                      ))}
                    </div>
                    <div className="score-anchors">
                      <span>{q.low}</span>
                      <span>{q.high}</span>
                    </div>
                    <label className="skip-option" htmlFor={`${q.id}-skip`}>
                      <RadioGroupItem
                        id={`${q.id}-skip`}
                        value="skip"
                        aria-label={`Not enough experience for ${q.title}`}
                      />{' '}
                      Not enough experience / skip
                    </label>
                  </RadioGroup>
                  <p className="question-aside">{q.aside}</p>
                </fieldset>
              ))}
            </div>
          </>
        )}
        {step === 5 && (
          <>
            <DialogTitle
              className="survey-title compact"
              ref={heading}
              tabIndex={-1}
            >
              Where do the plot twists start?
            </DialogTitle>
            <DialogDescription className="survey-description">
              Where do you most often meet potential dates in {cityName}?
            </DialogDescription>
            <RadioGroup
              value={habitat ?? ''}
              onValueChange={(v) => {
                setHabitat(v as Submission['habitat']);
                saveDraft({
                  city,
                  answers,
                  habitat: v as Submission['habitat'],
                });
              }}
              className="habitat-options"
              aria-label="Meet-cute habitat"
            >
              {HABITATS.map((h) => (
                <label
                  key={h.id}
                  htmlFor={`habitat-${h.id}`}
                  className={`habitat-option ${habitat === h.id ? 'chosen' : ''}`}
                >
                  <span className="habitat-emoji" aria-hidden="true">
                    {h.emoji}
                  </span>
                  <span>
                    <b>{h.label}</b>
                    <small>{h.detail}</small>
                  </span>
                  <RadioGroupItem
                    id={`habitat-${h.id}`}
                    value={h.id}
                    aria-label={h.label}
                  />
                </label>
              ))}
            </RadioGroup>
            <div className="survey-summary">
              <span>
                <MapPin size={14} />
                {cityName}
              </span>
              <span>
                {Object.values(answers).filter((v) => v !== null).length} of 8
                questions answered
              </span>
            </div>
            <label
              className="check-label consent-label"
              htmlFor="aggregation-consent"
            >
              <Checkbox
                id="aggregation-consent"
                checked={consent}
                onCheckedChange={(v) => setConsent(!!v)}
                aria-label="I agree to anonymous city summaries"
              />
              <span>
                I agree to my answers being combined into anonymous city
                summaries. I can delete my private report with my receipt.{' '}
                <button type="button" className="text-link" onClick={onPrivacy}>
                  Read the data promise.
                </button>
              </span>
            </label>
            <p className="input-help">
              Your device keeps a private receipt. Please download it if you
              want to delete your report later.
            </p>
          </>
        )}
        {step === 6 && receipt && (
          <>
            <div className="receipt-hero">
              <span className="success-orbit">
                <Check size={38} />
              </span>
              <span className="eyebrow">TRANSMISSION SUCCESSFUL</span>
              <DialogTitle className="survey-title" ref={heading} tabIndex={-1}>
                You are officially
                <br />
                part of the atmosphere.
              </DialogTitle>
              <DialogDescription className="survey-description">
                One anonymous signal from {cityName}. One slightly better
                picture of the planet.
              </DialogDescription>
            </div>
            <div className="forecast-ticket">
              <span>YOUR PERSONAL FORECAST</span>
              <h3>{receipt.label}</h3>
              <p>
                Based only on your answers. This is your weather, not a verdict
                on {cityName}.
              </p>
              <div>
                <span>{cityName.toUpperCase()}</span>
                <Sparkles size={18} />
                <span>SEASON 001</span>
              </div>
            </div>
            <div className="receipt-actions">
              <a href="/api/reminder" className="button primary">
                <CalendarPlus size={18} /> Add reveal to calendar
              </a>
              <button
                className="button outline"
                onClick={() =>
                  downloadText(
                    'mixed-signals-private-receipt.json',
                    JSON.stringify(receipt, null, 2),
                    'application/json',
                  )
                }
              >
                <Download size={17} /> Save private receipt
              </button>
            </div>
            <p className="receipt-warning">
              {stored
                ? 'Your receipt is saved on this device.'
                : 'Your browser blocked receipt storage. Download your receipt now.'}{' '}
              Keep it private. Anyone with it can delete your report. No email
              required.
            </p>
          </>
        )}
        {step < 6 && pendingBody.current && !busy && (
          <p className="form-footnote">
            Your first send may already have arrived. Retrying confirms that
            original report, including its original answers. You can withdraw it
            afterward to make changes.
          </p>
        )}
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <div className="survey-bottom">
          {step > 0 && step < 6 ? (
            <button
              className="back-button"
              disabled={busy}
              onClick={() => {
                setStep(step - 1);
                setError('');
              }}
            >
              <ArrowLeft size={16} /> Back
            </button>
          ) : (
            <span className="form-footnote">
              {step === 6
                ? 'SEE YOU AT THE REVEAL.'
                : 'ANONYMOUS BY DEFAULT. ALWAYS.'}
            </span>
          )}
          {step < 5 && !alreadySubmitted ? (
            <button
              className="button dark"
              onClick={next}
              disabled={step === 0 && !ready}
            >
              {ready ? 'Continue' : 'Connecting'}
              <ArrowRight size={17} />
            </button>
          ) : step === 5 ? (
            <button className="button dark" onClick={submit} disabled={busy}>
              {busy ? 'Sending your signal…' : 'Send my signal'}
              <ArrowUpRight size={17} />
            </button>
          ) : (
            <button className="button dark" onClick={() => onOpenChange(false)}>
              Back to the atlas <ArrowRight size={17} />
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
