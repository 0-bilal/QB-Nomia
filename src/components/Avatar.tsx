const PALETTE = ['#45C8FF', '#A1A1AD', '#FFBF47', '#2EE6C8', '#FF9A4D', '#FF5F6D', '#E4E4EA']

export function colorFor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash << 5) - hash + seed.charCodeAt(i)
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

/** صورة رمزية بالحرف الأول — تدرّج ناعم من لون ثابت لكل اسم مع حلقة رفيعة بنفس اللون. */
export function Avatar({ name, size = 46 }: { name: string; size?: number }) {
  const color = colorFor(name)
  const initial = name.trim().charAt(0) || '؟'
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(120% 120% at 30% 20%, ${color}55, ${color}14 70%)`,
        boxShadow: `inset 0 0 0 1.5px ${color}40`,
        color,
        fontSize: size * 0.4,
      }}
    >
      {initial}
    </div>
  )
}
