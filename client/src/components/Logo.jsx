export default function Logo({ size = 'md', className = '', showText = false, textClassName = '' }) {
  const sizeMap = {
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className={`relative ${currentSize} rounded-xl overflow-hidden shadow-lg shadow-cyan-500/25 ring-1 ring-cyan-400/40 bg-slate-950 flex items-center justify-center shrink-0`}>
        <img 
          src="/logo.png" 
          alt="ChainMind Logo" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-cyan-400/10 pointer-events-none" />
      </div>
      {showText && (
        <span className={`font-bold tracking-tight font-display text-white ${textClassName || 'text-xl sm:text-2xl'}`}>
          ChainMind
        </span>
      )}
    </div>
  );
}
