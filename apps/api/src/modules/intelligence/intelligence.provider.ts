export type IntelligenceStatus = "available" | "unavailable" | "development";
export type SafetyInsight = { status: IntelligenceStatus; source: string; retrievedAt: string; message: string; advisoryUrl?: string };
export type TrafficOutlook = { status: IntelligenceStatus; source: string; retrievedAt: string; message: string; window: string };
export interface IntelligenceProvider { getSafety(destinationId: string): Promise<SafetyInsight>; getTraffic(destinationId: string): Promise<TrafficOutlook>; }

/** Development-only adapter. It intentionally provides no real-world safety or traffic claims. */
export class DevelopmentIntelligenceProvider implements IntelligenceProvider {
  async getSafety(_destinationId: string): Promise<SafetyInsight> { return { status: "development", source: "Development provider", retrievedAt: new Date().toISOString(), message: "Live safety intelligence has not been configured for this environment." }; }
  async getTraffic(_destinationId: string): Promise<TrafficOutlook> { return { status: "development", source: "Development provider", retrievedAt: new Date().toISOString(), window: "Not available", message: "Live traffic outlook has not been configured for this environment." }; }
}
export class UnavailableIntelligenceProvider implements IntelligenceProvider {
  async getSafety(_destinationId: string): Promise<SafetyInsight> { return { status: "unavailable", source: "No provider configured", retrievedAt: new Date().toISOString(), message: "Safety intelligence is currently unavailable." }; }
  async getTraffic(_destinationId: string): Promise<TrafficOutlook> { return { status: "unavailable", source: "No provider configured", retrievedAt: new Date().toISOString(), window: "Not available", message: "Traffic outlook is currently unavailable." }; }
}
