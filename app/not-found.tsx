import { ArrowLeft } from 'lucide-react';
export default function NotFound() {
  return (
    <main className="not-found">
      <span className="brand-symbol">✳</span>
      <span className="eyebrow">404 / WRONG COORDINATES</span>
      <h1>
        This is a dead end.
        <br />
        Unlike your love life. Probably.
      </h1>
      <p>That page is not on the atlas. Let’s get you back to Earth.</p>
      <a href="/" className="button primary">
        <ArrowLeft size={18} /> Back to the atlas
      </a>
    </main>
  );
}
