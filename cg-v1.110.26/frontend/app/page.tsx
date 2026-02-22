'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  Cpu,
  Database,
  Layout,
  Shield,
  Mail,
  User,
  Loader2,
  Sparkles,
  Github,
  ChevronDown
} from 'lucide-react';

export default function GatekeeperPage() {
  const router = useRouter();
  const [hasEntered, setHasEntered] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const entered = localStorage.getItem('portfolio_entered');
    if (entered) {
      setHasEntered(true);
    }
  }, []);

  const handleEntry = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate minimal tracking or local storage save
    setTimeout(() => {
      localStorage.setItem('portfolio_entered', 'true');
      router.push('/explore');
    }, 1200);
  };

  const techStack = [
    {
      icon: <Layout className="w-5 h-5" />,
      title: "Frontend",
      items: ["Next.js 15 (App Router)", "Tailwind CSS", "TypeScript", "Lucide Icons"]
    },
    {
      icon: <Cpu className="w-5 h-5" />,
      title: "AI Layer",
      items: ["OpenAI GPT-4o", "ARIA Safety Shield Logic", "JSON Structured Output"]
    },
    {
      icon: <Database className="w-5 h-5" />,
      title: "Backend",
      items: ["FastAPI (Python)", "SQLAlchemy (Async)", "PostgreSQL", "Supabase Auth"]
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Infrastructure",
      items: ["Vercel / Render", "GitHub Actions", "Unit & E2E Testing"]
    }
  ];

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 font-sans selection:bg-teal-500/30">
      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-purple-500/5 rounded-full blur-[80px]" />
      </div>

      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-24">
        {/* Header Section */}
        <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="w-3 h-3" />
            AI Project Manager Portfolio
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight leading-tight">
            CommonGround <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">
              Co-parenting with Intent
            </span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            A high-fidelity co-parenting ecosystem built for conflict mitigation.
            Integrated with AI to flag toxicity, automate schedules, and simplify court-ready reporting.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          {/* Left: Explainer & Tech */}
          <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000 delay-200">
            <div>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                The Mission
              </h2>
              <p className="text-slate-400 leading-relaxed">
                As an AI Project Manager, I developed CommonGround to solve the communication breakdown in high-conflict family law.
                The platform doesn't just store data; it actively monitors and facilitates healthier interactions through ARIA, a specialized AI safety shield.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              {techStack.map((tech, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm hover:border-teal-500/30 transition-all group">
                  <div className="flex items-center gap-2 text-teal-400 mb-2 font-semibold">
                    {tech.icon}
                    {tech.title}
                  </div>
                  <ul className="space-y-1 text-slate-500 group-hover:text-slate-400 transition-colors">
                    {tech.items.map((item, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-slate-600" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Entry Form */}
          <div className="animate-in fade-in slide-in-from-right-8 duration-1000 delay-300">
            <div className="relative p-8 rounded-3xl bg-slate-800/80 border border-slate-700/50 backdrop-blur-md shadow-2xl overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent pointer-events-none" />

              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-white mb-2">Step Inside</h3>
                <p className="text-slate-400 mb-8 border-b border-slate-700 pb-4">
                  Please introduce yourself to view the full product experience.
                </p>

                {hasEntered ? (
                  <div className="space-y-4">
                    <p className="text-teal-400 font-medium">Welcome back!</p>
                    <button
                      onClick={() => router.push('/explore')}
                      className="w-full py-4 bg-teal-500 hover:bg-teal-400 text-slate-900 font-bold rounded-xl transition-all flex items-center justify-center gap-2 group"
                    >
                      Continue to Project
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button
                      onClick={() => localStorage.removeItem('portfolio_entered')}
                      className="w-full py-2 text-slate-500 hover:text-slate-300 text-sm transition-colors text-center"
                    >
                      Reset Session
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleEntry} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-400 px-1">Your Name</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-teal-400 transition-colors">
                          <User className="w-5 h-5" />
                        </div>
                        <input
                          required
                          type="text"
                          placeholder="Jane Doe"
                          className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3.5 pl-11 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-400 px-1">Professional Email</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-teal-400 transition-colors">
                          <Mail className="w-5 h-5" />
                        </div>
                        <input
                          required
                          type="email"
                          placeholder="jane@company.com"
                          className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3.5 pl-11 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 text-center uppercase tracking-widest pt-2">
                      Gate access for hiring professionals
                    </p>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 hover:-translate-y-1 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:translate-y-0"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Authorizing...
                        </>
                      ) : (
                        <>
                          Enter Project
                          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>

                    <div className="pt-4 flex items-center justify-center gap-4 border-t border-slate-700">
                      <a href="https://github.com" target="_blank" className="text-slate-500 hover:text-white transition-colors">
                        <Github className="w-5 h-5" />
                      </a>
                      <span className="w-1 h-1 rounded-full bg-slate-700" />
                      <span className="text-xs text-slate-500 font-medium tracking-tight">AI PM / Full-Stack Archetype</span>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Hint */}
        <div className="text-center text-slate-500 text-sm animate-pulse flex flex-col items-center gap-2 mt-8">
          <ChevronDown className="w-5 h-5" />
          Scroll to explore themes (coming soon)
        </div>
      </main>
    </div>
  );
}
