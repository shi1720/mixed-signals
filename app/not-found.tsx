import { ArrowLeft } from 'lucide-react';
export default function NotFound() {
  return (
    <main className="not-found">
      <span className="eyebrow">404 · Page not found</span>
      <h1>This page isn’t here.</h1>
      <p>
        The link may be incomplete or out of date. You can return to the survey
        and city reports below.
      </p>
      <a href="/" className="button primary">
        <ArrowLeft size={18} /> Back to Mixed Signals
      </a>
    </main>
  );
}
