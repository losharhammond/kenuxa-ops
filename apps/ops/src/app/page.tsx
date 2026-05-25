import Link   from 'next/link'
import { Brain, Mic, Zap, Shield, Mail, Database, ArrowRight, ChevronRight } from 'lucide-react'

const CAPABILITIES = [
  { icon: Mic,      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', title: 'Wake Word Activation',   desc: 'Say "Hey Kenuxa" from anywhere. No clicking. No typing.' },
  { icon: Brain,    color: 'text-indigo-400  bg-indigo-500/10  border-indigo-500/20',  title: 'AI Command Routing',     desc: 'Groq-powered intent engine understands what you mean, not just what you say.' },
  { icon: Zap,      color: 'text-amber-400   bg-amber-500/10   border-amber-500/20',   title: 'Workflow Automation',    desc: 'Chain operations. Schedule tasks. Trigger on events. Run while you sleep.' },
  { icon: Mail,     color: 'text-blue-400    bg-blue-500/10    border-blue-500/20',    title: 'Email Intelligence',     desc: 'Summarize your inbox, draft replies, send emails — all by voice.' },
  { icon: Database, color: 'text-purple-400  bg-purple-500/10  border-purple-500/20',  title: 'Operational Memory',     desc: 'Remembers context, preferences, contacts, and decisions across sessions.' },
  { icon: Shield,   color: 'text-rose-400    bg-rose-500/10    border-rose-500/20',    title: 'Secure & Private',       desc: 'Local-first processing. Your data stays in your infrastructure.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050508] text-zinc-100 flex flex-col">

      {/* Nav */}
      <nav className="border-b border-zinc-800/60 px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
            <Brain className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <span className="text-sm font-black text-white tracking-widest">KENUXA OPS</span>
            <span className="ml-2 text-[9px] text-zinc-600 tracking-wider">VOICE OPERATIONS</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="text-sm text-zinc-500 hover:text-white transition-colors">Sign in</Link>
          <Link
            href="/auth/signup"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 transition-all"
          >
            Get Started <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center py-24">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/8 text-indigo-300 text-xs font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Phase 1 — Live Infrastructure
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-[1.05] mb-6 max-w-4xl">
          The Voice OS for{' '}
          <span className="bg-gradient-to-r from-emerald-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            AI-Driven Business
          </span>
        </h1>

        <p className="text-lg text-zinc-400 max-w-2xl mb-10 leading-relaxed">
          KENUXA OPS is not a chatbot. It's an operational intelligence layer — voice-controlled,
          AI-powered, built to run your business hands-free.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-20">
          <Link
            href="/auth/signup"
            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
          >
            <Mic className="w-4 h-4" />
            Start Operating
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl border border-zinc-700 text-zinc-300 font-medium text-sm hover:border-zinc-600 hover:text-white transition-all"
          >
            View Dashboard <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Wake word demo */}
        <div className="relative max-w-md w-full mx-auto mb-24">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/4 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400 font-medium">VOICE CONSOLE — LIVE</span>
            </div>
            <div className="space-y-2 text-left">
              {[
                { role: 'user', text: '"Hey Kenuxa, summarize my inbox and send the report to John"' },
                { role: 'ops',  text: 'Got it. Summarizing 12 unread emails… Drafting report… Sent to john@company.com ✓' },
                { role: 'user', text: '"Create a task to follow up next Thursday"' },
                { role: 'ops',  text: 'Task created: Follow up with John — due Thursday 29 May ✓' },
              ].map((msg, i) => (
                <div key={i} className={`flex gap-2 text-xs ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`px-3 py-1.5 rounded-xl max-w-[85%] ${
                    msg.role === 'user'
                      ? 'bg-zinc-800 text-zinc-300'
                      : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Capabilities grid */}
        <div className="max-w-5xl w-full grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CAPABILITIES.map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-left hover:border-zinc-700 transition-all">
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-3 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">{title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 px-8 py-6 flex items-center justify-between text-xs text-zinc-600">
        <span>KENUXA OPS · Part of the KENUXA Ecosystem</span>
        <span>Built for African businesses</span>
      </footer>
    </div>
  )
}
