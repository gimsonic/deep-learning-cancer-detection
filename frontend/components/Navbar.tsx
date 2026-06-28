export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-2xl"
      style={{ background: "rgba(15, 23, 42, 0.4)" }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/lg.png"
            alt="CurieSense AI Logo"
            className="h-9 w-auto object-contain translate-y-0.5"
          />
          <div className="leading-none">
            <div>
              <span className="text-lg font-bold text-white">CurieSense</span>
              <span
                className="text-lg font-bold"
                style={{
                  background: "linear-gradient(to right, #60a5fa, #22d3ee)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {" "}AI
              </span>
            </div>
            <p className="text-[8px] font-medium uppercase tracking-widest text-gray-600">
              Cancer Detection System
            </p>
          </div>
        </div>
      </div>
    </nav>
  );
}

