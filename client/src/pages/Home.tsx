import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  ArrowUpRight, Bell, Check, ClipboardList, Download, LayoutDashboard,
  LogOut, Menu, MoreHorizontal, PackageCheck, Plus, Search, Settings2,
  ShoppingBag, TrendingUp, UserRound, UsersRound, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

type Section = "Aperçu" | "Commandes" | "Clients" | "Rapports" | "Paramètres";
type Order = {
  id: string; user_id: string; reference: string; client_name: string | null;
  product: string; channel: string | null; amount: number; currency: string;
  status: "pending" | "preparing" | "in_progress" | "delivered" | "cancelled";
  notes: string | null; due_at: string | null; created_at: string;
};
type Client = { id: string; user_id: string; name: string; email: string | null; phone: string | null; segment: string | null; notes: string | null; created_at: string; };

const statusLabels: Record<Order["status"], string> = {
  pending: "En attente", preparing: "À préparer", in_progress: "En cours", delivered: "Livré", cancelled: "Annulé",
};
const statusStyle: Record<Order["status"], string> = {
  pending: "bg-[#f9e7e8] text-[#a5505d] border-[#f1ced2]",
  preparing: "bg-[#fff1d9] text-[#9a631f] border-[#f3dbaf]",
  in_progress: "bg-[#e3f4d9] text-[#42772b] border-[#cbe9b9]",
  delivered: "bg-[#eef0ec] text-[#53625e] border-[#dfe3dd]",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
};

function Logo({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-2.5"><div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[#b9ef72] text-[#183a3a]"><span className="font-serif text-[23px] font-bold">k</span><span className="absolute bottom-[7px] right-[7px] h-1.5 w-1.5 rounded-full bg-[#183a3a]" /></div>{!compact && <span className="text-[17px] font-bold text-white">kifaya<span className="text-[#b9ef72]">.</span></span>}</div>;
}
function Metric({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: LucideIcon }) {
  return <div className="kifaya-card p-5"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e6f6d8] text-[#5d8a39]"><Icon className="h-[17px] w-[17px]" /></div><p className="mt-4 text-[12px] text-[#7b8985]">{label}</p><p className="mt-1 text-[25px] font-bold tracking-[-.05em] text-[#183a3a]">{value}</p><p className="mt-1 text-[11px] text-[#89938f]">{detail}</p></div>;
}

function csvCell(value: unknown) {
  const raw = String(value ?? "");
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}
function exportCsv(orders: Order[]) {
  const rows = [["Commande","Client","Produit","Canal","Montant","Devise","Statut","Créée le"], ...orders.map(o => [o.reference,o.client_name,o.product,o.channel,o.amount,o.currency,statusLabels[o.status],new Date(o.created_at).toISOString()])];
  const csv = "\uFEFF" + rows.map(r => r.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = "kifaya-commandes.csv"; a.click(); URL.revokeObjectURL(url);
}

function Sidebar({ section, setSection, open, close, onLogout }: { section: Section; setSection: (s: Section) => void; open: boolean; close: () => void; onLogout: () => void }) {
  const items: [Section, typeof LayoutDashboard][] = [["Aperçu",LayoutDashboard],["Commandes",ClipboardList],["Clients",UsersRound],["Rapports",TrendingUp],["Paramètres",Settings2]];
  return <>
    {open && <button aria-label="Fermer le menu" onClick={close} className="fixed inset-0 z-40 bg-[#183a3a]/30 md:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[252px] flex-col bg-[#183a3a] px-3.5 py-5 text-white transition-transform md:static md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="px-2 pb-7"><Logo /></div>
      <nav className="space-y-1">{items.map(([label,Icon]) => <button key={label} onClick={() => { setSection(label); close(); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] font-medium ${section === label ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/[.08] hover:text-white"}`}><Icon className="h-[17px] w-[17px]" strokeWidth={1.8}/>{label}</button>)}</nav>
      <div className="mt-auto rounded-2xl bg-[#254b49] p-3.5"><p className="text-[12px] font-bold">Kifaya Ops</p><p className="mt-1 text-[10px] leading-relaxed text-white/55">Vos données sont stockées dans votre projet Supabase et protégées par RLS.</p></div>
      <button onClick={onLogout} className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-[11px] font-semibold text-white/55 hover:bg-white/[.08] hover:text-white"><LogOut className="h-4 w-4"/>Se déconnecter</button>
      <p className="px-2.5 pt-3 text-[10px] text-white/30">Kifaya Ops · production</p>
    </aside>
  </>;
}

export default function Home() {
  const [, navigate] = useLocation();
  const [section,setSection] = useState<Section>("Aperçu");
  const [menu,setMenu] = useState(false);
  const [user,setUser] = useState<any>(null);
  const [orders,setOrders] = useState<Order[]>([]);
  const [clients,setClients] = useState<Client[]>([]);
  const [loading,setLoading] = useState(true);
  const [showOrder,setShowOrder] = useState(false);
  const [showClient,setShowClient] = useState(false);
  const [orderForm,setOrderForm] = useState({reference:"",product:"",client_name:"",channel:"",amount:"",currency:"TND",status:"pending" as Order["status"],notes:""});
  const [clientForm,setClientForm] = useState({name:"",email:"",phone:"",segment:"",notes:""});
  const [query,setQuery] = useState("");

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/login"); return; }
    setUser(user);
    const [o,c] = await Promise.all([
      supabase.from("orders").select("*").order("created_at",{ascending:false}),
      supabase.from("clients").select("*").order("created_at",{ascending:false}),
    ]);
    if (o.error || c.error) toast.error("Impossible de charger les données", {description: o.error?.message || c.error?.message});
    setOrders((o.data || []) as Order[]); setClients((c.data || []) as Client[]); setLoading(false);
  }
  useEffect(() => {
    load();
    const { data: listener } = supabase.auth.onAuthStateChange((_event,session) => { if (!session) navigate("/login"); });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function logout() { await supabase.auth.signOut(); navigate("/"); }

  async function createOrder(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(orderForm.amount);
    if (!orderForm.reference.trim() || !orderForm.product.trim() || !Number.isFinite(amount) || amount < 0) { toast.error("Vérifiez les champs obligatoires."); return; }
    const { data,error } = await supabase.from("orders").insert({ user_id:user.id, reference:orderForm.reference.trim(), product:orderForm.product.trim(), client_name:orderForm.client_name.trim() || null, channel:orderForm.channel.trim() || null, amount, currency:orderForm.currency.trim().toUpperCase() || "TND", status:orderForm.status, notes:orderForm.notes.trim() || null }).select().single();
    if (error) { toast.error("Commande non créée",{description:error.message}); return; }
    setOrders([data as Order,...orders]); setShowOrder(false); setOrderForm({reference:"",product:"",client_name:"",channel:"",amount:"",currency:"TND",status:"pending",notes:""}); toast.success("Commande créée.");
  }
  async function createClient(e: React.FormEvent) {
    e.preventDefault();
    if (!clientForm.name.trim()) { toast.error("Le nom du client est obligatoire."); return; }
    const {data,error}=await supabase.from("clients").insert({user_id:user.id,name:clientForm.name.trim(),email:clientForm.email.trim()||null,phone:clientForm.phone.trim()||null,segment:clientForm.segment.trim()||null,notes:clientForm.notes.trim()||null}).select().single();
    if(error){toast.error("Client non créé",{description:error.message});return;}
    setClients([data as Client,...clients]); setShowClient(false); setClientForm({name:"",email:"",phone:"",segment:"",notes:""}); toast.success("Client ajouté.");
  }
  async function changeStatus(order:Order) {
    const next: Order["status"] = ({pending:"preparing",preparing:"in_progress",in_progress:"delivered",delivered:"delivered",cancelled:"cancelled"} as any)[order.status];
    if(next===order.status) return;
    const {error}=await supabase.from("orders").update({status:next}).eq("id",order.id);
    if(error){toast.error("Statut non modifié",{description:error.message});return;}
    setOrders(orders.map(o=>o.id===order.id?{...o,status:next}:o)); toast.success("Statut mis à jour.");
  }
  async function deleteOrder(id:string) {
    if(!window.confirm("Supprimer cette commande ? Cette action est définitive.")) return;
    const {error}=await supabase.from("orders").delete().eq("id",id);
    if(error){toast.error("Suppression impossible",{description:error.message});return;}
    setOrders(orders.filter(o=>o.id!==id)); toast.success("Commande supprimée.");
  }
  const filtered=useMemo(()=>orders.filter(o=>`${o.reference} ${o.client_name||""} ${o.product} ${o.channel||""}`.toLowerCase().includes(query.toLowerCase())),[orders,query]);
  const active=orders.filter(o=>["pending","preparing","in_progress"].includes(o.status)).length;
  const revenue=orders.filter(o=>o.status!=="cancelled").reduce((s,o)=>s+Number(o.amount||0),0);
  const delivered=orders.filter(o=>o.status==="delivered").length;
  const completion=orders.length?Math.round(delivered/orders.length*100):0;

  if(loading) return <div className="min-h-screen flex items-center justify-center bg-[#f9f7f3]"><div className="h-10 w-10 animate-pulse rounded-2xl bg-[#b9ef72]"/></div>;

  return <div className="flex min-h-screen bg-[#f9f7f3]">
    <Sidebar section={section} setSection={setSection} open={menu} close={()=>setMenu(false)} onLogout={logout}/>
    <main className="min-w-0 flex-1">
      <header className="flex min-h-[76px] items-center justify-between border-b border-[#e7e3dc] bg-[#f9f7f3]/90 px-5 backdrop-blur md:px-8">
        <div className="flex items-center gap-3"><button onClick={()=>setMenu(true)} className="rounded-lg p-2 text-[#71807c] hover:bg-[#ebe9e3] md:hidden"><Menu className="h-5 w-5"/></button><div><p className="hidden text-[11px] font-semibold uppercase tracking-[.18em] text-[#9aa39f] md:block">Espace de pilotage</p><h1 className="text-[18px] font-bold text-[#183a3a]">{section}</h1></div></div>
        <div className="flex items-center gap-2.5"><Bell className="h-[18px] w-[18px] text-[#71807c]"/><div className="h-7 w-px bg-[#e6e1d8]"/><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f2c1a2] text-[11px] font-bold text-[#704a37]">{(user?.user_metadata?.full_name||user?.email||"K").slice(0,2).toUpperCase()}</div><div className="hidden sm:block"><p className="text-[12px] font-bold text-[#183a3a]">{user?.user_metadata?.full_name || user?.email}</p><p className="text-[10px] text-[#8c9792]">Compte propriétaire</p></div></div>
      </header>
      <div className="mx-auto max-w-[1440px] p-5 md:p-8">
        {section==="Aperçu" && <div className="kifaya-enter space-y-6"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-[12px] text-[#8b9691]">Bonjour, {user?.user_metadata?.full_name || user?.email}</p><h2 className="mt-1 text-[27px] font-bold tracking-[-.06em] text-[#183a3a]">On garde le cap, ensemble.</h2></div><Button onClick={()=>setShowOrder(true)} className="h-10 rounded-xl bg-[#183a3a] text-[12px] font-semibold text-white"><Plus className="mr-2 h-4 w-4"/>Nouvelle commande</Button></div>
          <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Chiffre d'affaires" value={`${revenue.toLocaleString("fr-FR")} TND`} detail="Total des commandes non annulées" icon={TrendingUp}/><Metric label="Commandes actives" value={String(active)} detail="À traiter ou en cours" icon={ShoppingBag}/><Metric label="Clients" value={String(clients.length)} detail="Enregistrés dans votre espace" icon={UsersRound}/><Metric label="Taux de livraison" value={`${completion}%`} detail="Sur toutes les commandes" icon={PackageCheck}/></div>
          <div className="kifaya-card overflow-hidden"><div className="flex items-center justify-between border-b border-[#eeeae2] px-5 py-4"><div><h3 className="text-[14px] font-bold text-[#183a3a]">Dernières commandes</h3><p className="text-[11px] text-[#8b9691]">Données réelles de votre base</p></div><button onClick={()=>setSection("Commandes")} className="text-[11px] font-bold text-[#559071]">Voir tout</button></div>{orders.slice(0,6).map(o=><div key={o.id} className="flex items-center gap-3 border-b border-[#f0ede7] px-5 py-3.5 last:border-0"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e8f1e9] text-[#4e7f63]"><ClipboardList className="h-4 w-4"/></div><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-bold text-[#31504d]">{o.reference} · {o.product}</p><p className="text-[10px] text-[#929d98]">{o.client_name||"Client non renseigné"} · {new Date(o.created_at).toLocaleString("fr-FR")}</p></div><Badge variant="outline" className={`rounded-full text-[10px] ${statusStyle[o.status]}`}>{statusLabels[o.status]}</Badge><span className="text-[11px] font-bold text-[#31504d]">{Number(o.amount).toLocaleString("fr-FR")} {o.currency}</span></div>)}{orders.length===0&&<div className="p-10 text-center text-[12px] text-[#8b9691]">Aucune commande. Créez votre première commande.</div>}</div>
        </div>}
        {section==="Commandes" && <div className="kifaya-enter space-y-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-[12px] text-[#8b9691]">Suivez chaque demande de bout en bout</p><h2 className="mt-1 text-[25px] font-bold text-[#183a3a]">Commandes</h2></div><div className="flex gap-2"><Button variant="outline" onClick={()=>exportCsv(filtered)} className="h-10 rounded-xl text-[12px]"><Download className="mr-2 h-3.5 w-3.5"/>Exporter CSV</Button><Button onClick={()=>setShowOrder(true)} className="h-10 rounded-xl bg-[#183a3a] text-[12px] text-white"><Plus className="mr-2 h-4 w-4"/>Nouvelle commande</Button></div></div><div className="kifaya-card overflow-hidden"><div className="border-b border-[#eeeae2] p-4"><div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9ca8a3]"/><Input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher..." className="h-9 rounded-lg pl-9 text-[11px]"/></div></div><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left"><thead className="bg-[#fbfaf7] text-[10px] uppercase tracking-[.12em] text-[#9ba5a0]"><tr><th className="px-5 py-3">Commande</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Produit</th><th className="px-4 py-3">Canal</th><th className="px-4 py-3">Montant</th><th className="px-4 py-3">Statut</th><th/></tr></thead><tbody>{filtered.map(o=><tr key={o.id} className="border-t border-[#f0ede7]"><td className="px-5 py-3.5 text-[11px] font-bold">{o.reference}<p className="font-normal text-[10px] text-[#9aa49f]">{new Date(o.created_at).toLocaleDateString("fr-FR")}</p></td><td className="px-4 py-3.5 text-[11px]">{o.client_name||"—"}</td><td className="px-4 py-3.5 text-[11px] text-[#65736e]">{o.product}</td><td className="px-4 py-3.5 text-[11px]">{o.channel||"—"}</td><td className="px-4 py-3.5 text-[11px] font-bold">{Number(o.amount).toLocaleString("fr-FR")} {o.currency}</td><td className="px-4 py-3.5"><button onClick={()=>changeStatus(o)} title={o.status==="delivered"?"Déjà livré":"Avancer le statut"}><Badge variant="outline" className={`rounded-full text-[10px] ${statusStyle[o.status]}`}>{statusLabels[o.status]}</Badge></button></td><td className="px-4 py-3.5"><button onClick={()=>deleteOrder(o.id)} aria-label="Supprimer" className="rounded-lg p-1.5 text-[#9aa49f] hover:bg-red-50 hover:text-red-600"><X className="h-4 w-4"/></button></td></tr>)}</tbody></table>{filtered.length===0&&<div className="p-10 text-center text-[12px] text-[#8b9691]">Aucune commande trouvée.</div>}</div></div></div>}
        {section==="Clients" && <div className="kifaya-enter space-y-5"><div className="flex justify-between items-end"><div><p className="text-[12px] text-[#8b9691]">Votre base client réelle</p><h2 className="mt-1 text-[25px] font-bold text-[#183a3a]">Clients</h2></div><Button onClick={()=>setShowClient(true)} className="h-10 rounded-xl bg-[#183a3a] text-[12px] text-white"><Plus className="mr-2 h-4 w-4"/>Ajouter un client</Button></div><div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">{clients.map(c=><div key={c.id} className="kifaya-card p-5"><div className="flex justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e6f3d7] text-[11px] font-bold text-[#65863d]">{c.name.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase()}</div><span className="rounded-full bg-[#f2f0eb] px-2 py-1 text-[9px] font-bold text-[#72807b]">{c.segment||"Client"}</span></div><p className="mt-4 text-[13px] font-bold text-[#31504d]">{c.name}</p><p className="mt-1 text-[10px] text-[#929d98]">{c.email||"Email non renseigné"}</p>{c.phone&&<p className="mt-1 text-[10px] text-[#929d98]">{c.phone}</p>}<p className="mt-4 border-t pt-3 text-[10px] text-[#8b9691]">Ajouté le {new Date(c.created_at).toLocaleDateString("fr-FR")}</p></div>)}{clients.length===0&&<div className="kifaya-card col-span-full p-10 text-center text-[12px] text-[#8b9691]">Aucun client. Ajoutez votre premier client.</div>}</div></div>}
        {section==="Rapports" && <div className="kifaya-enter space-y-5"><div><p className="text-[12px] text-[#8b9691]">Calculé à partir de vos données</p><h2 className="mt-1 text-[25px] font-bold text-[#183a3a]">Rapports</h2></div><div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4"><Metric label="CA" value={`${revenue.toLocaleString("fr-FR")} TND`} detail="Hors commandes annulées" icon={TrendingUp}/><Metric label="Commandes" value={String(orders.length)} detail="Total enregistré" icon={ShoppingBag}/><Metric label="Livrées" value={String(delivered)} detail={`${completion}% du total`} icon={Check}/><Metric label="Panier moyen" value={`${(orders.filter(o=>o.status!=="cancelled").length?revenue/orders.filter(o=>o.status!=="cancelled").length:0).toLocaleString("fr-FR",{maximumFractionDigits:2})} TND`} detail="Commandes non annulées" icon={ArrowUpRight}/></div><div className="kifaya-card p-5"><h3 className="text-[14px] font-bold">Répartition des statuts</h3><div className="mt-4 space-y-3">{(Object.keys(statusLabels) as Order["status"][]).map(s=><div key={s}><div className="flex justify-between text-[11px]"><span>{statusLabels[s]}</span><span className="font-bold">{orders.filter(o=>o.status===s).length}</span></div><div className="mt-1 h-2 rounded-full bg-[#eeeae2]"><div className="h-2 rounded-full bg-[#8fc9a7]" style={{width:`${orders.length?orders.filter(o=>o.status===s).length/orders.length*100:0}%`}}/></div></div>)}</div></div></div>}
        {section==="Paramètres" && <div className="kifaya-enter max-w-[820px] space-y-5"><div><p className="text-[12px] text-[#8b9691]">Configuration de votre compte</p><h2 className="mt-1 text-[25px] font-bold text-[#183a3a]">Paramètres</h2></div><div className="kifaya-card p-5"><h3 className="text-[14px] font-bold">Compte</h3><p className="mt-2 text-[11px] text-[#7e8b86]">Email : {user?.email}</p><p className="mt-1 text-[11px] text-[#7e8b86]">Identifiant : {user?.id}</p></div><div className="kifaya-card border-[#dce8cf] bg-[#f4faee] p-5"><h3 className="text-[13px] font-bold text-[#315836]">Google Sheets</h3><p className="mt-1 text-[11px] leading-relaxed text-[#6e876d]">L'ancienne connexion fictive a été retirée. Pour éviter d'exposer des clés Google dans le navigateur, une vraie synchronisation Sheets doit passer par une fonction serveur OAuth dédiée.</p></div></div>}
      </div>
    </main>

    {showOrder && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4"><form onSubmit={createOrder} className="w-full max-w-lg rounded-2xl bg-[#fffdf9] p-6 shadow-2xl"><div className="flex justify-between"><div><h3 className="text-lg font-bold text-[#183a3a]">Nouvelle commande</h3><p className="text-[11px] text-[#8b9691]">Enregistrée directement dans votre base.</p></div><button type="button" onClick={()=>setShowOrder(false)}><X/></button></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{[["reference","Référence *"],["product","Produit / service *"],["client_name","Client"],["channel","Canal"],["amount","Montant *"],["currency","Devise"]].map(([key,label])=><label key={key} className="block"><span className="text-[10px] font-bold text-[#536660]">{label}</span><Input type={key==="amount"?"number":"text"} step={key==="amount"? "0.01":undefined} value={(orderForm as any)[key]} onChange={e=>setOrderForm({...orderForm,[key]:e.target.value})} required={label.includes("*")} className="mt-1 h-10 rounded-lg text-[11px]"/></label>)}</div><label className="mt-3 block"><span className="text-[10px] font-bold">Statut</span><select value={orderForm.status} onChange={e=>setOrderForm({...orderForm,status:e.target.value as Order["status"]})} className="mt-1 h-10 w-full rounded-lg border px-3 text-[11px]">{Object.entries(statusLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label className="mt-3 block"><span className="text-[10px] font-bold">Notes</span><textarea value={orderForm.notes} onChange={e=>setOrderForm({...orderForm,notes:e.target.value})} className="mt-1 min-h-20 w-full rounded-lg border p-3 text-[11px]" maxLength={2000}/></label><Button type="submit" className="mt-4 h-10 w-full rounded-lg bg-[#183a3a] text-[11px] text-white">Créer la commande</Button></form></div>}
    {showClient && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4"><form onSubmit={createClient} className="w-full max-w-lg rounded-2xl bg-[#fffdf9] p-6 shadow-2xl"><div className="flex justify-between"><div><h3 className="text-lg font-bold text-[#183a3a]">Ajouter un client</h3><p className="text-[11px] text-[#8b9691]">Enregistré dans votre espace uniquement.</p></div><button type="button" onClick={()=>setShowClient(false)}><X/></button></div><div className="mt-5 space-y-3">{[["name","Nom *"],["email","Email"],["phone","Téléphone"],["segment","Segment"]].map(([key,label])=><label key={key} className="block"><span className="text-[10px] font-bold">{label}</span><Input type={key==="email"?"email":"text"} value={(clientForm as any)[key]} onChange={e=>setClientForm({...clientForm,[key]:e.target.value})} required={label.includes("*")} className="mt-1 h-10 rounded-lg text-[11px]"/></label>)}</div><label className="mt-3 block"><span className="text-[10px] font-bold">Notes</span><textarea value={clientForm.notes} onChange={e=>setClientForm({...clientForm,notes:e.target.value})} maxLength={2000} className="mt-1 min-h-20 w-full rounded-lg border p-3 text-[11px]"/></label><Button type="submit" className="mt-4 h-10 w-full rounded-lg bg-[#183a3a] text-[11px] text-white">Ajouter le client</Button></form></div>}
  </div>;
}
