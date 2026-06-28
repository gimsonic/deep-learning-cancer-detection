export default function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-gray-950 py-10 text-center">
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/lg.png"
            alt="CurieSense AI Logo"
            className="h-6 w-6 rounded-lg object-contain"
          />
          <span className="text-sm font-semibold text-gray-300">CurieSense AI</span>
        </div>
        <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
          This tool is intended for research and educational purposes only.
          It is <strong className="text-gray-500">not a substitute</strong> for professional medical advice, diagnosis, or treatment.
        </p>
        <p className="mt-4 text-xs text-gray-700">
          © {new Date().getFullYear()} — Multi-Cancer Detection System &nbsp;·&nbsp; University Group Project
        </p>
      </div>
    </footer>
  );
}
