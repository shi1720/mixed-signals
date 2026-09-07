'use client';
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="not-found">
      <h1>We couldn’t load this page.</h1>
      <p>
        Please try again. If this happened during submission, reopen the survey
        to check whether your response arrived.
      </p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
      <a href="/">Back to Mixed Signals</a>
    </main>
  );
}
