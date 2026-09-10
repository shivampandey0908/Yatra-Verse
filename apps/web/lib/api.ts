const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
export type Destination = { _id: string; name: string; slug: string; state: string; country: string; summary: string; description: string; heroImageUrl?: string; tags: string[] };
export type Guide = { _id: string; bio: string; languages: string[]; specialties: string[]; pricePerDay?: number; currency: string; rating: { average: number; count: number }; userId?: { name: string }; destinationIds?: { name: string; slug: string }[] };
type Envelope<T> = { data: T; meta?: { total?: number } };
async function request<T>(path: string): Promise<T> { const result = await fetch(`${API_URL}${path}`, { next: { revalidate: 60 } }); if (!result.ok) throw new Error("The service is unavailable."); return result.json() as Promise<T>; }
export async function destinations(query = "") { return request<Envelope<Destination[]>>(`/destinations${query ? `?q=${encodeURIComponent(query)}` : ""}`); }
export async function destination(slug: string) { return request<Envelope<Destination>>(`/destinations/${encodeURIComponent(slug)}`); }
export async function guides() { return request<Envelope<Guide[]>>("/guides"); }
export async function intelligence(id: string, type: "safety" | "traffic") { return request<Envelope<{ status: string; source: string; retrievedAt: string; message: string; window?: string }>>(`/intelligence/${id}/${type}`); }
