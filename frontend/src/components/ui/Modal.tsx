import { useEffect } from 'react';

export default function Modal({
  title,
  onClose,
  children,
  width = 'md',
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: 'sm' | 'md' | 'lg';
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const w = width === 'sm' ? 'max-w-sm' : width === 'lg' ? 'max-w-2xl' : 'max-w-md';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative card w-full ${w}`}>
        <div className="px-6 py-4 border-b border-works-border flex items-center justify-between">
          <h3 className="text-base font-semibold text-works-text">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-works-subtle hover:bg-works-hover hover:text-works-text transition cursor-pointer text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
