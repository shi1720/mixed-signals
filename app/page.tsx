'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  Radio,
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
          : 'The signal tower is temporarily unavailable.',
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
        e instanceof Error ? e.message : 'The forecast is unavailable.',
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
      <section className="intro">
        <div>
          <span className="eyebrow">
            <Radio size={14} /> A PLANET-SIZED DATING EXPERIMENT
          </span>
          <h1>
            It's not you.
            <br />
            It's your <span>coordinates.</span>
            <span className="title-spark" aria-hidden="true">
              ✳
            </span>
          </h1>
          <p>
            Good dates. Bad dates. “What are we?” dates.
            <br />
            Help us map the world's dating weather.
          </p>
        </div>
        <div className="intro-right">
          <span className="edition">LOVE IS IN THE AIR. SO IS CONFUSION.</span>
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
              ? 'Explore the reveal'
              : receipt
                ? 'Your signal is in'
                : 'Drop your signal'}{' '}
            {receipt && !revealed ? (
              <Check size={19} />
            ) : (
              <ArrowUpRight size={19} />
            )}
          </button>
          <p>
            {receipt
              ? 'Thank you for adding to the atmosphere.'
              : '90 seconds. Anonymous. Mildly therapeutic.'}
          </p>
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
              <Globe2 size={14} /> Preview atlas
            </TabsTrigger>
            <TabsTrigger value="live" disabled={!hydrated}>
              {revealed ? <Sparkles size={14} /> : <LockKeyhole size={14} />}{' '}
              {revealed ? 'The real reveal' : 'Live experiment'}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <span className="toolbar-note">
          {demo
            ? 'A sneak peek with made-up data. Real feelings arrive at the reveal.'
            : revealed
              ? 'The season is sealed. These are the contributors’ collective signals.'
              : 'We’re collecting real signals. All city results stay sealed until the reveal.'}
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
              <Globe2 size={15} /> THE DATING ATMOSPHERE
            </span>
            <span className={`demo-badge ${demo ? '' : 'live-badge'}`}>
              {demo
                ? 'ILLUSTRATIVE PREVIEW'
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
              <TabsList aria-label="Weather metric" className="map-tabs">
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
                <span>{demo ? 'SAMPLE FORECAST' : 'CITY FORECAST'}</span>
                <button
                  aria-label="Close city forecast"
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
              <p>{activeResult.forecast}</p>
              <div className="active-score">
                <strong>{activeResult[metric].value ?? '·'}</strong>
                <span>
                  {METRICS[metric].label}
                  <small>
                    {activeResult[metric].value === null
                      ? 'Not enough complete signals'
                      : `${activeResult[metric].n} ${demo ? 'sample' : 'complete'} signals`}
                  </small>
                </span>
              </div>
              <div className="score-bar">
                <span
                  style={{
                    width: `${activeResult[metric].value ?? 0}%`,
                    background: METRICS[metric].color,
                  }}
                />
              </div>
              <button className="map-share" onClick={share}>
                <Share2 size={13} /> Share this view
              </button>
            </div>
          )}
          {selected && activeCity && !activeResult && (demo || revealed) && (
            <div className="map-city-card">
              <div className="map-city-heading">
                <span>{demo ? 'PREVIEW ATLAS' : 'CITY FORECAST'}</span>
                <button
                  aria-label="Close city forecast"
                  onClick={() => setSelected(null)}
                >
                  <X size={15} />
                </button>
              </div>
              <h3>{activeCity.name}</h3>
              <p>
                {demo
                  ? 'This city has no illustrative fixture. It is available in the real survey.'
                  : 'No publishable forecast for this city. Small samples stay private.'}
              </p>
            </div>
          )}
          {!demo && !revealed && (
            <div className="sealed-overlay">
              <span>
                <LockKeyhole size={23} />
              </span>
              <h3>
                Some things need
                <br />a little time.
              </h3>
              <p>
                Real city signals unlock together on {revealText}.<br />
                No peeking. Not even for your ex.
              </p>
              <button
                className="button primary"
                onClick={() => setSurveyOpen(true)}
              >
                Add your anonymous signal <ArrowUpRight size={17} />
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
                  No city reached the 10-signal threshold.
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
              <LoaderCircle className="spinner" /> Reading the atmosphere…
            </output>
          )}
          {!demo && resultsError && (
            <div className="sealed-overlay">
              <h3>The forecast is delayed.</h3>
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
        <aside className="reveal-card">
          <span className="eyebrow">
            {revealed ? 'THE GREAT REVEAL' : 'THE GREAT REVEAL · 12 SEP'}
          </span>
          <h2>
            {revealed ? (
              <>
                The atmosphere
                <br />
                is out in the open.
              </>
            ) : (
              <>
                A week of secrets.
                <br />
                One big reveal.
              </>
            )}
          </h2>
          <p>
            {revealed
              ? 'Explore the anonymous city forecasts. One collective snapshot, frozen in time. The group chat has entered its data era.'
              : 'Send an anonymous signal from your city. Come back at the shared reveal to see what the planet is really feeling.'}
          </p>
          {!revealed ? (
            <>
              <div
                className="countdown"
                aria-label={
                  remaining
                    ? `${remaining.days} days, ${remaining.hours} hours and ${remaining.minutes} minutes until reveal`
                    : 'Connecting to the shared countdown'
                }
              >
                {(['days', 'hours', 'minutes'] as const).map((unit, i) => (
                  <div className="countdown-unit" key={unit}>
                    {i > 0 && <span className="countdown-colon">:</span>}
                    <span>
                      {remaining
                        ? String(remaining[unit]).padStart(2, '0')
                        : '··'}
                    </span>
                    <small>
                      {unit === 'minutes' ? 'MINS' : unit.toUpperCase()}
                    </small>
                  </div>
                ))}
              </div>
              <span className="reveal-date">
                {revealText} · your local time
              </span>
            </>
          ) : (
            <div className="reveal-complete">
              <Sparkles size={30} />
              <span>Season 001 is open.</span>
            </div>
          )}
          <div className="card-rule" />
          <span className="lock-note">
            <ShieldIcon />
            {revealed
              ? 'Small samples stay private. Always.'
              : 'City results need at least 10 signals.'}
          </span>
          <button
            className="button dark"
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
              ? 'Read the atmosphere'
              : receipt
                ? 'View your private receipt'
                : 'Count me in'}
            <ArrowRight size={18} />
          </button>
          <a className="calendar-link" href="/api/reminder">
            <CalendarPlus size={14} /> Add the reveal to my calendar
          </a>
          <span className="tiny-note">
            No names. No exes. Just city-level signals.
          </span>
        </aside>
      </section>
      <section className="city-section" aria-labelledby="city-section-title">
        <div className="section-top">
          <div>
            <span className="eyebrow">
              {demo ? 'A TASTE OF THE ATMOSPHERE' : 'THE CITY FIELD GUIDE'}
            </span>
            <h2 id="city-section-title">
              {demo
                ? 'Different cities. Same “you up?”'
                : 'Every city has a story.'}
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
                  aria-label="Search city forecasts"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="city-search"
                />
              </div>
              <div
                className="region-filters"
                aria-label="Filter forecasts by region"
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
                          {demo ? 'ILLUSTRATIVE' : `${r.n} SIGNALS`}
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
                          {value ?? 'Sealed'}
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
                          ? `${habitat.emoji} ${habitat.label} territory`
                          : 'City-level perspective'}{' '}
                        ·{' '}
                        {demo
                          ? 'Made-up data'
                          : `${r[metric].n || '<10'} complete reports`}
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
                      ? 'Not enough signals to publish yet.'
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
              <h3>The cities are keeping their secrets.</h3>
              <p>
                While the signals roll in, explore a clearly labeled preview of
                how the atlas will work.
              </p>
            </div>
            <button
              className="button outline"
              onClick={() => setMode('preview')}
            >
              See the preview <ArrowRight size={16} />
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
      <section id="how-it-works" className="how-section">
        <div>
          <span className="eyebrow">HOW THIS LITTLE EXPERIMENT WORKS</span>
          <h2>
            Your love life.
            <br />
            For <em>questionable</em> science.
          </h2>
        </div>
        <div className="how-step">
          <span>
            01 <Radio />
          </span>
          <h3>Send a signal.</h3>
          <p>
            Your city, your experience, a few oddly specific questions. No
            account required. Adults 18+ only.
          </p>
        </div>
        <div className="how-step">
          <span>
            02 <LockKeyhole />
          </span>
          <h3>Let it simmer.</h3>
          <p>
            One shared seven-day countdown, ending 12 September. Your personal
            forecast arrives straight away.
          </p>
        </div>
        <div className="how-step">
          <span>
            03 <Sparkles />
          </span>
          <h3>Read the atmosphere.</h3>
          <p>
            Explore the world's dating weather. Finally, your group chat has a
            map. Only cities with enough signals appear.
          </p>
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
          {revealed ? 'Explore the reveal' : 'Put your city on the map'}
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
          <button onClick={() => setReceiptOpen(true)}>Your signal</button>
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
function ShieldIcon() {
  return <LockKeyhole size={15} />;
}
