
import React, { useEffect, useRef, useState } from "react";
import {
  Package,
  Leaf,
  Store,
  MapPin,
  Recycle,
  ShieldCheck,
  TrendingUp,
  Heart,
  BarChart3,
  BadgeCheck,
  Users,
  Mail,
  ChevronDown,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const TEAL = "#2d91a8";
const GREEN = "#619d2d";
const NAVY = "#1b6a8f";

const stats = [
  {
    icon: Package,
    value: "2,400+",
    label: "Devices Recovered",
    color: TEAL,
    bg: "#e0f1f5",
  },
  {
    icon: Leaf,
    value: "340 kg",
    label: "CO₂e Prevented",
    color: GREEN,
    bg: "#e8f2db",
  },
  {
    icon: Store,
    value: "85+",
    label: "Partner Repair Shops",
    color: "#8b5cf6",
    bg: "#f0e8fe",
  },
  {
    icon: MapPin,
    value: "33",
    label: "Barangays Covered",
    color: "#f97316",
    bg: "#ffedd9",
  },
];

const pillars = [
  {
    icon: Recycle,
    title: "Circular Economy",
    text: "Every device listed is a potential resource, not waste.",
  },
  {
    icon: ShieldCheck,
    title: "Safe & Verified",
    text: "All repair shops are identity and permit-verified.",
  },
  {
    icon: TrendingUp,
    title: "Trackable Impact",
    text: "CO₂ recovery scores for every user and transaction.",
  },
  {
    icon: Heart,
    title: "Community-First",
    text: "Built with and for the people of Valenzuela City.",
  },
];

const steps = [
  {
    icon: Package,
    color: TEAL,
    bg: "#e0f1f5",
    title: "List Your Device",
    text: "Tech Harvesters post their old or broken electronics — phones, laptops, components — with condition details and an asking price.",
  },
  {
    icon: Store,
    color: GREEN,
    bg: "#e8f2db",
    title: "Repair Shops Bid",
    text: "Licensed repair shops browse the Urban Mine Map and place bids on devices they can refurbish, repurpose, or harvest for parts.",
  },
  {
    icon: BarChart3,
    color: "#8b5cf6",
    bg: "#f0e8fe",
    title: "Complete & Track",
    text: "Once a bid is accepted, both parties coordinate the meetup through the platform. Each transaction is tracked and contributes to your CO₂ recovery score.",
  },
  {
    icon: BadgeCheck,
    color: "#f97316",
    bg: "#ffedd9",
    title: "Build Trust",
    text: "Rate each other after the transaction. Build your reputation tier — from Newcomer to Platinum — unlocking privileges as you grow.",
  },
];

const roles = [
  {
    icon: Package,
    color: TEAL,
    bg: "#eaf4f7",
    chip: "#d4ebf1",
    title: "Tech Harvesters",
    text: "Residents and small business owners who sell their used or broken electronics instead of throwing them away.",
  },
  {
    icon: Store,
    color: GREEN,
    bg: "#f1f6e8",
    chip: "#dfebca",
    title: "Repair Shops",
    text: "Licensed businesses that source devices for refurbishment, parts harvesting, or resale to extend the lifecycle of electronics.",
  },
  {
    icon: ShieldCheck,
    color: "#8b5cf6",
    bg: "#f8f2fe",
    chip: "#ecdffc",
    title: "Admin",
    text: "City-level administrators who oversee the platform, verify users, and ensure compliance with e-waste regulations.",
  },
  {
    icon: BarChart3,
    color: TEAL,
    bg: "#e8fbfd",
    chip: "#cdf1f6",
    title: "Environmental Officers",
    text: "CENRO officials who monitor environmental impact data, generate reports, and track e-waste diversion targets.",
  },
  {
    icon: Users,
    color: "#f97316",
    bg: "#fff3e8",
    chip: "#ffe0c4",
    title: "Barangay Officers",
    text: "Local government officials who coordinate drop-off hubs, monitor barangay-level activity, and promote community participation.",
  },
];

const tiers = [
  {
    icon: "🌱",
    name: "Newcomer",
    note: "0 transactions",
    bg: "rgba(255,255,255,.14)",
  },
  {
    icon: "🥉",
    name: "Bronze",
    note: "3+ transactions",
    bg: "rgba(160,120,90,.45)",
  },
  {
    icon: "🥈",
    name: "Silver",
    note: "10+ transactions",
    bg: "rgba(190,200,210,.35)",
  },
  {
    icon: "🥇",
    name: "Gold",
    note: "25+ transactions",
    bg: "rgba(110,160,70,.5)",
  },
  {
    icon: "💎",
    name: "Platinum",
    note: "50+ transactions",
    bg: "rgba(60,150,200,.55)",
  },
];

const faqs = [
  {
    q: "Is Wasteless free to use?",
    a: "Yes. Creating an account, listing devices, and placing bids are free for residents and verified repair shops.",
  },
  {
    q: "How do I know if a repair shop is legitimate?",
    a: "Every repair shop is identity and permit-verified by city administrators before it can bid on devices.",
  },
  {
    q: "What happens to my data?",
    a: "Your information is used only to run the platform and is never sold. Personal details are shared with a counterpart only after a bid is accepted.",
  },
  {
    q: "Can I donate devices instead of selling them?",
    a: "Yes. You can list a device for free or hand it in at a barangay drop-off hub supported by the program.",
  },
  {
    q: "How is the CO₂ recovery figure calculated?",
    a: "Each completed transaction is credited using the device category and weight, based on standard emission factors for avoided new manufacturing.",
  },
];

const Heading = ({
  eyebrow,
  title,
  sub,
  color = TEAL,
  light = false,
  left = false,
}) => (
  <div data-reveal className={left ? "" : "text-center"}>
    <div className="wl-heading-eyebrow">
      <span
        className="mr-2 inline-block h-1.5 w-1.5 rounded-full"
        style={{
          background: light ? "rgba(255,255,255,.75)" : color,
        }}
      />
      <p
        className="inline text-[11px] font-semibold uppercase tracking-[0.18em]"
        style={{
          color: light ? "rgba(255,255,255,.72)" : color,
        }}
      >
        {eyebrow}
      </p>
    </div>

    <h2
      className={`mt-2 text-2xl md:text-3xl font-bold ${
        light ? "text-white" : "text-slate-900"
      }`}
    >
      {title}
    </h2>

    {sub && (
      <p
        className={`mt-3 text-sm max-w-md ${
          left ? "" : "mx-auto"
        } ${light ? "text-white/70" : "text-slate-500"}`}
      >
        {sub}
      </p>
    )}
  </div>
);

const card =
  "bg-white rounded-2xl border border-slate-100 shadow-[0_4px_14px_rgba(15,23,42,.08)]";

const css = `
  html {
    scroll-behavior: smooth;
  }

  @keyframes wl-up {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes wl-fade-scale {
    from {
      opacity: 0;
      transform: scale(.94);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes wl-float {
    0%, 100% {
      transform: translate3d(0, 0, 0) scale(1);
    }
    50% {
      transform: translate3d(0, -18px, 0) scale(1.06);
    }
  }

  @keyframes wl-float-small {
    0%, 100% {
      transform: translate3d(0, 0, 0);
    }
    50% {
      transform: translate3d(8px, -10px, 0);
    }
  }

  @keyframes wl-pulse {
    0%, 100% {
      opacity: .35;
      transform: scale(1);
    }
    50% {
      opacity: .65;
      transform: scale(1.12);
    }
  }

  @keyframes wl-shimmer {
    0% {
      transform: translateX(-120%);
    }
    100% {
      transform: translateX(120%);
    }
  }

  @keyframes wl-arrow {
    0%, 100% {
      transform: translateX(0);
    }
    50% {
      transform: translateX(4px);
    }
  }

  @keyframes wl-spin-slow {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .wl-hero {
    isolation: isolate;
  }

  .wl-hero h1,
  .wl-hero p,
  .wl-hero .wl-cta {
    opacity: 0;
    animation: wl-up .9s cubic-bezier(.2,.7,.2,1) forwards;
  }

  .wl-hero h1 {
    animation-delay: .05s;
  }

  .wl-hero p {
    animation-delay: .2s;
  }

  .wl-hero .wl-cta {
    animation-delay: .38s;
  }

  .wl-blob {
    animation: wl-float 9s ease-in-out infinite;
    will-change: transform;
  }

  .wl-blob-small {
    animation: wl-float-small 6s ease-in-out infinite;
    will-change: transform;
  }

  .wl-pulse {
    animation: wl-pulse 4s ease-in-out infinite;
  }

  [data-reveal] {
    opacity: 0;
    transform: translateY(28px);
    transition:
      opacity .72s ease,
      transform .72s cubic-bezier(.2,.7,.2,1);
    transition-delay: var(--d, 0ms);
  }

  [data-reveal].wl-in {
    opacity: 1;
    transform: none;
  }

  .wl-hover-card {
    transition:
      transform .35s cubic-bezier(.2,.7,.2,1),
      box-shadow .35s ease,
      border-color .35s ease;
  }

  .wl-hover-card:hover {
    transform: translateY(-7px);
    box-shadow: 0 18px 40px rgba(15, 23, 42, .11);
  }

  .wl-stat-icon {
    transition:
      transform .4s cubic-bezier(.2,.7,.2,1),
      box-shadow .4s ease;
  }

  .wl-stat-card:hover .wl-stat-icon {
    transform: translateY(-3px) rotate(-5deg) scale(1.08);
    box-shadow: 0 8px 18px rgba(15, 23, 42, .08);
  }

  .wl-icon-box {
    transition:
      transform .35s ease,
      box-shadow .35s ease;
  }

  .wl-hover-card:hover .wl-icon-box {
    transform: scale(1.08) rotate(-3deg);
    box-shadow: 0 8px 18px rgba(15, 23, 42, .07);
  }

  .wl-arrow {
    transition: transform .3s ease;
  }

  .wl-hover-card:hover .wl-arrow {
    animation: wl-arrow .8s ease-in-out infinite;
  }

  .wl-primary-btn,
  .wl-secondary-btn {
    position: relative;
    overflow: hidden;
    transition:
      transform .25s ease,
      box-shadow .25s ease,
      background-color .25s ease;
  }

  .wl-primary-btn::before,
  .wl-secondary-btn::before {
    content: "";
    position: absolute;
    inset: 0;
    transform: translateX(-120%);
    background: linear-gradient(
      105deg,
      transparent 25%,
      rgba(255,255,255,.35) 50%,
      transparent 75%
    );
    transition: transform .65s ease;
  }

  .wl-primary-btn:hover::before,
  .wl-secondary-btn:hover::before {
    transform: translateX(120%);
  }

  .wl-primary-btn:hover,
  .wl-secondary-btn:hover {
    transform: translateY(-3px);
  }

  .wl-primary-btn:active,
  .wl-secondary-btn:active {
    transform: translateY(-1px) scale(.98);
  }

  .wl-role-card {
    position: relative;
    overflow: hidden;
    transition:
      transform .35s cubic-bezier(.2,.7,.2,1),
      box-shadow .35s ease;
  }

  .wl-role-card::after {
    content: "";
    position: absolute;
    width: 110px;
    height: 110px;
    right: -45px;
    bottom: -55px;
    border-radius: 999px;
    background: rgba(255,255,255,.55);
    transition:
      transform .45s ease,
      opacity .45s ease;
    opacity: .35;
  }

  .wl-role-card:hover {
    transform: translateY(-7px);
    box-shadow: 0 18px 38px rgba(15,23,42,.09);
  }

  .wl-role-card:hover::after {
    transform: scale(1.7);
    opacity: .7;
  }

  .wl-tier {
    transition:
      transform .35s cubic-bezier(.2,.7,.2,1),
      background-color .35s ease,
      box-shadow .35s ease;
  }

  .wl-tier:hover {
    transform: translateY(-8px) scale(1.035);
    box-shadow: 0 15px 30px rgba(0,0,0,.12);
  }

  .wl-tier-icon {
    display: inline-block;
    transition: transform .35s ease;
  }

  .wl-tier:hover .wl-tier-icon {
    transform: scale(1.18) rotate(-5deg);
  }

  .wl-faq {
    transition:
      transform .25s ease,
      box-shadow .25s ease,
      border-color .25s ease;
  }

  .wl-faq:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(15,23,42,.06);
  }

  .wl-faq-button {
    transition:
      color .25s ease,
      background-color .25s ease;
  }

  .wl-faq-button:hover {
    color: ${TEAL};
    background: rgba(45,145,168,.035);
  }

  .wl-contact-link {
    transition:
      transform .25s ease,
      box-shadow .25s ease;
  }

  .wl-contact-link:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 22px rgba(45,145,168,.22);
  }

  .wl-footer-logo {
    transition:
      transform .45s ease,
      filter .45s ease;
  }

  .wl-footer-logo:hover {
    transform: rotate(-5deg) scale(1.07);
    filter: drop-shadow(0 8px 12px rgba(255,255,255,.12));
  }

  .wl-heading-eyebrow {
    transition: transform .4s ease;
  }

  [data-reveal].wl-in .wl-heading-eyebrow {
    animation: wl-fade-scale .6s ease both;
  }

  @media (prefers-reduced-motion: reduce) {
    html {
      scroll-behavior: auto;
    }

    .wl-hero h1,
    .wl-hero p,
    .wl-hero .wl-cta {
      animation: none;
      opacity: 1;
    }

    .wl-blob,
    .wl-blob-small,
    .wl-pulse {
      animation: none;
    }

    [data-reveal] {
      opacity: 1;
      transform: none;
      transition: none;
    }

    .wl-hover-card:hover,
    .wl-role-card:hover,
    .wl-tier:hover,
    .wl-contact-link:hover,
    .wl-primary-btn:hover,
    .wl-secondary-btn:hover {
      transform: none;
    }
  }
`;

function CountUp({ value }) {
  const ref = useRef(null);
  const [n, setN] = useState(0);

  const m = value.match(/^([\d,]+)(.*)$/);
  const target = m ? parseInt(m[1].replace(/,/g, ""), 10) : 0;
  const suffix = m ? m[2] : "";

  useEffect(() => {
    const el = ref.current;

    if (!el || !m) return undefined;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let raf;

    const run = () => {
      if (reduce) {
        setN(target);
        return;
      }

      const t0 = performance.now();

      const tick = (t) => {
        const p = Math.min((t - t0) / 1400, 1);
        const eased = 1 - Math.pow(1 - p, 3);

        setN(Math.round(target * eased));

        if (p < 1) {
          raf = requestAnimationFrame(tick);
        }
      };

      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          run();
          io.disconnect();
        }
      },
      {
        threshold: 0.6,
      }
    );

    io.observe(el);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target]);

  if (!m) {
    return <span>{value}</span>;
  }

  return (
    <span ref={ref}>
      {n.toLocaleString("en-US")}
      {suffix}
    </span>
  );
}

export default function Landing({ onGetStarted, onSignUp }) {
  const [open, setOpen] = useState(null);
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;

    if (!root) return undefined;

    const els = [...root.querySelectorAll("[data-reveal]")];

    const counts = new Map();

    els.forEach((el) => {
      const parent = el.parentElement;
      const i = counts.get(parent) || 0;

      el.style.setProperty("--d", `${i * 90}ms`);
      counts.set(parent, i + 1);
    });

    if (typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("wl-in"));
      return undefined;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("wl-in");
            io.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -6% 0px",
      }
    );

    els.forEach((el) => io.observe(el));

    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      className="min-h-screen overflow-hidden bg-white text-slate-800"
      style={{
        fontFamily: "'Montserrat', system-ui, sans-serif",
      }}
    >
      <style>{css}</style>

      {/* =========================================================
          HERO
      ========================================================= */}
      <header
        className="wl-hero relative isolate overflow-hidden px-6 py-20 text-center text-white md:py-28"
        style={{
          background:
            "linear-gradient(135deg, #17608a 0%, #2a86a4 55%, #6a9a2c 100%)",
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <div className="wl-blob absolute -left-20 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

          <div
            className="wl-blob absolute -bottom-32 -right-10 h-[28rem] w-[28rem] rounded-full bg-[#b6e06a]/25 blur-3xl"
            style={{ animationDelay: "-4.5s" }}
          />

          <div className="wl-pulse absolute left-[12%] top-[30%] h-20 w-20 rounded-full bg-white/10 blur-xl" />

          <div
            className="wl-blob-small absolute right-[15%] top-[18%] h-12 w-12 rounded-full border border-white/15 bg-white/10 backdrop-blur-sm"
            style={{ animationDelay: "-2s" }}
          />

          <div
            className="absolute inset-0 opacity-[.06]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "32px 32px",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-4xl">
          <div className="mb-5 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/85 backdrop-blur-sm">
              <Sparkles size={12} />
              A Circular Economy Platform
            </span>
          </div>

          <h1 className="text-4xl font-bold leading-tight md:text-6xl">
            Recover More.
            <br />
            <span className="text-white/95">Waste Less.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-white/85 md:text-base">
            Wasteless connects residents who have old electronics with
            licensed repair shops that can give those devices a second life —
            keeping harmful e-waste out of landfills and building a circular
            economy for Valenzuela City.
          </p>

          <div className="wl-cta mt-9 flex flex-wrap justify-center gap-3">
            <button
              onClick={onGetStarted}
              className="wl-primary-btn group relative inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              style={{ color: NAVY }}
            >
              <span className="relative z-10">Get Started</span>
              <ArrowRight
                size={15}
                className="relative z-10 transition-transform duration-300 group-hover:translate-x-1"
              />
            </button>

            <button
              onClick={onSignUp}
              className="wl-secondary-btn relative inline-flex items-center gap-2 rounded-lg border border-white/40 bg-white/15 px-6 py-3 text-sm font-semibold backdrop-blur-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <span className="relative z-10">Create an Account</span>
            </button>
          </div>

          
        </div>
      </header>

      {/* =========================================================
          STATS
      ========================================================= */}
      <section className="relative bg-slate-50 px-6 py-8 md:py-10">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map(
            ({ icon: Icon, value, label, color, bg }, index) => (
              <div
                key={label}
                data-reveal
                className={`${card} wl-hover-card wl-stat-card group relative overflow-hidden p-5 text-center md:p-6`}
              >
                <div
                  className="absolute -right-8 -top-8 h-20 w-20 rounded-full opacity-30 blur-2xl transition-transform duration-500 group-hover:scale-150"
                  style={{ background: color }}
                />

                <span
                  className="wl-stat-icon relative mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{
                    background: bg,
                    color,
                  }}
                >
                  <Icon size={18} />
                </span>

                <p
                  className="relative text-2xl font-bold"
                  style={{ color }}
                >
                  <CountUp value={value} />
                </p>

                <p className="relative mt-1 text-xs text-slate-500">
                  {label}
                </p>
              </div>
            )
          )}
        </div>
      </section>

      {/* =========================================================
          MISSION
      ========================================================= */}
      <section className="px-6 py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl items-start gap-10 md:grid-cols-2">
          <div>
            <Heading
              left
              eyebrow="Our Mission"
              title="Turning E-Waste into Community Value"
            />

            <p
              data-reveal
              className="mt-5 text-sm leading-7 text-slate-600"
            >
              Electronic waste is the fastest-growing solid waste stream in
              the Philippines. In Valenzuela City alone, thousands of devices
              are discarded improperly every year — leaving toxic materials
              into soil and water.
            </p>

            <p
              data-reveal
              className="mt-4 text-sm leading-7 text-slate-600"
            >
              Wasteless is our response: a platform that intercepts those
              devices before they become waste, routes them to local repair
              shops, and tracks the environmental impact of every transaction —
              turning individual actions into measurable city-wide progress.
            </p>

            <div
              data-reveal
              className="mt-7 inline-flex items-center gap-2 rounded-full border border-[#d7e9ec] bg-[#f3fafb] px-4 py-2 text-[10px] font-semibold text-[#2d91a8]"
            >
              <Leaf size={13} />
              Every device can have a second life.
            </div>
          </div>

          <div className="space-y-3">
            {pillars.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                data-reveal
                className="wl-hover-card group flex items-center gap-4 rounded-xl border border-transparent bg-slate-50 px-4 py-4 hover:border-slate-100"
              >
                <span
                  className="wl-icon-box flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#dcebe6]"
                  style={{ color: TEAL }}
                >
                  <Icon size={17} />
                </span>

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {title}
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {text}
                  </p>
                </div>

                <ArrowRight
                  size={14}
                  className="wl-arrow ml-auto shrink-0 text-slate-300"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          HOW IT WORKS
      ========================================================= */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white to-slate-50 px-6 py-16 md:py-20">
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-0 h-56 w-56 -translate-x-1/2 rounded-full bg-[#e8f6f8] opacity-50 blur-3xl"
        />

        <div className="relative mx-auto max-w-6xl">
          <Heading
            color={GREEN}
            eyebrow="The Process"
            title="How Wasteless Works"
          />

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {steps.map(
              ({ icon: Icon, color, bg, title, text }, i) => (
                <div
                  key={title}
                  data-reveal
                  className={`${card} wl-hover-card group relative overflow-hidden p-6`}
                >
                  <div
                    className="absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full opacity-20 blur-2xl transition-transform duration-500 group-hover:scale-150"
                    style={{ background: color }}
                  />

                  <span
                    className="wl-icon-box relative flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{
                      background: bg,
                      color,
                    }}
                  >
                    <Icon size={20} />
                  </span>

                  <p className="mt-4 text-[11px] font-semibold tracking-wider text-slate-400">
                    0{i + 1}
                  </p>

                  <h3 className="mt-1 text-sm font-bold text-slate-900">
                    {title}
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {text}
                  </p>

                  <div
                    className="mt-5 h-1 w-0 rounded-full transition-all duration-500 group-hover:w-12"
                    style={{ background: color }}
                  />
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* =========================================================
          ROLES
      ========================================================= */}
      <section className="px-6 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <Heading
            eyebrow="The Community"
            title="Who Uses Wasteless"
            sub="Five distinct roles work together to create a complete e-waste management ecosystem."
          />

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {roles.map(
              ({ icon: Icon, color, bg, chip, title, text }) => (
                <div
                  key={title}
                  data-reveal
                  className="wl-role-card group rounded-2xl p-6"
                  style={{ background: bg }}
                >
                  <span
                    className="relative z-10 flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                    style={{
                      background: chip,
                      color,
                    }}
                  >
                    <Icon size={18} />
                  </span>

                  <h3 className="relative z-10 mt-4 text-sm font-bold text-slate-900">
                    {title}
                  </h3>

                  <p className="relative z-10 mt-1.5 text-xs leading-5 text-slate-500">
                    {text}
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* =========================================================
          TRUST TIERS
      ========================================================= */}
      <section
        className="relative overflow-hidden px-6 py-16 text-center md:py-20"
        style={{
          background:
            "linear-gradient(135deg, #17608a 0%, #2a86a4 60%, #397f8c 100%)",
        }}
      >
        <div
          aria-hidden="true"
          className="wl-blob absolute -left-28 top-0 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="wl-blob absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-[#b6e06a]/15 blur-3xl"
          style={{ animationDelay: "-3s" }}
        />

        <div className="relative">
          <Heading
            light
            eyebrow="Reputation System"
            title="Build Your Trust Tier"
            sub="Complete transactions, earn ratings, and unlock privileges as your reputation grows."
          />

          <div className="mx-auto mt-8 flex max-w-5xl flex-wrap justify-center gap-3">
            {tiers.map((t) => (
              <div
                key={t.name}
                data-reveal
                className="wl-tier w-36 cursor-default rounded-xl border border-white/20 px-3 py-4 backdrop-blur-sm"
                style={{ background: t.bg }}
              >
                <div className="wl-tier-icon text-xl">
                  {t.icon}
                </div>

                <p className="mt-1 text-sm font-bold text-white">
                  {t.name}
                </p>

                <p className="text-[10px] text-white/60">
                  {t.note}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          FAQ
      ========================================================= */}
      <section className="px-6 py-16 md:py-20">
        <div className="mx-auto max-w-2xl">
          <Heading
            color={GREEN}
            eyebrow="FAQs"
            title="Frequently Asked Questions"
          />

          <div className="mt-8 space-y-3">
            {faqs.map((f, i) => {
              const isOpen = open === i;

              return (
                <div
                  key={f.q}
                  data-reveal
                  className="wl-faq overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                  <button
                    onClick={() =>
                      setOpen(isOpen ? null : i)
                    }
                    aria-expanded={isOpen}
                    className="wl-faq-button flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-xs font-semibold text-slate-700"
                  >
                    <span>{f.q}</span>

                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                        isOpen
                          ? "bg-[#e4f2f5] text-[#2d91a8]"
                          : "bg-slate-50 text-slate-400"
                      }`}
                    >
                      <ChevronDown
                        size={15}
                        className={`transition-transform duration-300 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </span>
                  </button>

                  <div
                    className={`grid transition-all duration-300 ease-out ${
                      isOpen
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="mx-5 border-t border-slate-100" />

                      <p className="px-5 pb-5 pt-4 text-xs leading-5 text-slate-500">
                        {f.a}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================
          CONTACT
      ========================================================= */}
      <section className="relative overflow-hidden bg-slate-50 px-6 py-14 text-center md:py-16">
        <div
          aria-hidden="true"
          className="wl-pulse absolute left-[15%] top-1/2 h-20 w-20 -translate-y-1/2 rounded-full bg-[#b6e06a]/30 blur-2xl"
        />

        <div
          aria-hidden="true"
          className="wl-pulse absolute right-[15%] top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-[#2d91a8]/15 blur-2xl"
          style={{ animationDelay: "-2s" }}
        />

        <div className="relative">
          <Heading
            eyebrow="Get in Touch"
            title="Have Questions?"
            sub="Reach out to us and we'll get back to you as soon as possible."
          />

          <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-xs">
            <a
              href="mailto:wasteless@valenzuela.gov.ph"
              className="wl-contact-link inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-medium text-white"
              style={{ background: TEAL }}
            >
              <Mail size={14} />
              wasteless@valenzuela.gov.ph
            </a>

            <span className="inline-flex items-center gap-1.5 text-slate-500">
              <MapPin size={14} />
              Valenzuela City Hall, Metro Manila
            </span>
          </div>
        </div>
      </section>

      {/* =========================================================
          FOOTER
      ========================================================= */}
      <footer className="bg-[#0f172a] px-6 pb-6 pt-9 text-center text-white">
        <div className="flex items-center justify-center gap-3">
          <img
            src="/wasteless-logo.png"
            alt=""
            className="wl-footer-logo h-14 w-14 object-contain"
          />

          <div className="text-left">
            <p className="text-3xl font-semibold leading-none">
              Wasteless
            </p>

            <p className="mt-1 text-xs text-white/80">
              Recover More. Waste Less.
            </p>
          </div>
        </div>

        <div className="mx-auto mt-6 h-px max-w-md bg-white/10" />

        <p className="mt-5 text-[11px] text-white/35">
          © 2026 Wasteless. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
