export default function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'sm' ? 'w-5 h-5 border-2' : size === 'lg' ? 'w-10 h-10 border-4' : 'w-7 h-7 border-2';
  return <div className={`${cls} border-brand-500 border-t-transparent rounded-full animate-spin`} />;
}
