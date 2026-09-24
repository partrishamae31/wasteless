import wastelessLogo from "./assets/wasteless-logo.png";

// Shared app footer: centered brand lockup + copyright.
const SiteFooter = () => {
  return (
    <footer className="mt-20 bg-[#07122b] text-white">
      <div className="max-w-7xl mx-auto px-8 py-16 flex flex-col items-center text-center">
        {/* BRAND LOCKUP */}
        <div className="flex items-center gap-4">
          <img
            src={wastelessLogo}
            alt="Wasteless logo"
            className="h-16 w-16 object-contain"
          />

          <div className="text-left">
            <h2 className="text-4xl font-extrabold tracking-tight leading-none">
              Wasteless
            </h2>

            <p className="text-slate-300 text-lg mt-1">
              Recover More. Waste Less.
            </p>
          </div>
        </div>

        {/* COPYRIGHT */}
        <p className="text-slate-500 text-sm mt-10">
          © 2026 Wasteless. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default SiteFooter;