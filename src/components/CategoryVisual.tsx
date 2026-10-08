import type { CSSProperties } from 'react'
import { categoryColor } from '../lib/categoryStats'
import { CategoryIcon } from './CategoryIcons'
import type { Category } from '../types'

/** مربع أيقونة الفئة بلونها الخافت — أيقونة الفئة أو أول حرف من اسمها. */
export function CategoryIconBox({ category, size = 40, iconSize, radius, style }: { category: Category; size?: number; iconSize?: number; radius?: number; style?: CSSProperties }) {
  const color = categoryColor(category)
  return (
    <span
      className="flex flex-shrink-0 items-center justify-center"
      style={{ width: size, height: size, borderRadius: radius ?? size * 0.35, background: `${color}1f`, color, ...style }}
    >
      {category.icon ? (
        <CategoryIcon iconKey={category.icon} size={iconSize ?? Math.round(size * 0.5)} />
      ) : (
        <span style={{ fontWeight: 700, fontSize: Math.round(size * 0.4) }}>{category.name.trim().charAt(0) || '؟'}</span>
      )}
    </span>
  )
}
