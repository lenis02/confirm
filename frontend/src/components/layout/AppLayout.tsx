import Sidebar from './Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-works-bg flex">
      <Sidebar />
      <main className="flex-1 overflow-auto min-h-screen">{children}</main>
    </div>
  );
}
