// The score written in red and circled, like a teacher marking a paper
export function ScoreMark({ score, total, percentage, size = 'lg' }) {
  const big = size === 'lg'

  return (
    <div className="relative inline-flex flex-col items-center" role="img" aria-label={`Score ${score} out of ${total}, ${percentage} percent`}>
      <div className={`relative flex items-center justify-center ${big ? 'h-40 w-48' : 'h-20 w-24'}`}>
        <svg viewBox="0 0 200 160" className="absolute inset-0 h-full w-full text-marker" aria-hidden="true">
          {/* A slightly uneven loop, drawn twice like a quick pen stroke */}
          <path
            d="M100 14c48-2 88 22 90 62 2 40-38 70-92 70-52 0-88-26-88-64 0-40 40-66 96-68 30-1 56 8 70 22"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
        <span className={`relative font-display font-bold text-marker ${big ? 'text-5xl' : 'text-2xl'}`}>
          {score}
          <span className={`font-semibold ${big ? 'text-3xl' : 'text-lg'}`}>/{total}</span>
        </span>
      </div>
      <span className={`font-display font-semibold text-marker ${big ? 'text-2xl' : 'text-base'}`}>{percentage}%</span>
    </div>
  )
}
