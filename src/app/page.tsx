import LabelVerifier from "../components/LabelVerifier";

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Department of the Treasury Take-Home Prototype</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">AI-Powered Alcohol Label Verification App</h1>
        <p className="mt-3 max-w-3xl text-slate-700">
          A standalone proof of concept for TTB-style label review. The app extracts label text with OCR,
          compares it against application fields, flags mismatches, and keeps the workflow simple for reviewers.
        </p>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3"><strong>Fast workflow:</strong> single-screen review with clear actions.</div>
          <div className="rounded-xl bg-slate-50 p-3"><strong>Human judgment:</strong> fuzzy matching for harmless variations.</div>
          <div className="rounded-xl bg-slate-50 p-3"><strong>Prototype-safe:</strong> no COLA integration or stored sensitive data.</div>
        </div>
      </header>
      <LabelVerifier />
    </main>
  );
}
