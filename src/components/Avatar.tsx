const PALETTE = ['#38BDF8', '#7C6CFF', '#F5B942', '#2DD4BF', '#FB923C', '#FF5C5C']

export function colorFor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash << 5) - hash + seed.charCodeAt(i)
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

export function Avatar({ name, size = 46 }: { name: string; size?: number }) {
  const color = colorFor(name)
  const initial = name.trim().charAt(0) || '؟'
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-full font-bold"
      style={{
        width: size,
        height: size,
        background: `${color}26`,
        color,
        fontSize: size * 0.4,
      }}
    >
      {initial}
    </div>
  )
}
