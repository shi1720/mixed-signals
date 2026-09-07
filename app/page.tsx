'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  Globe2,
  LockKeyhole,
  Sparkles,
  Search,
  CalendarPlus,
  Share2,
  Download,
  X,
  Info,
  Code2,
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
    [resultsLoaded, setResultsLoaded] = useState(false),
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
  function exploreResults(nextMode: 'preview' | 'live') {
    setMode(nextMode);
    document.getElementById('atlas')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
      block: 'start',
    });
  }
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
      setResultsLoaded(true);
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
  const canContribute =
    status?.phase === 'collecting' &&
    (!now || now < Date.parse(status.campaign.revealsAt));
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
          mixed
          <span className="brand-divider" aria-hidden="true">
            /
          </span>
          signals
        </a>
        <nav aria-label="Main navigation">
          <a href="#atlas" className="active">
            City reports
          </a>
          <a href="#how-it-works">About the survey</a>
          <button onClick={() => setInfo('about')}>Why this exists</button>
        </nav>
        <span className="season">
          <span className="live-dot" /> September 2026 ·{' '}
          {revealed
            ? 'Results open'
            : status?.phase === 'upcoming'
              ? 'Opening soon'
              : status
                ? 'Survey open'
                : 'Connecting'}
        </span>
      </header>
      <section className="survey-opening" aria-labelledby="opening-title">
        <div className="opening-copy">
          <p className="section-label">
            An anonymous survey of dating, city by city
          </p>
          <h1 id="opening-title">
            What’s dating like <br />
            in your city?
          </h1>
          <p>
            {revealed
              ? 'Read what people told us about meeting people, mixed messages and the practical side of dating in their cities.'
              : 'Tell us about meeting people, mixed messages and the practical side of dating. We’ll bring the responses together in city reports.'}
          </p>
        </div>
        <div className="opening-action">
          <p className="action-detail">
            {revealed
              ? 'This survey has closed'
              : '8 questions · about 2 minutes'}
          </p>
          <button
            className="button primary"
            disabled={!hydrated || (!receipt && !revealed && !canContribute)}
            onClick={() =>
              receipt
                ? setReceiptOpen(true)
                : revealed
                  ? exploreResults('live')
                  : setSurveyOpen(true)
            }
          >
            {receipt
              ? 'View my saved report'
              : revealed
                ? 'Explore community results'
                : status?.phase === 'upcoming'
                  ? 'Survey opens 5 September'
                  : 'Take the 2-minute survey'}
            <ArrowRight size={19} />
          </button>
          <p className="action-eligibility">Adults 18+ · No account or email</p>
          <div className="opening-outcomes">
            {revealed ? (
              <p>
                Explore the combined experiences of people who took part. Your
                saved report remains available below.
              </p>
            ) : (
              <>
                <p>
                  <span>For you</span> A private summary after you submit.
                </p>
                <p>
                  <span>For everyone</span> City reports on 12 September.
                </p>
              </>
            )}
          </div>
          <button
            className="text-link"
            onClick={() => exploreResults('preview')}
          >
            See an example city report
          </button>
        </div>
      </section>
      <section className="reveal-strip" aria-label="Survey timeline">
        <div>
          <span className="live-dot" />
          <p>
            <b>
              {revealed ? 'City reports are open' : 'Results open 12 September'}
            </b>
            <span>{revealText}</span>
          </p>
        </div>
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
                <b>
                  {String(remaining.hours).padStart(2, '0')}
                  <small>hrs</small>
                </b>
                <b>
                  {String(remaining.minutes).padStart(2, '0')}
                  <small>min</small>
                </b>
              </>
            ) : (
              'Checking the time…'
            )}
          </div>
        )}
        {!revealed && (
          <a href="/api/reminder" className="calendar-link">
            <CalendarPlus size={16} /> Add a calendar reminder
          </a>
        )}
        {revealed && (
          <span>Only reports with enough responses are published.</span>
        )}
      </section>
      {statusError && (
        <div className="site-alert" role="alert">
          <span>{statusError} Example reports are still available.</span>
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
              Community results
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <span className="toolbar-note">
          {demo
            ? 'Example data. These numbers are invented to show how city reports work.'
            : revealed
              ? 'Community results from this survey. Collection is closed.'
              : 'Responses stay private until the shared reveal on 12 September.'}
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
        aria-label="City dating reports"
        className="atlas-layout"
      >
        <div className="map-stage">
          <div className="map-topline">
            <span>
              <Globe2 size={15} /> The world, city by city
            </span>
            <span className={`demo-badge ${demo ? '' : 'live-badge'}`}>
              {demo
                ? 'Example data'
                : revealed
                  ? 'Community results'
                  : 'Opens 12 September'}
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
                <span>{demo ? 'Example data' : 'City report'}</span>
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
                Compare all three scores in the report beside the globe.
              </p>
              <button className="map-share" onClick={share}>
                <Share2 size={13} /> Share this view
              </button>
            </div>
          )}
          {selected &&
            activeCity &&
            !activeResult &&
            (demo ||
              (revealed && resultsLoaded && !loading && !resultsError)) && (
              <div className="map-city-card">
                <div className="map-city-heading">
                  <span>{demo ? 'Example data' : 'City report'}</span>
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
                    ? 'This city has no example report. Choose another city to explore.'
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
                disabled={!canContribute}
                onClick={() => setSurveyOpen(true)}
              >
                Take the survey <ArrowUpRight size={17} />
              </button>
            </div>
          )}
          {!demo &&
            revealed &&
            !loading &&
            resultsLoaded &&
            !liveResults.length &&
            !resultsError && (
              <div className="sealed-overlay">
                <span>
                  <CloudSun size={25} />
                </span>
                <h3>No city reports to publish yet.</h3>
                <p>
                  No city reached the minimum of 10 responses.
                  <br />
                  Smaller samples are kept private.
                </p>
                <button
                  className="button primary"
                  onClick={() => setMode('preview')}
                >
                  See example reports <ArrowRight size={16} />
                </button>
              </div>
            )}
          {!demo &&
            revealed &&
            (loading || (!resultsLoaded && !resultsError)) && (
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
                  background: `linear-gradient(90deg,#243d61,${METRICS[metric].color})`,
                }}
              />{' '}
              {METRICS[metric].high}
            </span>
            <span>Drag to rotate</span>
          </div>
        </div>
        <CityInsights
          data={data}
          selected={selected}
          demo={demo}
          revealed={revealed}
          loading={
            !demo && revealed && (loading || (!resultsLoaded && !resultsError))
          }
          error={!demo ? resultsError : ''}
          canContribute={canContribute}
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
              {demo ? 'Browse the reports' : 'Browse the reports'}
            </span>
            <h2 id="city-section-title">
              {demo ? 'Find a city.' : 'What contributors told us.'}
            </h2>
          </div>
          <button
            className="subtle-button"
            onClick={() => setInfo('methodology')}
          >
            How to read this <ArrowUpRight size={14} />
          </button>
        </div>
        {!demo && revealed && (loading || !resultsLoaded || resultsError) ? (
          <output className="collection-note">
            <p>
              {resultsError
                ? 'City reports could not load. Please use Try again above.'
                : 'Loading city reports…'}
            </p>
          </output>
        ) : demo || revealed ? (
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
                    ? 'Download example data as CSV'
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
                          {demo ? 'Example data' : `${r.n} responses`}
                        </span>
                        <ArrowUpRight size={17} />
                      </div>
                      <h3>{c.name}</h3>
                      <p>{c.country}</p>
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
                          ? `Most selected: ${habitat.label}`
                          : 'Meeting route not published'}{' '}
                        ·{' '}
                        {demo
                          ? 'Example data'
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
                  {query || region !== 'All regions'
                    ? 'No city matches your search.'
                    : !demo
                      ? 'No city reached 10 survey responses.'
                      : 'No cities match this filter.'}
                </h3>
                <p>
                  {demo
                    ? 'Example reports cover 24 cities. You can contribute to any of ' +
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
                  Explore all {cityResults.length} {demo ? 'example ' : ''}
                  cities <ArrowRight size={15} />
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
              <h3>City reports open together on 12 September.</h3>
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
      <section id="how-it-works" className="survey-context">
        <div>
          <p className="section-label">About the survey</p>
          <h2>
            Same city. <br />
            Different experiences.
          </h2>
        </div>
        <div>
          <p>
            One person’s great dating city can be another person’s scheduling
            problem. We collect experiences from the last six months, then
            combine them into three scores: connection, mixed messages, and date
            hassles.
          </p>
          <p>
            These reports describe the people who chose to take part. They don’t
            represent everyone in a city, and they can’t predict your next date.
          </p>
          <div className="context-links">
            <button
              className="text-link"
              onClick={() => setInfo('methodology')}
            >
              How we calculate the scores
            </button>
            <button className="text-link" onClick={() => setInfo('privacy')}>
              How we protect responses
            </button>
          </div>
        </div>
      </section>
      <footer>
        <a href="/" className="wordmark">
          mixed
          <span className="brand-divider" aria-hidden="true">
            /
          </span>
          signals
        </a>
        <span>An independent project by Shivam Gupta.</span>
        <div className="footer-links">
          <button disabled={!hydrated} onClick={() => setReceiptOpen(true)}>
            My report & deletion
          </button>
          <button onClick={() => setInfo('privacy')}>Privacy & data</button>
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
        phase={status?.phase ?? null}
        onExplore={() => {
          setSurveyOpen(false);
          exploreResults('live');
        }}
      />
      <InfoDialog section={info} onClose={() => setInfo(null)} />
      <ReceiptDialog
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        receipt={receipt}
        revealed={revealed}
        onExplore={() => {
          setReceiptOpen(false);
          exploreResults('live');
        }}
        onRecover={() => {
          setReceiptOpen(false);
          setSurveyOpen(true);
        }}
        onChange={(value) => {
          setReceipt(value);
          if (value === null) setSurveyVersion((v) => v + 1);
        }}
      />
      <Toaster position="bottom-right" />
    </main>
  );
}
