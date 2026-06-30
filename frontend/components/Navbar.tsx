export default function Navbar({ step }: { step?: number }) {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/20 bg-white/30 backdrop-blur-xl backdrop-saturate-150 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-4">
        <div className="flex items-center gap-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/lg.png"
            alt="CurieSense AI Logo"
            className="h-10 w-auto object-contain translate-y-0.5"
          />
          <div className="leading-none">
            <div>
              <span className="text-xl font-bold text-slate-900">CurieSense</span>
              <span
                className="text-xl font-bold"
                style={{
                  background: "linear-gradient(to right, #0d9488, #0ea5e9)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {" "}AI
              </span>
            </div>
            <p className="text-[8px] font-medium uppercase tracking-widest text-slate-500">
              Cancer Detection System
            </p>
          </div>
        </div>

        {step !== undefined && (
          <div className="hidden md:flex items-center gap-2">
            {["Select Type", "Upload Scan", "Analyse", "Results"].map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-all duration-300 ${i < step ? "bg-teal-600 text-white" : i === step ? "border-2 border-teal-500 text-teal-700 bg-teal-50" : "border border-slate-200 text-slate-400 bg-white"}`}>
                  {i < step ? (
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <span className={`h-1.5 w-1.5 rounded-full ${i === step ? "bg-teal-500" : "bg-slate-300"}`} />
                  )}
                  {s}
                </div>
                {i < 3 && <div className={`h-px w-4 transition-all duration-500 ${i < step ? "bg-teal-400" : "bg-slate-200"}`} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
