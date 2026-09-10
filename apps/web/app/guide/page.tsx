"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type Destination = { _id: string; name: string; state: string };
type Package = { title: string; durationHours: number; price: number; inclusions: string[]; exclusions: string[]; active: boolean };
type GuideProfile = { bio: string; residenceState: string; serviceStates: string[]; languages: string[]; specialties: string[]; destinationIds: string[] | Destination[]; pricePerDay?: number; packages: Package[]; verificationStatus: "not_started" | "pending" | "approved" | "rejected" };

const emptyPackage = (): Package => ({ title: "", durationHours: 8, price: 0, inclusions: [], exclusions: [], active: true });
const splitList = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

export default function GuideWorkspacePage() {
  const [profile, setProfile] = useState<GuideProfile>({ bio: "", residenceState: "", serviceStates: [], languages: [], specialties: [], destinationIds: [], pricePerDay: undefined, packages: [], verificationStatus: "not_started" });
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = sessionStorage.getItem("yv_access_token");
    if (!token) { window.location.replace("/auth"); return; }
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([fetch(`${API}/auth/me`, { headers }), fetch(`${API}/guides/me/profile`, { headers }), fetch(`${API}/destinations?limit=50`)])
      .then(async ([meResponse, profileResponse, destinationsResponse]) => {
        if (!meResponse.ok) throw new Error("Your session has expired. Please sign in again.");
        const me = await meResponse.json();
        if (!me.data.user.roles.includes("guide")) { window.location.replace("/account"); return; }
        if (profileResponse.ok) {
          const saved = await profileResponse.json();
          if (saved.data) setProfile((current) => ({ ...current, ...saved.data, destinationIds: saved.data.destinationIds?.map((destination: string | Destination) => typeof destination === "string" ? destination : destination._id) ?? [] }));
        }
        if (destinationsResponse.ok) setDestinations((await destinationsResponse.json()).data);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load your guide workspace."))
      .finally(() => setLoading(false));
  }, []);

  function updatePackage(index: number, changes: Partial<Package>) {
    setProfile((current) => ({ ...current, packages: current.packages.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item) }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setMessage(""); setError("");
    const token = sessionStorage.getItem("yv_access_token");
    try {
      const response = await fetch(`${API}/guides/me/profile`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(profile) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error?.message ?? "Your guide profile could not be saved.");
      setProfile((current) => ({ ...current, ...json.data, destinationIds: json.data.destinationIds?.map((destination: string | Destination) => typeof destination === "string" ? destination : destination._id) ?? [] }));
      setMessage("Your guide profile and packages have been saved.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Your guide profile could not be saved."); }
    finally { setSaving(false); }
  }

  async function submitForReview() {
    setSaving(true); setMessage(""); setError("");
    try {
      const token = sessionStorage.getItem("yv_access_token");
      const response = await fetch(`${API}/guides/me/verification`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error?.message ?? "Verification could not be submitted.");
      setProfile((current) => ({ ...current, verificationStatus: json.data.verificationStatus }));
      setMessage("Your profile has been submitted for verification.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Verification could not be submitted."); }
    finally { setSaving(false); }
  }

  if (loading) return <section className="mx-auto max-w-7xl px-5 py-24"><p className="eyebrow text-plum">GUIDE WORKSPACE</p><p className="mt-4 font-serif text-4xl text-ink">Preparing your workspace…</p></section>;
  if (error && !profile) return <section className="mx-auto max-w-xl px-5 py-24"><p className="rounded-2xl bg-amber-50 p-6 text-amber-900">{error}</p></section>;

  const selectedDestinationIds = profile.destinationIds as string[];
  return <section className="mx-auto max-w-7xl px-5 py-14"><div className="flex flex-wrap items-end justify-between gap-6 border-b border-violet-100 pb-10"><div><p className="eyebrow text-plum">LOCAL GUIDE WORKSPACE</p><h1 className="mt-4 font-serif text-5xl tracking-[-.04em] text-ink">Build your local offering.</h1><p className="mt-3 max-w-2xl text-slate-600">Set the places you know, your daily rate, and bookable packages. Your profile stays private until it is approved.</p></div><Link href="/account" className="rounded-full border border-violet-200 px-5 py-2.5 text-sm font-semibold text-plum">Back to account</Link></div>
    <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-lavender px-5 py-4"><p className="text-sm text-ink">Review status: <strong className="capitalize">{profile.verificationStatus.replace("_", " ")}</strong></p>{profile.verificationStatus === "not_started" || profile.verificationStatus === "rejected" ? <button type="button" disabled={saving} onClick={submitForReview} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Submit for verification</button> : null}</div>
    {message && <p className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">{message}</p>}{error && <p className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{error}</p>}
    <form onSubmit={save} className="mt-8 space-y-8"><div className="grid gap-6 lg:grid-cols-2"><section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm"><p className="eyebrow text-plum">YOUR LOCAL EXPERTISE</p><h2 className="mt-3 font-serif text-3xl text-ink">Profile details</h2><label className="mt-6 block text-sm font-medium text-slate-700">About you<textarea value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} maxLength={2000} rows={5} placeholder="Tell travelers what makes your local knowledge special." className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-plum" /></label><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">State of residence<input value={profile.residenceState} onChange={(event) => setProfile({ ...profile, residenceState: event.target.value })} required placeholder="e.g. Rajasthan" className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-plum" /></label><label className="text-sm font-medium text-slate-700">States you serve<input value={profile.serviceStates.join(", ")} onChange={(event) => setProfile({ ...profile, serviceStates: splitList(event.target.value) })} placeholder="Rajasthan, Gujarat" className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-plum" /></label></div><label className="mt-4 block text-sm font-medium text-slate-700">Languages<input value={profile.languages.join(", ")} onChange={(event) => setProfile({ ...profile, languages: splitList(event.target.value) })} required placeholder="Hindi, English, Marathi" className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-plum" /></label><label className="mt-4 block text-sm font-medium text-slate-700">Specialties<input value={profile.specialties.join(", ")} onChange={(event) => setProfile({ ...profile, specialties: splitList(event.target.value) })} required placeholder="Food walks, history, wildlife" className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-plum" /></label><label className="mt-4 block text-sm font-medium text-slate-700">Base price per day (₹)<input type="number" min="0" value={profile.pricePerDay ?? ""} onChange={(event) => setProfile({ ...profile, pricePerDay: event.target.value === "" ? undefined : Number(event.target.value) })} placeholder="2500" className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-plum" /></label></section>
      <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm"><p className="eyebrow text-plum">SERVICE AREAS</p><h2 className="mt-3 font-serif text-3xl text-ink">Destinations you cover</h2><p className="mt-3 text-sm leading-6 text-slate-600">Select the destinations where travelers can book you.</p><div className="mt-6 grid max-h-[380px] gap-3 overflow-auto pr-2">{destinations.length ? destinations.map((destination) => <label key={destination._id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-100 p-3 text-sm text-ink"><input type="checkbox" checked={selectedDestinationIds.includes(destination._id)} onChange={() => setProfile((current) => ({ ...current, destinationIds: selectedDestinationIds.includes(destination._id) ? selectedDestinationIds.filter((id) => id !== destination._id) : [...selectedDestinationIds, destination._id] }))} className="h-4 w-4 accent-[#6941a5]" /><span>{destination.name} <span className="text-slate-400">· {destination.state}</span></span></label>) : <p className="rounded-xl bg-[#faf8fd] p-4 text-sm text-slate-600">Destinations will be available here once they are published.</p>}</div></section></div>
      <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow text-plum">BOOKABLE PACKAGES</p><h2 className="mt-3 font-serif text-3xl text-ink">Your experiences</h2><p className="mt-2 text-sm text-slate-600">Add each experience travelers can book, with clear price and inclusions.</p></div><button type="button" onClick={() => setProfile((current) => ({ ...current, packages: [...current.packages, emptyPackage()] }))} className="rounded-full border border-violet-200 px-4 py-2 text-sm font-semibold text-plum">Add package</button></div><div className="mt-6 space-y-5">{profile.packages.length ? profile.packages.map((item, index) => <article key={index} className="rounded-2xl bg-[#faf8fd] p-5"><div className="flex justify-between gap-4"><h3 className="font-semibold text-ink">Package {index + 1}</h3><button type="button" onClick={() => setProfile((current) => ({ ...current, packages: current.packages.filter((_, itemIndex) => itemIndex !== index) }))} className="text-sm font-semibold text-rose-700">Remove</button></div><div className="mt-4 grid gap-4 md:grid-cols-3"><label className="text-sm font-medium text-slate-700">Package name<input required value={item.title} onChange={(event) => updatePackage(index, { title: event.target.value })} placeholder="Old city food walk" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-plum" /></label><label className="text-sm font-medium text-slate-700">Duration (hours)<input required type="number" min="1" max="240" value={item.durationHours} onChange={(event) => updatePackage(index, { durationHours: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-plum" /></label><label className="text-sm font-medium text-slate-700">Price (₹)<input required type="number" min="0" value={item.price} onChange={(event) => updatePackage(index, { price: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-plum" /></label></div><div className="mt-4 grid gap-4 md:grid-cols-2"><label className="text-sm font-medium text-slate-700">What’s included<input value={item.inclusions.join(", ")} onChange={(event) => updatePackage(index, { inclusions: splitList(event.target.value) })} placeholder="Tastings, local transport" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-plum" /></label><label className="text-sm font-medium text-slate-700">Not included<input value={item.exclusions.join(", ")} onChange={(event) => updatePackage(index, { exclusions: splitList(event.target.value) })} placeholder="Entry tickets, meals" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-plum" /></label></div><label className="mt-4 flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={item.active} onChange={(event) => updatePackage(index, { active: event.target.checked })} className="h-4 w-4 accent-[#6941a5]" />Package is available for booking</label></article>) : <p className="rounded-2xl border border-dashed border-violet-200 p-6 text-sm text-slate-600">No packages yet. Add your first experience to show travelers what you offer.</p>}</div></section>
      <div className="flex justify-end"><button disabled={saving} className="rounded-full bg-plum px-6 py-3 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : "Save guide profile"}</button></div></form></section>;
}
