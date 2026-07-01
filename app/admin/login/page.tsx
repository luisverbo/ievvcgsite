import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-night px-5">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-night-2 p-8">
        <div className="mb-6 font-display text-xl font-extrabold text-cream">
          Festa das <span className="text-gold">Nações</span>
        </div>
        <p className="mb-6 text-sm text-cream-dim">Entre para acessar o painel.</p>
        <LoginForm />
      </div>
    </div>
  );
}
