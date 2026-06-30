"use client";

import { useState, useRef, useCallback, useEffect, DragEvent, ChangeEvent } from "react";
import type { PredictionResponse } from "@/types";
import Navbar from "@/components/Navbar";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const CANCER_TYPES = [
  { id: "breast", label: "Breast Cancer", description: "Mammogram", imageHint: "Upload a mammogram image", available: true, image: "/images/breast.png", icon: "🫀" },
  { id: "lung", label: "Lung Cancer", description: "Chest X-ray", imageHint: "Upload a chest X-ray image", available: true, image: "/images/lung.png", icon: "🫁" },
  { id: "skin", label: "Skin Cancer", description: "Dermoscopy", imageHint: "Upload a dermoscopy image", available: true, image: "/images/skin.png", icon: "🔬" },
  { id: "oral", label: "Oral Cancer", description: "Oral scan", imageHint: "Upload an oral scan image", available: true, image: "/images/oral.png", icon: "🦷" },
] as const;

type CancerTypeId = (typeof CANCER_TYPES)[number]["id"];

/* ─── Circular confidence gauge ─── */
function ConfidenceRing({ pct, color }: { pct: number; color: string }) {
  const [displayed, setDisplayed] = useState(0);
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (displayed / 100) * circ;

  useEffect(() => {
    const id = setTimeout(() => setDisplayed(pct), 200);
    return () => clearTimeout(id);
  }, [pct]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
        <circle cx="44" cy="44" r={radius} strokeWidth="7" stroke="#f1f5f9" fill="none" />
        <circle
          cx="44" cy="44" r={radius} strokeWidth="7" fill="none"
          stroke={color} strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <span className="absolute text-sm font-bold text-slate-800">{displayed.toFixed(0)}%</span>
    </div>
  );
}

/* ─── Result card with gauge ─── */
interface ResultCardProps {
  stage: string; stageNum: number; label: string; confidence: number;
  theme: { ring: string; badge: string; text: string; bg: string; border: string };
  icon: "check" | "warning" | "danger"; delay?: number;
}

function ResultCard({ stage, stageNum, label, confidence, theme, icon, delay = 0 }: ResultCardProps) {
  const pct = confidence * 100;
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t); }, [delay]);

  const IconEl = () => {
    if (icon === "check") return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>;
    if (icon === "warning") return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
    return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
  };

  return (
    <div className={`rounded-2xl border p-5 shadow-sm transition-all duration-700 ${theme.bg} ${theme.border} ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
            Stage {stageNum}
          </span>
          <p className="mt-1.5 text-xs text-slate-500 font-medium">{stage}</p>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${theme.badge}`}>
          <IconEl />
          {icon === "check" ? "Normal" : icon === "warning" ? "Suspicious" : "Detected"}
        </span>
      </div>

      <div className="flex items-center gap-5">
        <ConfidenceRing pct={pct} color={theme.ring} />
        <div className="min-w-0">
          <p className={`text-2xl font-bold leading-tight capitalize ${theme.text}`}>{label}</p>
          <p className="mt-1 text-sm font-medium text-slate-500">Confidence Score</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Loading overlay ─── */
function AnalysisOverlay() {
  const [step, setStep] = useState(0);
  const steps = ["Preprocessing image…", "Running Stage 1 screening…", "Running Stage 2 classification…", "Generating heatmap…"];
  useEffect(() => {
    const id = setInterval(() => setStep(s => Math.min(s + 1, steps.length - 1)), 2200);
    return () => clearInterval(id);
  }, [steps.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/85 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-10 shadow-2xl text-center">
        <div className="relative mx-auto mb-7 h-20 w-20">
          <div className="absolute inset-0 animate-ping rounded-full border-2 border-teal-400/30" />
          <div className="absolute inset-2 animate-spin rounded-full border-[3px] border-transparent border-t-teal-500" style={{ animationDuration: "1.2s" }} />
          <div className="absolute inset-5 animate-spin rounded-full border-[2px] border-transparent border-t-cyan-400" style={{ animationDuration: "1.8s", animationDirection: "reverse" }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="h-6 w-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        </div>
        <p className="text-base font-semibold text-slate-900 mb-1">Analysing your scan</p>
        <p className="text-sm text-slate-500 mb-6 h-5 transition-all duration-300">{steps[step]}</p>
        <div className="flex gap-1.5 justify-center">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 w-6 rounded-full transition-all duration-500 ${i <= step ? "bg-teal-500" : "bg-slate-200"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DetectPage() {
  const [selectedType, setSelectedType] = useState<CancerTypeId | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) { setError("Please upload a valid image file."); return; }
    setFile(f); setError(null); setResult(null);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  }, []);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0]; if (f) handleFile(f);
  };

  const analyze = async () => {
    if (!file || !selectedType) return;
    setLoading(true); setError(null);
    const form = new FormData();
    form.append("cancer_type", selectedType);
    form.append("file", file);
    try {
      const res = await fetch(`${BACKEND_URL}/predict`, { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail ?? `Server error ${res.status}`);
      }
      setResult((await res.json()) as PredictionResponse);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg.toLowerCase().includes("fetch") ? "Cannot connect to the analysis server. Please make sure the backend is running." : msg);
    } finally { setLoading(false); }
  };

  const reset = () => { setFile(null); setPreview(null); setResult(null); setError(null); };

  const cfg = CANCER_TYPES.find((t) => t.id === selectedType);
  const stage1Normal = result && result.stage1_label.toLowerCase().trim() === "normal";

  const step = !selectedType ? 0 : !file ? 1 : !result ? 2 : 3;

  const resultTheme1 = stage1Normal
    ? { ring: "#10b981", badge: "bg-emerald-50 text-emerald-700 border border-emerald-200", text: "text-emerald-800", bg: "bg-white", border: "border-slate-200" }
    : { ring: "#f59e0b", badge: "bg-amber-50 text-amber-700 border border-amber-200", text: "text-amber-800", bg: "bg-white", border: "border-slate-200" };

  const getTheme2 = (label: string) => label.toLowerCase().includes("benign")
    ? { ring: "#f59e0b", badge: "bg-amber-50 text-amber-700 border border-amber-200", text: "text-amber-800", bg: "bg-white", border: "border-slate-200" }
    : { ring: "#f43f5e", badge: "bg-rose-50 text-rose-700 border border-rose-200", text: "text-rose-800", bg: "bg-white", border: "border-slate-200" };

  return (
    <div className="min-h-screen bg-slate-100">
      {loading && <AnalysisOverlay />}
      <Navbar step={step} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        {/* ── Two-column layout (12-column grid system) ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

          {/* ── LEFT COLUMN: Controls (Wider than original) ── */}
          <div className="lg:col-span-5 space-y-6">

            {/* Step 1: Select type — single row */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white transition-colors ${selectedType ? "bg-teal-600" : "bg-slate-400"}`}>1</span>
                <h2 className="text-sm font-semibold text-slate-900">Select Cancer Type</h2>
              </div>
              <div className="p-3 grid grid-cols-4 gap-2">
                {CANCER_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => { if (type.available) { setSelectedType(type.id as CancerTypeId); reset(); } }}
                    disabled={!type.available}
                    className={`group relative flex flex-col items-center gap-1.5 rounded-xl border p-2 text-center transition-all duration-200 focus:outline-none ${!type.available ? "cursor-not-allowed opacity-40 border-slate-200 bg-slate-50"
                        : selectedType === type.id ? "border-teal-500 bg-teal-50 ring-1 ring-teal-400/40"
                          : "border-slate-200 bg-white hover:border-teal-400/60 hover:bg-slate-50 cursor-pointer"
                      }`}
                  >
                    <div className="w-full h-24 rounded-lg overflow-hidden mix-blend-multiply">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={type.image} alt={type.label} className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-300" />
                    </div>
                    <p className={`text-xs font-semibold leading-tight mt-1 ${selectedType === type.id ? "text-teal-800" : "text-slate-700"}`}>{type.label}</p>
                    {selectedType === type.id && (
                      <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-teal-500">
                        <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      </span>
                    )}
                    {!type.available && <span className="absolute right-1 top-1 rounded-full bg-slate-200 px-1 py-0.5 text-[8px] font-bold uppercase text-slate-500">Soon</span>}
                  </button>
                ))}
              </div>
            </div>


            {/* Step 2: Upload */}
            {selectedType && (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden animate-fadeIn">
                <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white transition-colors ${file ? "bg-teal-600" : "bg-slate-400"}`}>2</span>
                  <h2 className="text-sm font-semibold text-slate-900">Upload Scan</h2>
                </div>
                <div className="p-4">
                  <p className="mb-3 text-xs text-slate-500 flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {cfg?.imageHint}
                  </p>
                  {!preview ? (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={onDrop}
                      onClick={() => inputRef.current?.click()}
                      className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 text-center transition-all duration-300 ${isDragging ? "border-teal-500 bg-teal-50" : "border-slate-200 bg-slate-50 hover:border-teal-400 hover:bg-slate-100/60"}`}
                    >
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all ${isDragging ? "bg-teal-100 text-teal-600" : "bg-white border border-slate-200 text-slate-400 shadow-sm"}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">Drop image here</p>
                        <p className="text-xs text-slate-400 mt-0.5">or <span className="text-teal-600 underline">browse files</span></p>
                      </div>
                      <p className="text-[10px] text-slate-400">JPEG, PNG, WEBP supported</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      <div className="w-full h-48 flex items-center justify-center p-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={preview}
                          alt="Image preview not available"
                          className="max-w-full max-h-full object-contain text-sm text-slate-400 text-center"
                        />
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
                            <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-800">{file?.name}</p>
                            <p className="text-[11px] text-slate-500 font-medium">{file ? `${(file.size / 1024).toFixed(0)} KB` : ""}</p>
                          </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); reset(); }} className="text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors ml-3 flex-shrink-0">Remove</button>
                      </div>
                    </div>
                  )}
                  <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
                </div>
              </div>
            )}

            {/* Analyse button */}
            {file && selectedType && !result && (
              <div className="space-y-3 animate-fadeIn">
                <button
                  onClick={analyze}
                  disabled={loading}
                  className="group w-full flex items-center justify-center gap-2.5 rounded-xl bg-slate-900 py-3.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-slate-800 hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 transition-transform duration-300 group-hover:rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  Run Analysis
                </button>
                <button
                  onClick={async () => {
                    if (!file || !selectedType) return;
                    setLoading(true);
                    const form = new FormData();
                    form.append("cancer_type", selectedType);
                    form.append("file", file);
                    try {
                      const res = await fetch(`${BACKEND_URL}/predict/preview`, { method: "POST", body: form });
                      const data = await res.json();
                      alert(`Preprocessing:\nOriginal: ${data.original_size}\nCropped: ${data.cropped_size}\nTotal windows: ${data.total_windows}\nRemoved: ${data.removed_count}\nValid patches: ${data.valid_patches}`);
                      if (data.grid_image) { const w = window.open(); if (w) w.document.write(`<img src="data:image/png;base64,${data.grid_image}" style="max-width:100%"/>`); }
                    } catch (e) { alert("Preview failed: " + e); } finally { setLoading(false); }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-medium text-slate-600 transition-all hover:bg-slate-50 hover:border-slate-300"
                >
                  🔍 Preview Preprocessing (Debug)
                </button>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 animate-fadeIn">
                <svg xmlns="http://www.w3.org/2000/svg" className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs leading-relaxed">{error}</p>
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN: Results dashboard (Wider balance) ── */}
          <div className="lg:col-span-7">
            {!result ? (
              /* Empty state */
              <div className="flex h-full min-h-[460px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white text-center p-12">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
                  <svg className="h-7 w-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-slate-500 mb-1">No results yet</h3>
                <p className="text-xs text-slate-400 max-w-[180px] leading-relaxed">
                  {!selectedType ? "Select a cancer type to begin." : !file ? "Upload a scan image to continue." : "Click 'Run Analysis' to start."}
                </p>
              </div>
            ) : (
              /* Results */
              <div className="space-y-5 animate-fadeIn">
                {/* Header bar */}
                <div className={`flex items-center justify-between rounded-2xl border p-5 ${stage1Normal ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-0.5">Analysis Complete</p>
                    <h2 className={`text-xl font-bold ${stage1Normal ? "text-emerald-800" : "text-amber-800"}`}>
                      {stage1Normal ? "No Significant Findings" : "Potential Abnormality Detected"}
                    </h2>
                    <p className="text-sm text-slate-600 mt-0.5">{result.message}</p>
                  </div>
                  <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl ${stage1Normal ? "bg-emerald-100" : "bg-amber-100"}`}>
                    {stage1Normal
                      ? <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                      : <svg className="h-7 w-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    }
                  </div>
                </div>

                {result.is_mock && (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                    <svg className="h-4 w-4 flex-shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <strong>Demo mode:</strong>&nbsp;AI model not loaded. Results are placeholders only.
                  </div>
                )}

                {/* Stage cards */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <ResultCard
                    stage="Screening" stageNum={1} label={result.stage1_label}
                    confidence={result.stage1_confidence}
                    theme={resultTheme1}
                    icon={stage1Normal ? "check" : "warning"} delay={0}
                  />
                  {result.stage2_label != null && result.stage2_confidence != null && (
                    <ResultCard
                      stage="Classification" stageNum={2} label={result.stage2_label}
                      confidence={result.stage2_confidence}
                      theme={getTheme2(result.stage2_label)}
                      icon={result.stage2_label.toLowerCase().includes("benign") ? "warning" : "danger"} delay={400}
                    />
                  )}
                </div>


                {/* Heatmap */}
                {result.annotated_image && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                      <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Suspicion Heatmap</h3>
                    </div>
                    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                      <img src={`data:image/jpeg;base64,${result.annotated_image}`} alt="Heatmap Overlay" className="w-full max-h-[500px] object-contain" />
                      <div className="absolute top-3 right-3 flex flex-col gap-1.5 rounded-xl bg-white/95 p-3 text-[10px] font-medium text-slate-700 border border-slate-200 shadow-sm backdrop-blur-sm">
                        <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold pb-1 border-b border-slate-100 mb-0.5">Suspicion Level</p>
                        {[["bg-red-600", "Very High"], ["bg-orange-500", "High"], ["bg-yellow-400", "Moderate"], ["bg-green-500", "Low"], ["bg-blue-600", "Normal"]].map(([c, l]) => (
                          <div key={l} className="flex items-center gap-2"><div className={`w-3 h-3 rounded-sm ${c}`}></div><span>{l}</span></div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Disclaimer + reset */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 flex items-start gap-3">
                  <svg className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    This tool is for <strong>research and decision-support use only</strong> — not a replacement for clinical diagnosis. Always consult a qualified medical professional.
                  </p>
                </div>
                <button
                  onClick={() => { reset(); setSelectedType(null); }}
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300"
                >
                  ← Start a New Analysis
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
