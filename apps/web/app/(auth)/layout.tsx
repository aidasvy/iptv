export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="inline-block">
            <span className="font-display text-3xl tracking-widest text-court-400">HOOP</span>
            <span className="font-display text-3xl tracking-widest text-slate-400">MANAGER</span>
          </a>
        </div>
        {children}
      </div>
    </div>
  );
}
