'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  Globe2,
  LockKeyhole,
  Heart,
  Sparkles,
  Search,
  CalendarPlus,
  Share2,
  Download,
  X,
  Info,
  Code2,
  Check,
  CloudSun,
  LoaderCircle,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Globe } from '@/components/atlas/globe';
import { Survey } from '@/components/atlas/survey';
import { InfoDialog } from '@/components/atlas/info';
import { CityInsights } from '@/components/atlas/city-insights';
import { ReceiptDialog } from '@/components/atlas/receipt';
import { CAMPAIGN, type CampaignPhase, timeRemaining } from '@/lib/campaign';
import { CITIES, CITY_BY_ID, searchCities } from '@/lib/cities';
import {
  DEMO_RESULTS,
  METRICS,
  type MetricKey,
  type CityResult,
} from '@/lib/forecast';
import { HABITATS } from '@/lib/survey';
import { api, readReceipt, type Receipt, downloadText } from '@/lib/client';
import { registerAtlasTools } from '@/lib/webmcp';
interface Status {
  campaign: typeof CAMPAIGN;
  phase: CampaignPhase;
  serverNow: string;
}
export default function Home() {
  const [hydrated, setHydrated] = useState(false),
    [surveyVersion, setSurveyVersion] = useState(0);
  const [surveyOpen, setSurveyOpen] = useState(false),
    [info, setInfo] = useState<'privacy' | 'methodology' | 'about' | null>(
      null,
    ),
    [receiptOpen, setReceiptOpen] = useState(false),
    [receipt, setReceipt] = useState<Receipt | null>(null),
    [mode, setMode] = useState<'preview' | 'live'>('preview'),
    [metric, setMetric] = useState<MetricKey>('chemistry'),
    [selected, setSelected] = useState<string | null>(null),
    [query, setQuery] = useState(''),
    [region, setRegion] = useState('All regions'),
    [status, setStatus] = useState<Status | null>(null),
    [statusError, setStatusError] = useState(''),
    [liveResults, setLiveResults] = useState<CityResult[]>([]),
    [resultsError, setResultsError] = useState(''),
    [now, setNow] = useState<number | null>(null),
    [offset, setOffset] = useState(0),
    [loading, setLoading] = useState(false),
    [showAll, setShowAll] = useState(false);
  const selectCity = useCallback((id: string) => {
    if (!CITY_BY_ID.has(id)) return;
    setSelected(id);
    const url = new URL(window.location.href);
    url.searchParams.set('city', id);
    window.history.replaceState({}, '', url);
  }, []);
  const startSurvey = useCallback(() => setSurveyOpen(true), []);
  const refreshStatus = useCallback(async () => {
    try {
      const data = await api<Status>('/api/status');
      setStatus(data);
      setOffset(Date.parse(data.serverNow) - Date.now());
      setStatusError('');
    } catch (e) {
      setStatusError(
        e instanceof Error
          ? e.message
          : 'The survey service is temporarily unavailable.',
      );
    }
  }, []);
  useEffect(() => {
    setHydrated(true);
    setReceipt(readReceipt());
    const url = new URL(window.location.href);
    const id = url.searchParams.get('city');
    if (id && CITY_BY_ID.has(id)) setSelected(id);
    if (url.searchParams.get('mode') === 'live') setMode('live');
    const requestedMetric = url.searchParams.get('metric');
    if (requestedMetric && Object.hasOwn(METRICS, requestedMetric))
      setMetric(requestedMetric as MetricKey);
    void refreshStatus();
    const poll = setInterval(refreshStatus, 60000);
    return () => clearInterval(poll);
  }, [refreshStatus]);
  useEffect(() => {
    setNow(Date.now() + offset);
    const tick = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(tick);
  }, [offset]);
  useEffect(() => {
    if (
      now &&
      status?.phase === 'collecting' &&
      now >= Date.parse(status.campaign.revealsAt)
    )
      void refreshStatus();
  }, [now, status, refreshStatus]);
  useEffect(
    () => registerAtlasTools({ selectCity, setMetric, startSurvey }),
    [selectCity, startSurvey],
  );
  const loadResults = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api<{ cities: CityResult[] }>('/api/results');
      setLiveResults(result.cities);
      setResultsError('');
    } catch (e) {
      setResultsError(
        e instanceof Error ? e.message : 'City reports are unavailable.',
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (mode === 'live' && status?.phase === 'revealed') void loadResults();
  }, [mode, status?.phase, loadResults]);
  const demo = mode === 'preview',
    revealed = status?.phase === 'revealed',
    data = demo ? DEMO_RESULTS : liveResults;
  const cityResults = useMemo(() => {
    const matching = new Set(searchCities(query).map((c) => c.id));
    return data
      .filter(
        (r) =>
          matching.has(r.cityId) &&
          (region === 'All regions' ||
            CITY_BY_ID.get(r.cityId)?.region === region),
      )
      .sort((a, b) =>
        (CITY_BY_ID.get(a.cityId)?.name ?? '').localeCompare(
          CITY_BY_ID.get(b.cityId)?.name ?? '',
        ),
      );
  }, [data, query, region]);
  const activeResult = data.find((c) => c.cityId === selected),
    activeCity = selected ? CITY_BY_ID.get(selected) : null;
  const remaining = now ? timeRemaining(now, status?.campaign.revealsAt) : null;
  const revealText = now
    ? new Intl.DateTimeFormat(undefined, {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      }).format(new Date(CAMPAIGN.revealsAt))
    : '12 Sep · 13:00 UTC';
  async function share() {
    const url = new URL(window.location.href);
    url.searchParams.set('mode', mode);
    url.searchParams.set('metric', metric);
    if (selected) url.searchParams.set('city', selected);
    try {
      await navigator.clipboard.writeText(url.toString());
      toast.success('Atlas link copied. Your private report stays private.');
    } catch {
      toast.error(
        'Could not copy the link. You can copy this page’s address from your browser.',
      );
    }
  }
  function exportCsv() {
    const rows = [
      [
        'sample_type',
        'city',
        'country',
        'responses',
        'chemistry',
        'chemistry_n',
        'mixed_signals',
        'mixed_signals_n',
        'friction',
        'friction_n',
      ],
      ...cityResults.map((r) => [
        demo ? 'ILLUSTRATIVE' : 'VOLUNTARY_SURVEY',
        CITY_BY_ID.get(r.cityId)?.name ?? r.cityId,
        CITY_BY_ID.get(r.cityId)?.country ?? '',
        r.n,
        r.chemistry.value ?? '',
        r.chemistry.n,
        r.fog.value ?? '',
        r.fog.n,
        r.friction.value ?? '',
        r.friction.n,
      ]),
    ];
    downloadText(
      `mixed-signals-${demo ? 'illustrative-preview' : 'season-001'}-aggregates.csv`,
      rows
        .map((row) =>
          row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(','),
        )
        .join('\r\n'),
      'text/csv;charset=utf-8',
    );
  }
  return (
    <main>
      <a href="#atlas" className="skip-link">
        Skip to atlas
      </a>
      <header className="site-header">
        <a href="/" className="wordmark" aria-label="Mixed Signals home">
          <span className="brand-symbol" aria-hidden="true">
            ✳
          </span>{' '}
          mixed signals<span className="wordmark-dot">↗</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#atlas" className="active">
            The atlas
          </a>
          <a href="#how-it-works">
            How it works <ArrowUpRight size={14} />
          </a>
          <button onClick={() => setInfo('about')}>The story</button>
        </nav>
        <span className="season">
          <span className="live-dot" /> SEASON 001 ·{' '}
          {revealed
            ? 'REVEALED'
            : status?.phase === 'upcoming'
              ? 'OPENING SOON'
              : status
                ? 'COLLECTING'
                : 'CONNECTING'}
        </span>
      </header>
      <section className="intro clarity-intro">
        <div className="intro-copy">
          <span className="eyebrow">
            <Globe2 size={15} /> AN ANONYMOUS SURVEY OF DATING, CITY BY CITY
          </span>
          <h1>
            What’s dating
            <br />
            actually like
            <br />
            <span>in your city?</span>
            <span className="title-spark" aria-hidden="true">
              ✳
            </span>
          </h1>
          <p>
            Share what dating feels like, then compare anonymous city reports.
            Good chemistry. Terrible commute. All useful context.
          </p>
          <span className="intro-explainer">
            Mixed Signals is a survey, not a dating app. One “signal” simply
            means one person’s anonymous response.
          </span>
        </div>
        <div className="participation-card">
          <span className="eyebrow">YOUR DATING DEBRIEF HAS A DAY JOB</span>
          <h2>
            A little perspective.
            <br />
            <em>A bigger picture.</em>
          </h2>
          <p>
            {revealed
              ? 'Collection is closed. Explore the combined experiences of contributors in the published city reports.'
              : 'Answer up to 8 questions about connection, communication, and the practical side of dating.'}
          </p>
          <div
            className={`participation-facts ${revealed ? 'collection-finished' : ''}`}
          >
            <span>
              <Check size={15} /> About 2 minutes
            </span>
            <span>
              <LockKeyhole size={15} /> No account or email
            </span>
            <span>
              <Heart size={15} /> Adults 18+
            </span>
          </div>
          <p className="participation-payoff">
            {revealed ? (
              <>
                <b>Community reports are open.</b>
                <br />
                Collection is closed. Small samples stay private.
              </>
            ) : (
              <>
                <b>Your private summary: now.</b>
                <br />
                Community city reports: 12 September.
              </>
            )}
          </p>
          <button
            className="button primary"
            disabled={!hydrated}
            onClick={() =>
              revealed
                ? setMode('live')
                : receipt
                  ? setReceiptOpen(true)
                  : setSurveyOpen(true)
            }
          >
            {revealed
              ? 'Explore community results'
              : receipt
                ? 'View my saved report'
                : 'Take the 2-minute survey'}
            <ArrowUpRight size={20} />
          </button>
          <button
            className="participation-secondary"
            onClick={() => {
              setMode('preview');
              document.getElementById('atlas')?.scrollIntoView({
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
                  .matches
                  ? 'instant'
                  : 'smooth',
              });
            }}
          >
            Explore example results <ArrowRight size={15} />
          </button>
          <span className="participation-note">
            {revealed
              ? 'These responses describe contributors, not everyone in a city.'
              : 'Answer at least 4. Skip anything you can’t judge.'}
          </span>
        </div>
      </section>
      <section
        className="experiment-journey"
        aria-label="What you contribute and what you get"
      >
        <div className="journey-step">
          <span className="journey-number">01</span>
          <div>
            <span className="eyebrow">YOU CONTRIBUTE</span>
            <h2>Your experience, anonymously.</h2>
            <p>
              Think about dating in one city over the last six months. No names,
              profiles, or exact locations.
            </p>
          </div>
        </div>
        <div className="journey-step">
          <span className="journey-number">02</span>
          <div>
            <span className="eyebrow">YOU GET · IMMEDIATELY</span>
            <h2>A private answer summary.</h2>
            <p>
              See your scores for the question groups you complete. Keep a
              private receipt to delete your response.
            </p>
          </div>
        </div>
        <div className="journey-step reveal-journey">
          <span className="journey-number">03</span>
          <div>
            <span className="eyebrow">
              EVERYONE GETS · {revealed ? 'OPEN NOW' : '12 SEPTEMBER'}
            </span>
            <h2>City reports to compare.</h2>
            <p>
              See patterns in connection, mixed messages, and date hassles. Each
              score needs 10 complete responses.
            </p>
            {!revealed && (
              <div
                className="compact-countdown"
                aria-label={
                  remaining
                    ? `${remaining.days} days, ${remaining.hours} hours and ${remaining.minutes} minutes until reveal`
                    : 'Connecting to the shared countdown'
                }
              >
                {remaining ? (
                  <>
                    <b>
                      {remaining.days}
                      <small>days</small>
                    </b>
                    <span>:</span>
                    <b>
                      {String(remaining.hours).padStart(2, '0')}
                      <small>hrs</small>
                    </b>
                    <span>:</span>
                    <b>
                      {String(remaining.minutes).padStart(2, '0')}
                      <small>min</small>
                    </b>
                  </>
                ) : (
                  'Connecting…'
                )}
              </div>
            )}
            <span className="journey-date">{revealText}</span>
            <a href="/api/reminder" className="calendar-link">
              <CalendarPlus size={15} /> Remind me at the reveal
            </a>
          </div>
        </div>
      </section>
      {statusError && (
        <div className="site-alert" role="alert">
          <span>{statusError} Preview exploration still works.</span>
          <button onClick={refreshStatus}>
            Retry connection <ArrowRight size={14} />
          </button>
        </div>
      )}
      <div className="atlas-toolbar">
        <Tabs
          value={mode}
          onValueChange={(v) => {
            setMode(v as 'preview' | 'live');
            setSelected(null);
          }}
        >
          <TabsList className="mode-tabs" aria-label="Atlas data source">
            <TabsTrigger value="preview" disabled={!hydrated}>
              <Globe2 size={14} /> Example results
            </TabsTrigger>
            <TabsTrigger value="live" disabled={!hydrated}>
              {revealed ? <Sparkles size={14} /> : <LockKeyhole size={14} />}{' '}
              {revealed ? 'Community results' : 'Community results'}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <span className="toolbar-note">
          {demo
            ? 'You’re exploring invented example data. Your survey answers build the community results.'
            : revealed
              ? 'Collection is closed. These are frozen summaries of voluntary survey responses.'
              : 'Real responses are being collected. Community results open together on 12 September.'}
        </span>
        <button
          className="icon-button"
          aria-label="How the scores work"
          onClick={() => setInfo('methodology')}
        >
          <Info size={18} />
        </button>
      </div>
      <section
        id="atlas"
        aria-label="Dating weather atlas"
        className="atlas-layout"
      >
        <div className="map-stage">
          <div className="map-topline">
            <span>
              <Globe2 size={15} /> EXPLORE DATING BY CITY
            </span>
            <span className={`demo-badge ${demo ? '' : 'live-badge'}`}>
              {demo
                ? 'EXAMPLE · INVENTED DATA'
                : revealed
                  ? 'REAL · SEASON 001'
                  : 'SEALED UNTIL 12 SEP'}
            </span>
          </div>
          <div className="metric-tabs">
            <Tabs
              value={metric}
              onValueChange={(v) => setMetric(v as MetricKey)}
            >
              <TabsList
                aria-label="Dating experience score"
                className="map-tabs"
              >
                {(
                  Object.entries(METRICS) as [
                    MetricKey,
                    (typeof METRICS)[MetricKey],
                  ][]
                ).map(([key, m]) => (
                  <TabsTrigger key={key} value={key}>
                    <span style={{ background: m.color }} />
                    {m.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <p className="map-metric-definition">
              {METRICS[metric].direction}. Scores are out of 100, not
              percentages.
            </p>
          </div>
          <Globe
            results={data}
            selected={selected}
            metric={metric}
            onSelect={selectCity}
            demo={demo}
          />
          {activeResult && activeCity && (
            <div className="map-city-card" key={activeCity.id}>
              <div className="map-city-heading">
                <span>{demo ? 'EXAMPLE CITY' : 'CITY REPORT'}</span>
                <button
                  aria-label="Close selected city"
                  onClick={() => setSelected(null)}
                >
                  <X size={15} />
                </button>
              </div>
              <span className="city-country">{activeCity.country}</span>
              <h3>
                {activeCity.name}
                <ArrowUpRight size={17} />
              </h3>
              <p>
                {demo
                  ? 'Invented example, not real city data.'
                  : `${activeResult.n} anonymous responses. See the full city report.`}
              </p>
              <p className="map-result-hint">
                Read all three scores in the City report panel.
              </p>
              <button className="map-share" onClick={share}>
                <Share2 size={13} /> Share this view
              </button>
            </div>
          )}
          {selected && activeCity && !activeResult && (demo || revealed) && (
            <div className="map-city-card">
              <div className="map-city-heading">
                <span>{demo ? 'EXAMPLE RESULTS' : 'CITY REPORT'}</span>
                <button
                  aria-label="Close selected city"
                  onClick={() => setSelected(null)}
                >
                  <X size={15} />
                </button>
              </div>
              <h3>{activeCity.name}</h3>
              <p>
                {demo
                  ? 'This city has no invented example. You can still answer the survey for it.'
                  : 'This city did not meet the minimum response count. Small samples stay private.'}
              </p>
            </div>
          )}
          {!demo && !revealed && (
            <div className="sealed-overlay">
              <span>
                <LockKeyhole size={23} />
              </span>
              <h3>
                Community results
                <br />
                open on 12 September.
              </h3>
              <p>
                Compare city survey summaries from {revealText}.<br />
                Until then, all the numbers in Example results are invented.
              </p>
              <button
                className="button primary"
                onClick={() => setSurveyOpen(true)}
              >
                Take the survey <ArrowUpRight size={17} />
              </button>
            </div>
          )}
          {!demo &&
            revealed &&
            !loading &&
            !liveResults.length &&
            !resultsError && (
              <div className="sealed-overlay">
                <span>
                  <CloudSun size={25} />
                </span>
                <h3>A quiet first season.</h3>
                <p>
                  No city reached the minimum of 10 responses.
                  <br />
                  Your privacy matters more than filling a map.
                </p>
                <button
                  className="button primary"
                  onClick={() => setMode('preview')}
                >
                  Explore the illustrative preview <ArrowRight size={16} />
                </button>
              </div>
            )}
          {!demo && loading && (
            <output className="map-loading">
              <LoaderCircle className="spinner" /> Loading city reports…
            </output>
          )}
          {!demo && resultsError && (
            <div className="sealed-overlay">
              <h3>City reports could not load.</h3>
              <p>{resultsError}</p>
              <button className="button primary" onClick={loadResults}>
                Try again
              </button>
            </div>
          )}
          <div className="map-bottomline">
            <span>
              <span className="live-dot pink" /> {METRICS[metric].low}{' '}
              <span
                className="legend-ramp"
                style={{
                  background: `linear-gradient(90deg,#5b6644,${METRICS[metric].color})`,
                }}
              />{' '}
              {METRICS[metric].high}
            </span>
            <span>01 / PLANET EARTH</span>
          </div>
        </div>
        <CityInsights
          data={data}
          selected={selected}
          demo={demo}
          revealed={revealed}
          onSelect={selectCity}
          onSurvey={() =>
            receipt ? setReceiptOpen(true) : setSurveyOpen(true)
          }
        />
      </section>
      <section className="city-section" aria-labelledby="city-section-title">
        <div className="section-top">
          <div>
            <span className="eyebrow">
              {demo
                ? 'EXAMPLE CITY REPORTS · INVENTED DATA'
                : 'COMMUNITY CITY REPORTS'}
            </span>
            <h2 id="city-section-title">
              {demo
                ? 'Different cities. Different dating stories.'
                : 'What contributors told us.'}
            </h2>
          </div>
          <button
            className="subtle-button"
            onClick={() => setInfo('methodology')}
          >
            How to read this <ArrowUpRight size={14} />
          </button>
        </div>
        {demo || revealed ? (
          <>
            <div className="city-filters">
              <div className="search-box">
                <Search size={17} />
                <Input
                  placeholder="Find a city or country"
                  aria-label="Search city reports"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="city-search"
                />
              </div>
              <div
                className="region-filters"
                aria-label="Filter city reports by region"
              >
                {[
                  'All regions',
                  'Americas',
                  'Europe',
                  'Asia',
                  'Africa',
                  'Oceania',
                ].map((r) => (
                  <button
                    key={r}
                    aria-pressed={r === region}
                    onClick={() => setRegion(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <button
                className="icon-button"
                disabled={!cityResults.length}
                aria-label={
                  demo
                    ? 'Download illustrative data as CSV'
                    : 'Download anonymous aggregates as CSV'
                }
                onClick={exportCsv}
              >
                <Download size={17} />
              </button>
            </div>
            <div className="city-grid">
              {cityResults
                .slice(
                  0,
                  showAll || query || region !== 'All regions' ? 100 : 6,
                )
                .map((r) => {
                  const c = CITY_BY_ID.get(r.cityId)!;
                  const value = r[metric].value;
                  const habitat = HABITATS.find((h) => h.id === r.habitat);
                  return (
                    <button
                      className={`city-tile ${selected === r.cityId ? 'is-selected' : ''}`}
                      key={r.cityId}
                      onClick={() => {
                        selectCity(r.cityId);
                        document.getElementById('atlas')?.scrollIntoView({
                          behavior: window.matchMedia(
                            '(prefers-reduced-motion: reduce)',
                          ).matches
                            ? 'instant'
                            : 'smooth',
                          block: 'start',
                        });
                      }}
                    >
                      <div className="city-tile-top">
                        <span className="country-code">{c.code}</span>
                        <span className="sample-label">
                          {demo ? 'ILLUSTRATIVE' : `${r.n} RESPONSES`}
                        </span>
                        <ArrowUpRight size={17} />
                      </div>
                      <h3>{c.name}</h3>
                      <p>{r.forecast}</p>
                      <div className="city-tile-bottom">
                        <span>
                          <i style={{ background: METRICS[metric].color }} />
                          {METRICS[metric].label}
                        </span>
                        <strong>
                          {value ?? 'Hidden'}
                          {value !== null && <small>/100</small>}
                        </strong>
                      </div>
                      <div className="tile-meter">
                        <span
                          style={{
                            width: `${value ?? 0}%`,
                            background: METRICS[metric].color,
                          }}
                        />
                      </div>
                      <span className="tile-footnote">
                        {habitat
                          ? `${habitat.emoji} Most selected: ${habitat.label}`
                          : 'Meeting route not published'}{' '}
                        ·{' '}
                        {demo
                          ? 'Made-up data'
                          : `${r[metric].n || '<10'} complete responses`}
                      </span>
                    </button>
                  );
                })}
            </div>
            {!cityResults.length && (
              <div className="empty-cities">
                <Search size={25} />
                <h3>
                  {query
                    ? 'No forecast at those coordinates.'
                    : !demo
                      ? 'Not enough complete responses to publish.'
                      : 'No cities match this filter.'}
                </h3>
                <p>
                  {demo
                    ? 'The preview has 24 illustrative cities. The real survey covers ' +
                      CITIES.length +
                      ' cities.'
                    : 'Only cities with at least 10 reports can appear. Try another city or clear your filters.'}
                </p>
                {query || region !== 'All regions' ? (
                  <button
                    className="text-link"
                    onClick={() => {
                      setQuery('');
                      setRegion('All regions');
                    }}
                  >
                    Clear filters
                  </button>
                ) : null}
              </div>
            )}
            {!showAll &&
              !query &&
              region === 'All regions' &&
              cityResults.length > 6 && (
                <button className="browse-all" onClick={() => setShowAll(true)}>
                  Explore all {cityResults.length} {demo ? 'sample ' : ''}cities{' '}
                  <ArrowRight size={15} />
                </button>
              )}
            <p className="data-disclaimer">
              <Info size={13} />
              {demo
                ? 'Every number in the preview is invented to demonstrate the experience. Real submissions are kept separate.'
                : 'A voluntary, unrepresentative survey. Results describe contributors, not every person in a city.'}
            </p>
          </>
        ) : (
          <div className="collection-note">
            <LockKeyhole size={25} />
            <div>
              <h3>Your answers are private. City summaries come later.</h3>
              <p>
                Try the invented example reports to see exactly how connection,
                mixed messages, and date hassles will be compared.
              </p>
            </div>
            <button
              className="button outline"
              onClick={() => setMode('preview')}
            >
              Explore example results <ArrowRight size={16} />
            </button>
          </div>
        )}
      </section>
      <div className="ticker" aria-hidden="true">
        <span>EMOTIONALLY AVAILABLE DATA</span>
        <span>✳</span>
        <span>NO EXES WERE NAMED IN THE MAKING OF THIS ATLAS</span>
        <span>✳</span>
        <span>HUMAN FEELINGS. QUESTIONABLE FORECASTS.</span>
        <span>✳</span>
      </div>
      <section id="how-it-works" className="meaning-section">
        <div>
          <span className="eyebrow">USEFUL CONTEXT. NO CRYSTAL BALL.</span>
          <h2>
            What can a city
            <br />
            <em>report tell you?</em>
          </h2>
        </div>
        <div>
          <h3>Notice the tradeoffs.</h3>
          <p>
            A city can feel great for connection and tough on the calendar. Read
            the three scores together to understand the experiences people
            shared.
          </p>
        </div>
        <div>
          <h3>Start better conversations.</h3>
          <p>
            Compare the same scores across cities, with each sample count
            visible. These volunteers don’t represent everyone, and a score
            can’t predict your next date.
          </p>
          <button className="text-link" onClick={() => setInfo('methodology')}>
            Read how scoring works <ArrowUpRight size={14} />
          </button>
        </div>
      </section>
      <div className="closing-strip">
        <span className="closing-spark" aria-hidden="true">
          ✳
        </span>
        <p>
          The world is complicated.
          <br />
          <span>Let's compare notes.</span>
        </p>
        <button
          className="button dark"
          disabled={!hydrated}
          onClick={() => (revealed ? setMode('live') : setSurveyOpen(true))}
        >
          {revealed ? 'Explore community results' : 'Take the survey'}
          <ArrowUpRight size={18} />
        </button>
      </div>
      <footer>
        <a href="/" className="wordmark">
          <span className="brand-symbol" aria-hidden="true">
            ✳
          </span>{' '}
          mixed signals
        </a>
        <span>
          A love letter to collective oversharing. <Heart size={14} />
        </span>
        <div className="footer-links">
          <button onClick={() => setReceiptOpen(true)}>
            My report & deletion
          </button>
          <button onClick={() => setInfo('privacy')}>Data promise</button>
          <a
            href="https://github.com/shi1720/mixed-signals"
            aria-label="Mixed Signals on GitHub"
            target="_blank"
            rel="noreferrer"
          >
            <Code2 size={18} />
          </a>
        </div>
      </footer>
      <Survey
        key={surveyVersion}
        open={surveyOpen}
        onOpenChange={setSurveyOpen}
        onSubmitted={setReceipt}
        onPrivacy={() => setInfo('privacy')}
        initialCity={selected}
      />
      <InfoDialog section={info} onClose={() => setInfo(null)} />
      <ReceiptDialog
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        receipt={receipt}
        onChange={(value) => {
          setReceipt(value);
          if (value === null) setSurveyVersion((v) => v + 1);
        }}
      />
      <Toaster position="bottom-right" />
    </main>
  );
}
