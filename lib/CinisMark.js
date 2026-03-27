// Canonical Cinis mark — rounded hex, locked version per S23.
// Import this everywhere. Never inline the SVG.
export default function CinisMark({ size = 20, className, style, ...rest }) {
  const R = 'M32,3.5 C32,3.5 54.5,15.2 55.5,15.8 C57,16.7 57,42.5 55.5,43.3 C54,44.1 32,56.5 32,56.5 C32,56.5 10,44.1 8.5,43.3 C7,42.5 7,16.7 8.5,15.8 C9.5,15.2 32,3.5 32,3.5 Z'
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} style={style} {...rest}>
      <path d={R} fill="none" stroke="#FF6644" strokeWidth="1.1" opacity="0.45"/>
      <path d={R} fill="#FF6644"/>
      <polygon points="32,7 51,18 51,40 32,52 13,40 13,18" fill="#120704"/>
      <polygon points="32,14 46,22 46,40 32,48 18,40 18,22" fill="#5A1005"/>
      <polygon points="32,20 42,26 42,40 32,45 22,40 22,26" fill="#A82010"/>
      <polygon points="32,26 38,29 38,40 32,43 26,40 26,29" fill="#E8321A"/>
      <polygon points="32,29 45,40 40,43 32,47 24,43 19,40" fill="#FF6644" opacity="0.92"/>
      <polygon points="32,33 41,40 38,42 32,45 26,42 23,40" fill="#FFD0C0" opacity="0.76"/>
      <polygon points="32,36 37,40 36,41 32,43 28,41 27,40" fill="#FFF0EB" opacity="0.60"/>
    </svg>
  )
}
