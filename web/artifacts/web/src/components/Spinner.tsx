
export function Spinner({ size = 24, color = 'currentColor', className = '', style = {} }: any) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke={color} 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
      style={{ animation: 'spinner-spin 0.8s linear infinite', ...style }}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      <style>{`
        @keyframes spinner-spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </svg>
  );
}

export function PulseLoader({ size = 56, color = 'var(--brand-primary)', text = '' }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '32px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          border: `3px solid ${color}`, borderRadius: '50%', borderTopColor: 'transparent',
          animation: 'spinner-spin 1s cubic-bezier(0.5, 0, 0.5, 1) infinite'
        }}></div>
        <div style={{
          position: 'absolute', top: '15%', left: '15%', width: '70%', height: '70%',
          border: `3px solid ${color}`, borderRadius: '50%', borderBottomColor: 'transparent', opacity: 0.6,
          animation: 'spinner-spin 1s cubic-bezier(0.5, 0, 0.5, 1) infinite reverse'
        }}></div>
        <div style={{
          position: 'absolute', top: '35%', left: '35%', width: '30%', height: '30%',
          background: 'var(--brand-gradient)', borderRadius: '50%',
          animation: 'spinner-pulse 1.5s ease-in-out infinite',
          boxShadow: 'var(--shadow-glow)'
        }}></div>
      </div>
      {text && <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.5px', animation: 'spinner-pulse 2s ease-in-out infinite' }}>{text}</div>}
      <style>{`
        @keyframes spinner-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.8); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
