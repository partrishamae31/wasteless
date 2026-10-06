import React, { useState } from "react";
import {
  Package, Leaf, Store, MapPin, Recycle, ShieldCheck, TrendingUp, Heart,
  BarChart3, BadgeCheck, Users, Mail, ChevronDown,
} from "lucide-react";

// Add to index.html <head> if not present:
// <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

const TEAL = "#2d91a8";
const GREEN = "#619d2d";
const NAVY = "#1b6a8f";

const stats = [
  { icon: Package, value: "2,400+", label: "Devices Recovered", color: TEAL, bg: "#e0f1f5" },
  { icon: Leaf, value: "340 kg", label: "CO₂e Prevented", color: GREEN, bg: "#e8f2db" },
  { icon: Store, value: "85+", label: "Partner Repair Shops", color: "#8b5cf6", bg: "#f0e8fe" },
  { icon: MapPin, value: "33", label: "Barangays Covered", color: "#f97316", bg: "#ffedd9" },
];

const pillars = [
  { icon: Recycle, title: "Circular Economy", text: "Every device listed is a potential resource, not waste." },
  { icon: ShieldCheck, title: "Safe & Verified", text: "All repair shops are identity and permit-verified." },
  { icon: TrendingUp, title: "Trackable Impact", text: "CO₂ recovery scores for every user and transaction." },
  { icon: Heart, title: "Community-First", text: "Built with and for the people of Valenzuela City." },
];

const steps = [
  { icon: Package, color: TEAL, bg: "#e0f1f5", title: "List Your Device", text: "Tech Harvesters post their old or broken electronics — phones, laptops, components — with condition details and an asking price." },
  { icon: Store, color: GREEN, bg: "#e8f2db", title: "Repair Shops Bid", text: "Licensed repair shops browse the Urban Mine Map and place bids on devices they can refurbish, repurpose, or harvest for parts." },
  { icon: BarChart3, color: "#8b5cf6", bg: "#f0e8fe", title: "Complete & Track", text: "Once a bid is accepted, both parties coordinate the meetup through the platform. Each transaction is tracked and contributes to your CO₂ recovery score." },
  { icon: BadgeCheck, color: "#f97316", bg: "#ffedd9", title: "Build Trust", text: "Rate each other after the transaction. Build your reputation tier — from Newcomer to Platinum — unlocking privileges as you grow." },
];

const roles = [
  { icon: Package, color: TEAL, bg: "#eaf4f7", chip: "#d4ebf1", title: "Tech Harvesters", text: "Residents and small business owners who sell their used or broken electronics instead of throwing them away." },
  { icon: Store, color: GREEN, bg: "#f1f6e8", chip: "#dfebca", title: "Repair Shops", text: "Licensed businesses that source devices for refurbishment, parts harvesting, or resale to extend the lifecycle of electronics." },
  { icon: ShieldCheck, color: "#8b5cf6", bg: "#f8f2fe", chip: "#ecdffc", title: "Admin", text: "City-level administrators who oversee the platform, verify users, and ensure compliance with e-waste regulations." },
  { icon: BarChart3, color: TEAL, bg: "#e8fbfd", chip: "#cdf1f6", title: "Environmental Officers", text: "CENRO officials who monitor environmental impact data, generate reports, and track e-waste diversion targets." },
  { icon: Users, color: "#f97316", bg: "#fff3e8", chip: "#ffe0c4", title: "Barangay Officers", text: "Local government officials who coordinate drop-off hubs, monitor barangay-level activity, and promote community participation." },
];

const tiers = [
  { icon: "🌱", name: "Newcomer", note: "0 transactions", bg: "rgba(255,255,255,.14)" },
  { icon: "🥉", name: "Bronze", note: "3+ transactions", bg: "rgba(160,120,90,.45)" },
  { icon: "🥈", name: "Silver", note: "10+ transactions", bg: "rgba(190,200,210,.35)" },
  { icon: "🥇", name: "Gold", note: "25+ transactions", bg: "rgba(110,160,70,.5)" },
  { icon: "💎", name: "Platinum", note: "50+ transactions", bg: "rgba(60,150,200,.55)" },
];

const faqs = [
  { q: "Is Wasteless free to use?", a: "Yes. Creating an account, listing devices, and placing bids are free for residents and verified repair shops." },
  { q: "How do I know if a repair shop is legitimate?", a: "Every repair shop is identity and permit-verified by city administrators before it can bid on devices." },
  { q: "What happens to my data?", a: "Your information is used only to run the platform and is never sold. Personal details are shared with a counterpart only after a bid is accepted." },
  { q: "Can I donate devices instead of selling them?", a: "Yes. You can list a device for free or hand it in at a barangay drop-off hub supported by the program." },
  { q: "How is the CO₂ recovery figure calculated?", a: "Each completed transaction is credited using the device category and weight, based on standard emission factors for avoided new manufacturing." },
];

const Heading = ({ eyebrow, title, sub, color = TEAL, light = false, left = false }) => (
  <div className={left ? "" : "text-center"}>
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-2" style={{ color: light ? "rgba(255,255,255,.7)" : color }}>{eyebrow}</p>
    <h2 className={`text-2xl md:text-3xl font-bold ${light ? "text-white" : "text-slate-900"}`}>{title}</h2>
    {sub && <p className={`mt-3 text-sm max-w-md ${left ? "" : "mx-auto"} ${light ? "text-white/70" : "text-slate-500"}`}>{sub}</p>}
  </div>
);

const card = "bg-white rounded-2xl border border-slate-100 shadow-[0_4px_14px_rgba(15,23,42,.08)]";

export default function Landing({ onGetStarted, onSignUp }) {
  const [open, setOpen] = useState(null);

  return (
    <div className="min-h-screen bg-white text-slate-800" style={{ fontFamily: "'Montserrat', system-ui, sans-serif" }}>
      {/* Hero */}
      <header className="text-center text-white px-6 py-20 md:py-24" style={{ background: `linear-gradient(135deg, #17608a 0%, #2a86a4 55%, #6a9a2c 100%)` }}>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight">Recover More.<br />Waste Less.</h1>
        <p className="mt-6 mx-auto max-w-2xl text-sm md:text-base text-white/85 leading-relaxed">
          Wasteless connects residents who have old electronics with licensed repair shops that can give those devices a second life — keeping harmful e-waste out of landfills and building a circular economy for Valenzuela City.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button onClick={onGetStarted} className="px-6 py-2.5 rounded-lg bg-white text-sm font-semibold shadow hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" style={{ color: NAVY }}>
            Get Started
          </button>
          <button onClick={onSignUp} className="px-6 py-2.5 rounded-lg border border-white/40 bg-white/15 text-sm font-semibold hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            Create an Account
          </button>
        </div>
      </header>

      {/* Stats */}
      <section className="bg-slate-50 px-6 py-8">
        <div className="mx-auto max-w-6xl grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ icon: Icon, value, label, color, bg }) => (
            <div key={label} className={`${card} p-6 text-center`}>
              <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: bg, color }}><Icon size={18} /></span>
              <p className="text-2xl font-bold" style={{ color }}>{value}</p>
              <p className="mt-1 text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-10 items-start">
          <div>
            <Heading left eyebrow="Our Mission" title="Turning E-Waste into Community Value" />
            <p className="mt-5 text-sm leading-7 text-slate-600">
              Electronic waste is the fastest-growing solid waste stream in the Philippines. In Valenzuela City alone, thousands of devices are discarded improperly every year — leaving toxic materials into soil and water.
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Wasteless is our response: a platform that intercepts those devices before they become waste, routes them to local repair shops, and tracks the environmental impact of every transaction — turning individual actions into measurable city-wide progress.
            </p>
          </div>
          <div className="space-y-3">
            {pillars.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex items-center gap-4 rounded-xl bg-slate-50 px-4 py-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#dcebe6]" style={{ color: TEAL }}><Icon size={16} /></span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{title}</p>
                  <p className="text-xs text-slate-500">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-16 bg-gradient-to-b from-white to-slate-50">
        <div className="mx-auto max-w-6xl">
          <Heading color={GREEN} eyebrow="The Process" title="How Wasteless Works" />
          <div className="mt-10 grid md:grid-cols-2 gap-5">
            {steps.map(({ icon: Icon, color, bg, title, text }, i) => (
              <div key={title} className={`${card} p-6`}>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: bg, color }}><Icon size={20} /></span>
                <p className="mt-4 text-[11px] text-slate-400">0{i + 1}</p>
                <h3 className="mt-1 text-sm font-bold text-slate-900">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <Heading eyebrow="The Community" title="Who Uses Wasteless" sub="Five distinct roles work together to create a complete e-waste management ecosystem." />
          <div className="mt-10 grid md:grid-cols-2 gap-5">
            {roles.map(({ icon: Icon, color, bg, chip, title, text }) => (
              <div key={title} className="rounded-2xl p-6" style={{ background: bg }}>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: chip, color }}><Icon size={18} /></span>
                <h3 className="mt-4 text-sm font-bold text-slate-900">{title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-slate-500">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust tiers */}
      <section className="px-6 py-16 text-center" style={{ background: `linear-gradient(135deg, #17608a, #2a86a4)` }}>
        <Heading light eyebrow="Reputation System" title="Build Your Trust Tier" sub="Complete transactions, earn ratings, and unlock privileges as your reputation grows." />
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {tiers.map((t) => (
            <div key={t.name} className="w-36 rounded-xl border border-white/20 px-3 py-4" style={{ background: t.bg }}>
              <div className="text-xl">{t.icon}</div>
              <p className="mt-1 text-sm font-bold text-white">{t.name}</p>
              <p className="text-[10px] text-white/60">{t.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <Heading color={GREEN} eyebrow="FAQs" title="Frequently Asked Questions" />
          <div className="mt-8 space-y-3">
            {faqs.map((f, i) => (
              <div key={f.q} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex w-full items-center justify-between px-5 py-3.5 text-left text-xs font-medium text-slate-700">
                  {f.q}
                  <ChevronDown size={15} className={`text-slate-400 transition-transform ${open === i ? "rotate-180" : ""}`} />
                </button>
                {open === i && <p className="px-5 pb-4 text-xs leading-5 text-slate-500">{f.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="px-6 py-14 text-center bg-slate-50">
        <Heading eyebrow="Get in Touch" title="Have Questions?" sub="Reach out to us and we'll get back to you as soon as possible." />
        <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-xs">
          <a href="mailto:wasteless@valenzuela.gov.ph" className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-medium text-white" style={{ background: TEAL }}>
            <Mail size={14} /> wasteless@valenzuela.gov.ph
          </a>
          <span className="inline-flex items-center gap-1.5 text-slate-500"><MapPin size={14} /> Valenzuela City Hall, Metro Manila</span>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0f172a] px-6 pt-8 pb-6 text-center text-white">
        <div className="flex items-center justify-center gap-3">
          <img src="/wasteless-logo.png" alt="" className="h-14 w-14 object-contain" />
          <div className="text-left">
            <p className="text-3xl font-semibold leading-none">Wasteless</p>
            <p className="mt-1 text-xs text-white/80">Recover More. Waste Less.</p>
          </div>
        </div>
        <p className="mt-6 text-[11px] text-white/35">© 2026 Wasteless. All rights reserved.</p>
      </footer>
    </div>
  );
}
