import type { ReactNode } from 'react'
import { PROFILE_COLORS, type UserProfile } from '../lib/profile'

/** صورة الملف الشخصي: أول حرف من الاسم على لون المستخدم. */
export function ProfileAvatar({ profile, size = 40, children }: { profile: Pick<UserProfile, 'name' | 'color'>; size?: number; children?: ReactNode }) {
  const letter = profile.name.trim().charAt(0) || '؟'
  return (
    <span
      className="relative flex flex-shrink-0 items-center justify-center rounded-full font-bold"
      style={{ width: size, height: size, fontSize: size * 0.4, background: PROFILE_COLORS[profile.color] ?? PROFILE_COLORS[0], color: '#0a0a0c' }}
      aria-hidden="true"
    >
      {letter}
      {children}
    </span>
  )
}
