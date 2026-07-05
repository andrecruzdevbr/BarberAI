/** Elementos visuais decorativos da home — identidade barbearia, estilo SaaS premium. */

type SvgProps = { className?: string };

export function BarberPole({ className = "" }: SvgProps) {
  return (
    <svg
      viewBox="0 0 88 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="pole-cap" x1="44" y1="8" x2="44" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f1f5f9" />
          <stop offset="1" stopColor="#94a3b8" />
        </linearGradient>
        <linearGradient id="pole-base" x1="44" y1="228" x2="44" y2="252" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1e293b" />
          <stop offset="1" stopColor="#0f172a" />
        </linearGradient>
        <pattern
          id="pole-stripes"
          width="18"
          height="18"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-35)"
        >
          <rect width="6" height="18" fill="#f8fafc" />
          <rect x="6" width="6" height="18" fill="#c0392b" />
          <rect x="12" width="6" height="18" fill="#1e4a8c" />
        </pattern>
        <filter id="pole-glow" x="-40%" y="-10%" width="180%" height="120%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Glow sutil clássico (vermelho + azul, baixa intensidade) */}
      <ellipse cx="44" cy="140" rx="28" ry="90" fill="#c0392b" fillOpacity="0.06" />
      <ellipse cx="44" cy="140" rx="24" ry="82" fill="#1e4a8c" fillOpacity="0.05" />
      {/* Top finial — cromado neutro */}
      <circle cx="44" cy="18" r="10" fill="url(#pole-cap)" filter="url(#pole-glow)" />
      <rect x="38" y="28" width="12" height="8" rx="2" fill="#1e293b" stroke="#334155" strokeWidth="0.75" />
      {/* Listras clássicas vermelho / branco / azul */}
      <rect x="30" y="36" width="28" height="188" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1" />
      <rect x="32" y="38" width="24" height="184" rx="5" fill="url(#pole-stripes)" />
      {/* Destaque de volume */}
      <rect x="34" y="42" width="4" height="170" rx="2" fill="white" fillOpacity="0.2" />
      {/* Base neutra escura */}
      <path
        d="M22 224h44l6 20H16l6-20z"
        fill="url(#pole-base)"
        stroke="#334155"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <ellipse cx="44" cy="246" rx="30" ry="5" fill="#020617" fillOpacity="0.5" />
    </svg>
  );
}

export function ScissorsIcon({ className = "" }: SvgProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <circle cx="14" cy="34" r="6" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="34" cy="34" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M18 30L38 8M10 30L30 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="34" cy="10" r="2" fill="currentColor" fillOpacity="0.5" />
    </svg>
  );
}

export function CombIcon({ className = "" }: SvgProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <path
        d="M12 8h24v28c0 2-1.5 4-4 4H16c-2.5 0-4-2-4-4V8z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M18 14v18M22 14v18M26 14v18M30 14v18" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

export function ClipperIcon({ className = "" }: SvgProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <rect x="10" y="14" width="28" height="22" rx="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 22h16M16 28h10" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <circle cx="32" cy="26" r="2" fill="currentColor" fillOpacity="0.6" />
      <path d="M14 36v4M34 36v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function RazorIcon({ className = "" }: SvgProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <path
        d="M8 28c0-6 8-14 16-14h8l8 8v6c0 6-8 14-16 14H16L8 28z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M24 14v20" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
      <path d="M12 26h24" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

/** Fundo decorativo com ferramentas em baixa opacidade */
export function HomeHeroBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <ScissorsIcon className="absolute -right-2 top-8 h-14 w-14 text-accent opacity-[0.07] sm:h-16 sm:w-16 lg:right-4 lg:top-4 lg:opacity-[0.09]" />
      <CombIcon className="absolute -left-3 bottom-16 h-12 w-12 text-accent opacity-[0.06] sm:h-14 sm:w-14 lg:bottom-24 lg:opacity-[0.08]" />
      <ClipperIcon className="absolute left-1/2 top-0 h-11 w-11 -translate-x-1/2 text-slate-400 opacity-[0.05] sm:h-12 sm:w-12 lg:left-auto lg:right-1/3 lg:translate-x-0 lg:opacity-[0.07]" />
      <RazorIcon className="absolute bottom-4 right-1/4 h-10 w-10 text-slate-400 opacity-[0.05] hidden sm:block lg:bottom-8" />
      <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/3 rounded-full bg-accent/[0.04] blur-3xl lg:h-64 lg:w-64" />
    </div>
  );
}

/** Composição principal: poste + ferramentas sutis ao redor */
export function HomeHeroVisual() {
  return (
    <div className="relative mx-auto flex max-w-[280px] items-end justify-center sm:max-w-none sm:justify-start lg:max-w-[320px]">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-40 w-40 rounded-full bg-accent/10 blur-2xl sm:h-48 sm:w-48" />
      </div>
      <BarberPole className="relative z-10 h-44 w-auto drop-shadow-[0_8px_28px_rgba(192,57,43,0.1)] sm:h-52 lg:h-56" />
      <ScissorsIcon className="absolute -right-1 top-6 z-20 h-9 w-9 text-accent/35 sm:h-10 sm:w-10 lg:-right-3 lg:top-4 lg:text-accent/45" />
      <CombIcon className="absolute bottom-8 -left-2 z-20 h-8 w-8 text-slate-400/30 sm:h-9 sm:w-9 lg:-left-4 lg:bottom-10" />
      <ClipperIcon className="absolute bottom-14 right-2 z-20 hidden h-8 w-8 text-accent/25 sm:block lg:right-0 lg:bottom-16 lg:h-9 lg:w-9" />
    </div>
  );
}

const benefits = [
  "Assistente que entende mensagens livres",
  "Horários reais da barbearia",
  "Confirmação na hora",
];

export function HomeHeroContent() {
  return (
    <div className="relative">
      <HomeHeroBackdrop />

      <div className="relative z-10 space-y-5 text-center lg:text-left">
        <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
            Agendamento online
          </span>
          <span className="inline-flex items-center rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] font-medium text-muted">
            Sem cadastro
          </span>
        </div>

        <div className="space-y-4">
          <h1 className="text-balance text-2xl font-bold leading-[1.12] tracking-tight text-white sm:text-3xl lg:text-[2rem] xl:text-4xl">
            Agende seu horário na barbearia em segundos
          </h1>
          <p className="text-balance mx-auto max-w-md text-sm leading-relaxed text-muted sm:text-base lg:mx-0">
            Converse com o assistente inteligente — escolha serviço, barbeiro e horário como no
            WhatsApp. Rápido, simples e sem criar conta.
          </p>
        </div>

        <ul className="mx-auto grid max-w-sm gap-2.5 text-left text-sm text-slate-300 sm:max-w-none lg:mx-0">
          {benefits.map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-muted text-accent">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              {item}
            </li>
          ))}
        </ul>

        {/* Visual integrado ao hero — compacto no mobile, ao lado no desktop */}
        <div className="pt-2 lg:pt-4">
          <HomeHeroVisual />
        </div>
      </div>
    </div>
  );
}
