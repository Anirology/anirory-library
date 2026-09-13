import { useEffect, useRef } from 'react'

export default function CursorFollower() {
  const ref = useRef(null)
  useEffect(() => {
    const coarse = window.matchMedia('(pointer: coarse)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (coarse || reduced) return undefined
    const move = (event) => {
      if (!ref.current) return
      ref.current.style.transform = `translate3d(${event.clientX - 180}px, ${event.clientY - 180}px, 0)`
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [])
  return <div className="cursor-ambient" ref={ref} aria-hidden="true" />
}

