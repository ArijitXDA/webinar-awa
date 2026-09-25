'use client'

// "See oStaran in action" — compact video strip for the webinar landing.
// PRIVACY-FIRST: each card is a branded facade (no YouTube/Google request, no cookie)
// until the visitor taps Play; only then does a youtube-nocookie iframe load. Placed
// AFTER the audience cards so it never competes with the register CTA.

import { useState } from 'react'

type Vid = { id: string; title: string; tag: string; short: boolean }

const MAIN: Vid = { id: 'oeBW1EtHLgQ', title: 'Meet oStaran', tag: 'Our story', short: false }
const SHORTS: Vid[] = [
  { id: 'KcjY8BmLJEw', title: 'oStaran in 60 seconds',            tag: 'Quick look',        short: true },
  { id: 'nVrlCgjVVBU', title: 'Let your child build AI & robots', tag: 'For young learners', short: true },
]

function PlayGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="#07112E" aria-hidden="true" style={{ marginLeft: 3 }}>
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function VideoCard({ v }: { v: Vid }) {
  const [play, setPlay] = useState(false)
  return (
    <div
      className="relative w-full overflow-hidden rounded-xl shadow-lg"
      style={{ aspectRatio: v.short ? '9 / 16' : '16 / 9', background: 'linear-gradient(135deg,#07112E 0%,#0D1F4E 55%,#4338ca 100%)' }}
    >
      {play ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          title={v.title}
          allow="autoplay; encrypted-media; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlay(true)}
          aria-label={`Play video: ${v.title}`}
          className="group absolute inset-0 flex h-full w-full flex-col items-center justify-center gap-3 p-4 text-center"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-400 shadow-xl transition-transform duration-300 group-hover:scale-110">
            <PlayGlyph />
          </span>
          <span>
            <span className="block text-[10px] font-bold uppercase tracking-widest text-amber-400">{v.tag}</span>
            <span className="mt-0.5 block text-sm font-bold leading-snug text-white">{v.title}</span>
          </span>
          <span className="absolute bottom-2 text-[10px] font-medium text-white/60">▶ Tap to play</span>
        </button>
      )}
    </div>
  )
}

export default function VideoShowcase() {
  return (
    <section className="relative z-10 px-3 pb-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-4">
          <p className="text-sm font-bold text-amber-500 uppercase tracking-wider">Watch</p>
          <h2 className="text-xl font-extrabold text-gray-900 mt-0.5">See oStaran in action</h2>
          <p className="text-xs text-gray-500 mt-1">A quick look at what to expect — for professionals, students &amp; young learners.</p>
        </div>
        <VideoCard v={MAIN} />
        <div className="grid grid-cols-2 gap-3 mt-3">
          {SHORTS.map(v => <VideoCard key={v.id} v={v} />)}
        </div>
      </div>
    </section>
  )
}
