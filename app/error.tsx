'use client';
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="not-found">
      <span className="brand-symbol">✳</span>
      <h1>A little atmospheric interference.</h1>
      <p>
        Something interrupted the page. Your submitted report is safe in the
        database.
      </p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
      <a href="/">Back to the atlas</a>
    </main>
  );
}
