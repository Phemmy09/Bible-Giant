import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col justify-between items-center px-4 py-8 sm:py-16">
      {/* Top Header & Brand */}
      <header className="w-full max-w-xl text-center pt-8">
        <div className="inline-block">
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-navy-900">
            Bible Giants
          </h1>
          <div className="h-0.5 w-full bg-gold-500 mt-2 rounded-full" />
        </div>
        <p className="mt-4 text-ink-500 text-lg sm:text-xl font-medium tracking-wide">
          Ondo & Ekiti Camp Meeting
        </p>
        <div className="mt-2 inline-flex items-center gap-2 bg-gold-100/80 border border-gold-300 text-gold-900 px-3.5 py-1 rounded-full text-xs sm:text-sm font-semibold">
          <span>Official Event Code:</span>
          <strong className="font-mono tracking-widest text-navy-950 font-extrabold text-sm sm:text-base">GIANT</strong>
        </div>
      </header>

      {/* Center Action Buttons */}
      <section className="w-full max-w-md my-auto flex flex-col gap-5 py-8">
        <Link
          href="/contestant"
          className="w-full min-h-[56px] px-6 py-4 rounded-btn bg-navy-900 text-cream-50 font-semibold text-lg flex items-center justify-center text-center shadow-soft hover:bg-navy-700 active:bg-navy-950 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2"
        >
          I am a Contestant
        </Link>

        <Link
          href="/audience"
          className="w-full min-h-[56px] px-6 py-4 rounded-btn bg-gold-500 text-navy-950 font-bold text-lg flex items-center justify-center text-center shadow-soft hover:bg-gold-300 active:bg-gold-500 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2"
        >
          I am in the Audience
        </Link>

        <Link
          href="/host/login"
          className="w-full min-h-[48px] px-6 py-3 rounded-btn bg-transparent text-navy-900 font-medium text-base flex items-center justify-center text-center border border-navy-700/20 hover:bg-cream-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 mt-2"
        >
          Operator
        </Link>
      </section>

      {/* Footer */}
      <footer className="w-full text-center py-4">
        <p className="text-sm text-ink-500 tracking-wider uppercase font-medium">
          Apostolic Faith
        </p>
      </footer>
    </main>
  );
}

