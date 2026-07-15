export default function Footer() {
  return (
    <footer className="border-t border-slate-200/60 bg-white/50 backdrop-blur-md py-6 text-center mt-auto">
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex items-center justify-center gap-2 mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/lg.png"
            alt="CurieSense AI Logo"
            className="h-7 w-auto object-contain"
          />
          <div className="flex items-baseline">
            <span className="text-lg font-bold text-slate-900 tracking-tight">CurieSense</span>
            <span
              className="text-lg font-bold ml-1 tracking-tight"
              style={{
                background: "linear-gradient(to right, #60a5fa, #22d3ee)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              AI
            </span>
          </div>
        </div>
        
        <p className="text-sm text-slate-500 w-full leading-relaxed mb-4 text-center">
          This tool is intended for research and educational purposes only. It is <strong className="font-medium text-slate-700">not a substitute</strong> for professional medical advice, diagnosis, or treatment.
        </p>
        
        <div className="flex items-center justify-center pt-4 border-t border-slate-200/40">
          <p className="text-xs text-slate-400 text-center">
            &copy; {new Date().getFullYear()} - Multi-Cancer Detection System Using Deep Learning
          </p>
        </div>
      </div>
    </footer>
  );
}
