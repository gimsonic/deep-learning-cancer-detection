"use client";

import { useState, useRef, useCallback, useEffect, DragEvent, ChangeEvent } from "react";
import type { PredictionResponse } from "@/types";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Cancer types with their details
const CANCER_TYPES = [
  {
    id: "breast",
    label: "Breast Cancer",
    description: "Mammogram",
    imageHint: "Upload a mammogram image",
    available: true,
    image: "/images/breast.png",
  },
  {
    id: "lung",
    label: "Lung Cancer",
    description: "Chest X-ray",
    imageHint: "Upload a chest X-ray image",
    available: true,
    image: "/images/lung.png",
  },
  {
    id: "skin",
    label: "Skin Cancer",
    description: "Dermoscopy",
    imageHint: "Upload a dermoscopy image",
    available: true,
    image: "/images/skin.png",
  },
  {
    id: "oral",
    label: "Oral Cancer",
    description: "Oral scan",
    imageHint: "Upload an oral scan image",
    available: true,
    image: "/images/oral.png",
  },
] as const;

type CancerTypeId = (typeof CANCER_TYPES)[number]["id"];

interface ResultCardProps {
  stage: string;
  label: string;
  confidence: number;
  colorClass: string;
  barClass: string;
  textClass: string;
  icon: "check" | "warning" | "danger";
  delay?: number;
}

function ResultCard({ stage, label, confidence, colorClass, barClass, textClass, icon, delay = 0 }: ResultCardProps) {
  const pct = (confidence * 100).toFixed(1);
  const [visible, setVisible] = useState(false);
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), delay);
    const t2 = setTimeout(() => setBarWidth(parseFloat(pct)), delay + 300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [delay, pct]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/5 backdrop-blur-sm p-6 transition-all duration-500 ${colorClass} ${visible ? "opacity-100 translate-y-0 shadow-lg" : "opacity-0 translate-y-4"
        }`}
    >
      {/* Soft glass highlight */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
      <div className="mb-3 flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          {stage}
        </p>
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 ${icon === "check"
            ? "bg-green-500/20 shadow-[0_0_12px_rgba(34,197,94,0.3)]"
            : icon === "warning"
              ? "bg-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
              : "bg-red-500/20 shadow-[0_0_12px_rgba(239,68,68,0.3)]"
            }`}
        >
          {icon === "check" && (
            <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {icon === "warning" && (
            <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
          {icon === "danger" && (
            <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
      </div>
      <p className={`text-3xl font-bold ${textClass}`}>{label}</p>
      <p className="mt-1 text-sm text-gray-400">Confidence: {pct}%</p>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-gray-800/80">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${barClass}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}

// Animated loading overlay component
function AnalysisOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 rounded-3xl border border-blue-500/20 bg-gray-900/90 p-10 shadow-2xl shadow-blue-500/10">
        {/* Animated rings */}
        <div className="relative h-20 w-20">
          <div className="absolute inset-0 animate-ping rounded-full border-2 border-blue-500/20" />
          <div className="absolute inset-2 animate-spin rounded-full border-2 border-transparent border-t-blue-400" style={{ animationDuration: "1.5s" }} />
          <div className="absolute inset-4 animate-spin rounded-full border-2 border-transparent border-t-cyan-400" style={{ animationDuration: "2s", animationDirection: "reverse" }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="h-7 w-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-white">Analysing your scan</p>
          <p className="mt-1 text-sm text-gray-400">AI model is processing the image…</p>
        </div>
        {/* Animated dots */}
        <div className="flex gap-1.5">
          <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: "0ms" }} />
          <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: "150ms" }} />
          <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [selectedType, setSelectedType] = useState<CancerTypeId | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please upload a valid image file (JPEG, PNG, WEBP, etc.)");
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  }, []);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const analyze = async () => {
    if (!file || !selectedType) return;
    setLoading(true);
    setError(null);

    const form = new FormData();
    form.append("cancer_type", selectedType);
    form.append("file", file);

    try {
      const res = await fetch(`${BACKEND_URL}/predict`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { detail?: string }).detail ?? `Server error ${res.status}`
        );
      }
      setResult((await res.json()) as PredictionResponse);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(
        msg.toLowerCase().includes("fetch")
          ? "Cannot connect with server"
          : msg
      );
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  const cfg = CANCER_TYPES.find((t) => t.id === selectedType);

  const stage1Normal =
    result && result.stage1_label.toLowerCase().trim() === "normal";

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Full-screen loading overlay */}
      {loading && <AnalysisOverlay />}

      {/* ── Premium Hero ── */}
      <section className="relative overflow-hidden px-6 pt-24 pb-20 text-center">
        {/* Tech Grid Background */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#2563eb15_1px,transparent_1px),linear-gradient(to_bottom,#2563eb15_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-80" />

        {/* Main Ambient Glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle 800px at 50% -100px, rgba(59,130,246,0.20), transparent)",
          }}
        />

        <div className="relative z-10 animate-fadeIn">
          {/* Badge */}
          <div className="inline-flex cursor-default items-center gap-2.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-5 py-2 text-sm font-medium text-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.15)] backdrop-blur-md transition-all hover:bg-blue-500/20 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            </span>
            Advanced Cancer Detection System
          </div>

          {/* Title */}
          <h1 className="mx-auto mt-8 max-w-4xl tracking-tight text-white sm:text-7xl text-5xl font-extrabold drop-shadow-sm">
            CurieSense{" "}
            <span
              className="relative inline-block text-transparent bg-clip-text"
              style={{
                backgroundImage: "linear-gradient(135deg, #60a5fa 0%, #22d3ee 100%)",
                textShadow: "0 0 40px rgba(34,211,238,0.3)",
              }}
            >
              AI
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl">
            Upload your medical scan for an instant AI-assisted two-stage
            analysis  Reliable <strong className="font-semibold text-gray-200">screening</strong> and <strong className="font-semibold text-gray-200">classification</strong> in seconds.
          </p>

          {/* Stepper progress in a glass dock */}
          <div className="mx-auto mt-14 flex max-w-fit items-center justify-center rounded-3xl border border-white/5 bg-gray-900/40 p-4 px-6 shadow-2xl backdrop-blur-lg">
            {["Select Type", "Upload Scan", "View Results"].map((label, i) => {
              const isActive = (i === 0 && selectedType) || (i === 1 && file) || (i === 2 && result);

              return (
                <div key={i} className="flex items-center">
                  <div className="group flex flex-col items-center gap-2 px-2 sm:px-6">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold transition-all duration-500 ${isActive
                        ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] scale-110"
                        : "border border-blue-500/20 bg-blue-500/10 text-blue-300 shadow-inner hover:bg-blue-500/20"
                        }`}
                    >
                      {isActive ? (
                        <svg className="h-5 w-5 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span className={`text-[11px] font-bold uppercase tracking-wider transition-colors duration-300 mt-1 ${isActive ? "text-blue-200" : "text-gray-500"
                      }`}>
                      {label}
                    </span>
                  </div>

                  {i < 2 && (
                    <div className="flex w-8 items-center sm:w-16">
                      <div
                        className={`mb-5 h-[2px] w-full rounded-full transition-all duration-500 ${isActive
                          ? "bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                          : "bg-gray-800"
                          }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-4xl px-4 pb-24 sm:px-6">
        {/* ── Step 1: Select cancer type ── */}
        <div className="relative overflow-hidden mb-8 rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Subtle ambient glow */}
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-500/10 blur-[80px] pointer-events-none" />
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-lg shadow-blue-600/30">
              1
            </span>
            <h2 className="text-lg font-semibold text-white">
              Select Cancer Type
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {CANCER_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => {
                  if (type.available) {
                    setSelectedType(type.id);
                    reset();
                  }
                }}
                disabled={!type.available}
                className={`group relative flex flex-col items-center gap-3 rounded-2xl border p-4 text-center transition-all duration-300 focus:outline-none ${!type.available
                  ? "cursor-not-allowed border-gray-800 bg-gray-900/60 opacity-40"
                  : selectedType === type.id
                    ? "border-blue-500 bg-blue-950/60 shadow-[0_0_30px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/40 transform scale-[1.02]"
                    : "cursor-pointer border-white/5 bg-white/[0.02] hover:border-blue-500/30 hover:bg-white/[0.06] hover:shadow-[0_0_25px_rgba(59,130,246,0.1)] hover:scale-[1.03]"
                  }`}
              >
                <div
                  className={`flex items-center justify-center overflow-hidden rounded-xl transition-all ${selectedType === type.id
                    ? "ring-2 ring-blue-500/50"
                    : ""
                    }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={type.image}
                    alt={type.label}
                    className="h-32 w-full rounded-xl object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div>
                  <p
                    className={`text-sm font-semibold leading-tight ${selectedType === type.id
                      ? "text-blue-200"
                      : "text-gray-200"
                      }`}
                  >
                    {type.label}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {type.description}
                  </p>
                </div>
                {selectedType === type.id && (
                  <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 shadow-lg shadow-blue-500/40">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
                {!type.available && (
                  <span className="absolute right-2 top-2 rounded-full bg-gray-700/80 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-gray-400">
                    Soon
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Step 2: Upload ── */}
        {selectedType && (
          <div className="relative overflow-hidden mb-8 animate-fadeIn rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            {/* Subtle ambient glow */}
            <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-cyan-500/10 blur-[80px] pointer-events-none" />
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-lg shadow-blue-600/30">
                2
              </span>
              <h2 className="text-lg font-semibold text-white">
                Upload Scan Image
              </h2>
            </div>
            <p className="mb-4 text-sm text-gray-400">{cfg?.imageHint}</p>

            {!preview ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={`relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-14 text-center transition-all duration-500 overflow-hidden ${isDragging
                  ? "border-blue-400 bg-blue-500/10 shadow-[inset_0_0_50px_rgba(59,130,246,0.2)]"
                  : "border-white/20 bg-white/[0.02] hover:border-blue-400/60 hover:bg-white/[0.04]"
                  }`}
              >
                {/* Decorative Striped background inside dropzone */}
                <div className="absolute inset-0 pointer-events-none bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.02)_10px,rgba(255,255,255,0.02)_20px)] opacity-50 transition-opacity duration-300 group-hover:opacity-100" />
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300 ${isDragging ? "bg-blue-600 shadow-lg shadow-blue-600/40 scale-110" : "bg-gray-700/80"
                    }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-7 w-7 text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-white">
                    Drop your image here
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    or{" "}
                    <span className="text-blue-400 underline underline-offset-2">
                      click to browse
                    </span>
                  </p>

                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-700/80 bg-gray-800/80">
                <div className="flex items-center justify-center bg-black/40 p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt="Uploaded scan preview"
                    className="max-h-80 w-auto rounded-lg object-contain shadow-lg"
                  />
                </div>
                <div className="flex items-center justify-between border-t border-gray-700/60 px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20">
                      <svg className="h-3.5 w-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {file?.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {file ? `${(file.size / 1024).toFixed(0)} KB` : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      reset();
                    }}
                    className="ml-4 flex-shrink-0 rounded-lg border border-gray-700 px-3 py-1 text-sm text-gray-400 transition-all hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </div>
        )}


        {/* ── DEBUG: Preview preprocessing ── */}
        {file && selectedType && !result && (
          <div className="mb-6 flex flex-col items-center gap-4">
            <button
              onClick={async () => {
                if (!file || !selectedType) return;
                setLoading(true);
                const form = new FormData();
                form.append("cancer_type", selectedType);
                form.append("file", file);
                try {
                  const res = await fetch(`${BACKEND_URL}/predict/preview`, {
                    method: "POST",
                    body: form,
                  });
                  const data = await res.json();
                  alert(
                    `Preprocessing Results:\n` +
                    `Original: ${data.original_size}\n` +
                    `Cropped: ${data.cropped_size}\n` +
                    `Total windows: ${data.total_windows}\n` +
                    `Removed (black): ${data.removed_count}\n` +
                    `Valid patches: ${data.valid_patches}`
                  );
                  // Show grid image in a new tab
                  if (data.grid_image) {
                    const w = window.open();
                    if (w) {
                      w.document.write(
                        `<img src="data:image/png;base64,${data.grid_image}" style="max-width:100%"/>`
                      );
                    }
                  }
                } catch (e) {
                  alert("Preview failed: " + e);
                } finally {
                  setLoading(false);
                }
              }}
              className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-8 py-3 text-sm font-medium text-cyan-300 transition-all hover:bg-cyan-500/20"
            >
              🔍 Preview Patches (Debug)
            </button>
          </div>
        )}

        {/* ── Analyse button ── */}
        {file && selectedType && !result && (
          <div className="mb-6 flex justify-center">
            <button
              onClick={analyze}
              disabled={loading}
              className="group flex items-center gap-3 rounded-2xl bg-blue-600 px-12 py-4 text-base font-semibold text-white shadow-xl shadow-blue-500/30 transition-all duration-300 hover:bg-blue-500 hover:shadow-blue-500/40 hover:shadow-2xl hover:scale-105 active:scale-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 transition-transform duration-300 group-hover:rotate-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              Analyse Image
            </button>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300 backdrop-blur-sm animate-fadeIn">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p>{error}</p>
          </div>
        )}

        {/* ── Results ── */}
        {result && (
          <div className="relative overflow-hidden animate-fadeIn rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            {/* Ambient glow for success/danger mapping */}
            <div className={`absolute top-0 right-0 h-64 w-64 rounded-full blur-[100px] pointer-events-none ${result.stage2_label?.toLowerCase().includes("benign") || (stage1Normal && !result.stage2_label)
              ? "bg-emerald-500/10"
              : "bg-rose-500/10"
              }`} />
            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-white">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 shadow-lg shadow-blue-600/30">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              Analysis Results
            </h2>

            {result.is_mock && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                Demo mode — AI model not loaded. Results shown are placeholders only.
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <ResultCard
                stage="Stage 1 — Screening"
                label={result.stage1_label}
                confidence={result.stage1_confidence}
                colorClass={
                  stage1Normal
                    ? "border-green-500/25 bg-green-500/5"
                    : "border-amber-500/25 bg-amber-500/5"
                }
                barClass={stage1Normal ? "bg-gradient-to-r from-green-500 to-emerald-400" : "bg-gradient-to-r from-amber-500 to-orange-400"}
                textClass={stage1Normal ? "text-green-400" : "text-amber-400"}
                icon={stage1Normal ? "check" : "warning"}
                delay={0}
              />

              {result.stage2_label != null &&
                result.stage2_confidence != null && (
                  <ResultCard
                    stage="Stage 2 — Classification"
                    label={result.stage2_label}
                    confidence={result.stage2_confidence}
                    colorClass={
                      result.stage2_label.toLowerCase().includes("benign")
                        ? "border-amber-500/25 bg-amber-500/5"
                        : "border-red-500/25 bg-red-500/5"
                    }
                    barClass={
                      result.stage2_label.toLowerCase().includes("benign")
                        ? "bg-gradient-to-r from-amber-500 to-orange-400"
                        : "bg-gradient-to-r from-red-500 to-rose-400"
                    }
                    textClass={
                      result.stage2_label.toLowerCase().includes("benign")
                        ? "text-amber-400"
                        : "text-red-400"
                    }
                    icon={
                      result.stage2_label.toLowerCase().includes("benign")
                        ? "warning"
                        : "danger"
                    }
                    delay={400}
                  />
                )}
            </div>

            <p className="mt-5 text-center text-sm text-gray-400">
              {result.message}
            </p>

            {/* ── Patch Analysis Stats (Only shows for Breast Cancer) ── */}
            {result.patch_breakdown ? (
              <div className="mt-6 rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 mx-auto max-w-3xl">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-blue-400 border-b border-blue-500/20 pb-2">
                  Tissue Patch Breakdown
                </h3>
                <div className="grid gap-4 sm:grid-cols-5 text-sm">
                  <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-white/5">
                    <p className="text-gray-400 text-xs uppercase tracking-wider">Total</p>
                    <p className="font-mono text-2xl font-bold text-white mt-1">{result.total_patches}</p>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-green-400/80 text-xs uppercase tracking-wider">Normal</p>
                    <p className="font-mono text-2xl font-bold text-green-400 mt-1">{result.patch_breakdown.normal}</p>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-amber-400/80 text-xs uppercase tracking-wider">Abnormal</p>
                    <p className="font-mono text-2xl font-bold text-amber-400 mt-1">{result.patch_breakdown.abnormal}</p>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <p className="text-orange-400/80 text-xs uppercase tracking-wider">Benign</p>
                    <p className="font-mono text-2xl font-bold text-orange-400 mt-1">{result.patch_breakdown.benign}</p>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                    <p className="text-rose-400/80 text-xs uppercase tracking-wider">Malignant</p>
                    <p className="font-mono text-2xl font-bold text-rose-400 mt-1">{result.patch_breakdown.malignant}</p>
                  </div>
                </div>
              </div>
            ) : result.total_patches !== undefined && (
              <div className="mt-6 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4 mx-auto max-w-2xl">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-cyan-400">
                  Deep Scan Details
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                  <div>
                    <p className="text-gray-400">Total Patches</p>
                    <p className="font-mono text-lg text-white">{result.total_patches}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Suspicious Patches</p>
                    <p className="font-mono text-lg text-rose-400">
                      {result.positive_patches != null ? result.positive_patches : 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Affected Area</p>
                    <p className="font-mono text-lg text-white">
                      {result.positive_pct != null ? result.positive_pct.toFixed(1) : 0}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Peak Confidence</p>
                    <p className="font-mono text-lg text-white">
                      {result.top_k_confidence != null ? `${(result.top_k_confidence * 100).toFixed(1)}%` : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Annotated Image Overlay ── */}
            {result.annotated_image && (
              <div className="mt-8 mx-auto max-w-2xl rounded-xl border border-white/10 bg-black/40 p-4 shadow-inner">
                <h3 className="mb-4 text-center text-sm font-semibold uppercase tracking-wider text-gray-300 flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Deep Scan Visual Analysis
                </h3>
                <div className="relative overflow-hidden rounded-lg border border-white/5 bg-black/50">
                  <img
                    src={`data:image/jpeg;base64,${result.annotated_image}`}
                    alt="Mammogram Heatmap Overlay"
                    className="w-full max-h-[600px] object-contain"
                  />
                  
                  {/* Discrete Color Legend */}
                  <div className="absolute top-4 right-4 flex flex-col gap-2 rounded-xl bg-black/80 p-3 text-[10px] font-medium text-gray-300 backdrop-blur-md border border-white/10 shadow-xl">
                    <div className="mb-1 text-[9px] uppercase tracking-wider text-gray-400 font-semibold border-b border-white/10 pb-1">
                      Suspicion Level
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.6)]"></div>
                      <span>Very High</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]"></div>
                      <span>High</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]"></div>
                      <span>Moderate</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                      <span>Low</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]"></div>
                      <span>Normal</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <p className="mt-4 text-center text-xs text-gray-500">
              ⚕&nbsp; For informational purposes only. Always consult a
              qualified medical professional for clinical diagnosis.
            </p>

            <div className="mt-6 flex justify-center">
              <button
                onClick={() => {
                  reset();
                  setSelectedType(null);
                }}
                className="rounded-xl border border-gray-700 px-6 py-2.5 text-sm font-medium text-gray-300 transition-all duration-300 hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-300 hover:shadow-[0_0_15px_rgba(59,130,246,0.15)]"
              >
                ← Analyse Another Scan
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

