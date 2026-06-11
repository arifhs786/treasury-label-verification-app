"use client";

import { useMemo, useState } from "react";
import { createWorker } from "tesseract.js";
import {
  ApplicationFields,
  BatchResult,
  FieldResult,
  STANDARD_GOV_WARNING,
  summarize,
  summarizeBatch,
  verifyLabel
} from "../lib/verification";

const initialFields: ApplicationFields = {
  brandName: "OLD TOM DISTILLERY",
  classType: "Kentucky Straight Bourbon Whiskey",
  alcoholContent: "45% Alc./Vol. (90 Proof)",
  netContents: "750 mL",
  governmentWarning: STANDARD_GOV_WARNING
};

export default function LabelVerifier() {
  const [fields, setFields] = useState<ApplicationFields>(initialFields);
  const [ocrText, setOcrText] = useState("");
  const [results, setResults] = useState<FieldResult[]>([]);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [manualStatus, setManualStatus] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<string | null>(null);

  const summary = useMemo(() => (results.length ? summarize(results) : null), [results]);
  const batchSummary = useMemo(() => (batchResults.length ? summarizeBatch(batchResults) : null), [batchResults]);

  function updateField(key: keyof ApplicationFields, value: string) {
    setFields(prev => ({ ...prev, [key]: value }));
  }

  async function runOcr(file: File) {
    const worker = await createWorker("eng");
    try {
      const { data } = await worker.recognize(file);
      return data.text;
    } finally {
      await worker.terminate();
    }
  }

  async function analyze() {
    setBusy(true);
    setResults([]);
    setBatchResults([]);
    setManualStatus("");
    setStatus("Processing label image...");

    try {
      let text = ocrText;
      if (files[0]) text = await runOcr(files[0]);
      setOcrText(text);
      setResults(verifyLabel(fields, text));
      setStatus("Analysis complete");
    } catch (error) {
      setStatus("OCR failed. Paste label text manually and run verification again.");
      console.error(error);
    } finally {
      setBusy(false);
    }
  }

  async function analyzeBatch() {
    if (!files.length) return;

    setBusy(true);
    setResults([]);
    setBatchResults([]);
    setManualStatus("");
    setStatus(`Batch processing ${files.length} file(s)...`);

    try {
      const nextBatchResults: BatchResult[] = [];
      const combinedText: string[] = [];

      for (const [index, file] of files.entries()) {
        setStatus(`Processing ${index + 1} of ${files.length}: ${file.name}`);
        const text = await runOcr(file);
        const fileResults = verifyLabel(fields, text);
        const fileSummary = summarize(fileResults);
        nextBatchResults.push({ fileName: file.name, ocrText: text, results: fileResults, summary: fileSummary });
        combinedText.push(`--- ${file.name} ---\n${text}`);
      }

      setBatchResults(nextBatchResults);
      setOcrText(combinedText.join("\n\n"));
      setStatus("Batch analysis complete");
    } catch (error) {
      setStatus("Batch processing failed. Try fewer images or paste OCR text manually.");
      console.error(error);
    } finally {
      setBusy(false);
    }
  }

  function verifyPastedText() {
    const manualResults = verifyLabel(fields, ocrText);
    const manualSummary = summarize(manualResults);
    setBatchResults([]);
    setResults(manualResults);
    setManualStatus(`Manual text checked: ${manualSummary.status}. ${manualSummary.note}`);
    setStatus("Manual text verification complete");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Application Data</h2>
        <p className="mt-1 text-sm text-slate-600">Enter the expected values from the label application.</p>
        <div className="mt-4 space-y-3">
          <Input label="Brand Name" value={fields.brandName} onChange={value => updateField("brandName", value)} />
          <Input label="Class/Type" value={fields.classType} onChange={value => updateField("classType", value)} />
          <Input label="Alcohol Content" value={fields.alcoholContent} onChange={value => updateField("alcoholContent", value)} />
          <Input label="Net Contents" value={fields.netContents} onChange={value => updateField("netContents", value)} />
          <label className="block text-sm font-medium" htmlFor="government-warning">
            Government Warning
          </label>
          <textarea
            id="government-warning"
            className="h-28 w-full rounded-lg border p-3 text-sm"
            value={fields.governmentWarning}
            onChange={event => updateField("governmentWarning", event.target.value)}
          />
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Label Upload</h2>
        <p className="mt-1 text-sm text-slate-600">
          Upload one label for single review, or <strong className="font-semibold text-slate-950">select multiple labels for batch review</strong>.
        </p>
        <input
          className="mt-4 block w-full rounded-lg border p-3"
          type="file"
          accept="image/*"
          multiple
          onChange={event => {
            const selected = Array.from(event.target.files || []);
            setFiles(selected);
            setPreview(selected[0] ? URL.createObjectURL(selected[0]) : null);
            setStatus(selected.length ? `${selected.length} file(s) selected` : "Ready");
          }}
        />
        {preview && <img src={preview} alt="First selected label preview" className="mt-4 max-h-64 rounded-xl border object-contain" />}
        {files.length > 0 && <p className="mt-2 text-xs text-slate-500">Selected: {files.map(file => file.name).join(", ")}</p>}
        <div className="mt-4 flex flex-wrap gap-3">
          <button disabled={busy || files.length === 0} onClick={analyze} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
            Analyze First Label
          </button>
          <button disabled={busy || files.length < 2} onClick={analyzeBatch} className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
            Analyze Batch (2+ Labels)
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-600">Status: {status}</p>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm lg:col-span-2">
        <h2 className="text-xl font-semibold">OCR Text / Manual Fallback</h2>
        <p className="mt-1 text-sm text-slate-600">Reviewers can paste text here if OCR is blocked or image quality is poor.</p>
        <textarea className="mt-4 h-44 w-full rounded-lg border p-3 font-mono text-sm" value={ocrText} onChange={event => setOcrText(event.target.value)} />
        <button disabled={busy || !ocrText.trim()} onClick={verifyPastedText} className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
          Verify Pasted Text
        </button>
        {manualStatus && <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-900">{manualStatus}</p>}
      </section>

      {summary && <ResultsPanel title={`Single Label Result: ${summary.status}`} note={summary.note} results={results} />}

      {batchSummary && (
        <section className="rounded-2xl border bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-xl font-semibold">Batch Result: {batchSummary.status}</h2>
          <p className="text-sm text-slate-600">{batchSummary.note}</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-3">File</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Failures</th>
                  <th className="p-3">Review Items</th>
                </tr>
              </thead>
              <tbody>
                {batchResults.map(item => (
                  <tr key={item.fileName} className="border-b align-top">
                    <td className="p-3 font-medium">{item.fileName}</td>
                    <td className="p-3">{item.summary.status}</td>
                    <td className="p-3">{item.results.filter(result => result.status === "fail").length}</td>
                    <td className="p-3">{item.results.filter(result => result.status === "review").length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 space-y-6">
            {batchResults.map(item => (
              <ResultsPanel key={item.fileName} title={item.fileName} note={item.summary.note} results={item.results} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ResultsPanel({ title, note, results, compact = false }: { title: string; note: string; results: FieldResult[]; compact?: boolean }) {
  return (
    <section className={`${compact ? "rounded-xl bg-slate-50 p-4" : "rounded-2xl border bg-white p-5 shadow-sm lg:col-span-2"}`}>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-sm text-slate-600">{note}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-3">Field</th>
              <th className="p-3">Status</th>
              <th className="p-3">Confidence</th>
              <th className="p-3">Note</th>
            </tr>
          </thead>
          <tbody>
            {results.map(result => (
              <tr key={`${title}-${result.field}`} className="border-b align-top">
                <td className="p-3 font-medium">{result.field}</td>
                <td className="p-3">
                  <Badge status={result.status} />
                </td>
                <td className="p-3">{result.confidence}%</td>
                <td className="p-3 text-slate-700">{result.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <label className="block text-sm font-medium" htmlFor={id}>
      {label}
      <input id={id} className="mt-1 w-full rounded-lg border p-3 text-sm" value={value} onChange={event => onChange(event.target.value)} />
    </label>
  );
}

function Badge({ status }: { status: FieldResult["status"] }) {
  const cls = status === "pass" ? "bg-green-100 text-green-800" : status === "review" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${cls}`}>{status}</span>;
}
