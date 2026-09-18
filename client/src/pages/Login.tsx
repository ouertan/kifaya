import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, LockKeyhole, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";

export default function Login() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/app");
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabaseConfigured) {
      toast.error("Supabase n'est pas configuré", { description: "Ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY." });
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        navigate("/app");
      } else {
        if (password.length < 8) throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim() } },
        });
        if (error) throw error;
        if (data.session) navigate("/app");
        else toast.success("Compte créé", { description: "Vérifiez votre email puis revenez vous connecter." });
      }
    } catch (err) {
      toast.error("Connexion impossible", { description: err instanceof Error ? err.message : "Veuillez réessayer." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#183a3a] px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="inline-flex items-center gap-2 text-[12px] font-semibold text-white/65 hover:text-white"><ArrowLeft className="h-4 w-4" />Retour à l'accueil</Link>
        <div className="grid min-h-[calc(100vh-80px)] items-center gap-10 py-10 lg:grid-cols-[.9fr_1.1fr]">
          <div className="hidden text-white lg:block">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#b9ef72] text-[#183a3a]"><span className="font-serif text-[30px] font-bold">k</span></div>
            <p className="mt-8 text-[11px] font-bold uppercase tracking-[.18em] text-[#b9ef72]">Connexion sécurisée</p>
            <h1 className="mt-4 max-w-lg text-[48px] font-bold leading-[.98] tracking-[-.075em]">Votre espace de contrôle commence ici.</h1>
            <p className="mt-5 max-w-md text-[14px] leading-relaxed text-white/55">Un vrai compte, une vraie base de données, et des règles d'accès appliquées directement par Supabase.</p>
            <div className="mt-8 space-y-3 text-[12px] text-white/70">
              <p className="flex items-center gap-2"><Check className="h-4 w-4 text-[#b9ef72]" />Authentification email + mot de passe</p>
              <p className="flex items-center gap-2"><Check className="h-4 w-4 text-[#b9ef72]" />Données isolées par utilisateur</p>
              <p className="flex items-center gap-2"><Check className="h-4 w-4 text-[#b9ef72]" />Aucun secret serveur dans le navigateur</p>
            </div>
          </div>

          <form onSubmit={submit} className="mx-auto w-full max-w-md rounded-3xl bg-[#fffdf9] p-7 shadow-2xl sm:p-9">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf6e4] text-[#5e873d]"><LockKeyhole className="h-5 w-5" /></div>
              <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8b9691]">Kifaya Ops</p><h2 className="mt-0.5 text-[21px] font-bold text-[#183a3a]">{mode === "login" ? "Se connecter" : "Créer un compte"}</h2></div>
            </div>
            {!supabaseConfigured && <div className="mt-5 rounded-xl bg-amber-50 p-3 text-[11px] text-amber-800">Configuration manquante : renseignez les variables Supabase dans votre hébergement.</div>}
            <div className="mt-6 space-y-3">
              {mode === "signup" && <label className="block"><span className="text-[11px] font-bold text-[#536660]">Nom</span><Input value={name} onChange={e => setName(e.target.value)} required className="mt-1.5 h-11 rounded-xl" placeholder="Votre nom" /></label>}
              <label className="block"><span className="text-[11px] font-bold text-[#536660]">Email</span><Input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1.5 h-11 rounded-xl" placeholder="vous@exemple.com" /></label>
              <label className="block"><span className="text-[11px] font-bold text-[#536660]">Mot de passe</span><Input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} required minLength={8} className="mt-1.5 h-11 rounded-xl" placeholder="8 caractères minimum" /></label>
            </div>
            <Button disabled={busy} type="submit" className="mt-6 h-12 w-full rounded-xl bg-[#183a3a] text-[12px] font-semibold text-white hover:bg-[#285251]">{busy ? "Veuillez patienter..." : mode === "login" ? "Se connecter" : "Créer mon compte"}<ArrowRight className="ml-2 h-4 w-4" /></Button>
            <button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")} className="mt-4 w-full text-[11px] font-semibold text-[#4d7d37] hover:underline">{mode === "login" ? "Créer un nouveau compte" : "J'ai déjà un compte"}</button>
            <div className="mt-6 rounded-2xl bg-[#f3f8ee] p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#5e873d]" /><div><p className="text-[11px] font-bold text-[#315836]">Protection des données</p><p className="mt-1 text-[10px] leading-relaxed text-[#71856d]">Les données métier sont protégées par les politiques RLS de la base. N'utilisez jamais la clé service_role dans le frontend.</p></div></div></div>
          </form>
        </div>
      </div>
    </div>
  );
}
