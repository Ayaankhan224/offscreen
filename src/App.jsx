import React from 'react'

// Use arrays like this to change content quickly without rewriting the layout.
// Edit the items here if you want to update the sample content in the app.
const featureCards = [
  {
    title: 'Easy to Customize',
    description: 'Change the text, colors, and layout without breaking the structure.',
    accent: 'from-cyan-500 to-blue-600',
  },
  {
    title: 'Clear Structure',
    description: 'The app is split into small, readable sections so you can expand it easily.',
    accent: 'from-violet-500 to-purple-600',
  },
  {
    title: 'Simple Data Model',
    description: 'The content lives in arrays, which makes it easy to add or remove items.',
    accent: 'from-emerald-500 to-teal-600',
  },
]

const quickStats = [
  { label: 'Projects', value: '12' },
  { label: 'Tasks', value: '48' },
  { label: 'Progress', value: '76%' },
]

// Small reusable UI pieces keep the page easier to read and maintain.
function StatItem({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/70 p-4 text-center shadow-lg shadow-slate-950/20">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-slate-300">{label}</div>
    </div>
  )
}

function FeatureCard({ title, description, accent }) {
  return (
    <article className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-lg shadow-slate-950/30">
      <div className={`mb-4 h-2 rounded-full bg-gradient-to-r ${accent}`} />
      <h3 className="mb-2 text-xl font-semibold text-white">{title}</h3>
      <p className="text-sm leading-6 text-slate-300">{description}</p>
    </article>
  )
}

const App = () => {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Main page shell: easy to change by editing the JSX below. */}
      <div className="mx-auto max-w-6xl px-6 py-10 md:py-16">
        {/* Header section: edit the text here to change the product name and summary. */}
        <header className="mb-10 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-800 p-8 shadow-2xl shadow-slate-950/30">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-sm uppercase tracking-[0.2em] text-cyan-300">
                Fable starter
              </p>
              <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">
                Build something amazing.
              </h1>
            </div>

            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full bg-cyan-500 px-5 py-3 font-medium text-slate-950 transition hover:bg-cyan-400"
            >
              Get started
            </button>
          </div>
        </header>

        {/* Stats are kept in a separate array to make the page easy to maintain. */}
        <section className="mb-10 grid gap-4 sm:grid-cols-3">
          {quickStats.map((stat) => (
            <StatItem key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </section>

        {/* Feature cards are generated from data so you can add/remove items quickly. */}
        <section className="mb-10">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Why this setup is easy to modify</h2>
            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.15em] text-slate-300">
              Clean structure
            </span>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {featureCards.map((card) => (
              <FeatureCard
                key={card.title}
                title={card.title}
                description={card.description}
                accent={card.accent}
              />
            ))}
          </div>
        </section>

        {/* This final section is a good place for your real app content. */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <h2 className="mb-4 text-2xl font-bold text-white">Next steps</h2>
          <ul className="space-y-3 text-slate-300">
            <li>• Replace the sample content with your real data.</li>
            <li>• Add more components in separate files when the app grows.</li>
            <li>• Keep the UI logic simple and the content declarative.</li>
          </ul>
        </section>
      </div>
    </main>
  )
}

export default App