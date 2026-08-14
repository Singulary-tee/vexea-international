import { GoogleGenAI } from "@google/genai";
import { db, doc, getDoc, setDoc } from "../index";
import { PlayerGameProfile } from "./PlayerProfileStore";

export class BriefingRenderer {
  /**
   * Renders an operational briefing for a single player (capped at max 3 sentences).
   * Handles totalMatches < 3 gracefully with unclassified threat status.
   */
  public static renderPlayerBriefing(
    playerId: string,
    profile: PlayerGameProfile | null,
    displayName?: string
  ): string {
    const label = displayName || playerId;

    if (!profile || profile.totalMatches === 0) {
      return `OPERATIVE ${label}: FIRST ENGAGEMENT. No historical telemetry. Treat as untested asset — high predictability assumed.`;
    }

    if (profile.totalMatches >= 1 && profile.totalMatches < 3) {
      const preferredRole = profile.preferredRole || "UNKNOWN";
      return `OPERATIVE ${label}: ${profile.totalMatches} engagement(s) logged. Preferred role: ${preferredRole}. Insufficient data for pattern analysis.`;
    }

    const preferredRole = profile.preferredRole || "UNKNOWN";
    const totalMatches = profile.totalMatches;
    const roleSelectionCount = profile.classBreakdown?.[preferredRole] || 0;
    const rolePct = Math.round((roleSelectionCount / totalMatches) * 100);

    const sentence1 = `Operative ${label} favors ${preferredRole} class (${rolePct}% selection rate across ${totalMatches} matches).`;

    const avgKills = (profile.averages?.kills || 0).toFixed(1);
    const avgDeaths = (profile.averages?.deaths || 0).toFixed(1);
    const avgDmg = Math.round(profile.averages?.damageDealt || 0);

    const sentence2 = `Averages ${avgKills} eliminations and ${avgDeaths} deaths per match with ${avgDmg} damage output.`;

    const recentMatches = profile.recentMatches || [];
    const wins = recentMatches.filter((m) => m.result === "win").length;
    const recentCount = recentMatches.length;

    const sentence3 =
      recentCount > 0
        ? `Recent trajectory: ${wins} wins across last ${recentCount} recorded engagements.`
        : `No recent match telemetry logged.`;

    return `${sentence1} ${sentence2} ${sentence3}`;
  }

  /**
   * Dossier reader: checks Firestore Users/{uid}/dossier for LLM generated dossier.
   * If document exists and matchCountAtGeneration matches profile.totalMatches, returns generated text.
   * Otherwise falls back to Phase 1 template logic.
   */
  public static async getDossier(
    playerId: string,
    profile: PlayerGameProfile | null,
    displayName?: string
  ): Promise<string> {
    const fallbackText = this.renderPlayerBriefing(playerId, profile, displayName);

    if (!profile || profile.totalMatches < 3 || !playerId || playerId.startsWith("bot_")) {
      return fallbackText;
    }

    try {
      const dossierRef = doc(db, `Users/${playerId}/dossier`);
      const snap = await getDoc(dossierRef);
      if (snap.exists()) {
        const data = snap.data();
        if (
          data &&
          typeof data.text === "string" &&
          data.text.trim().length > 0 &&
          data.matchCountAtGeneration === profile.totalMatches
        ) {
          return data.text.trim();
        }
      }
    } catch (err) {
      console.error(`[BriefingRenderer] Failed to read dossier for player ${playerId}:`, err);
    }

    return fallbackText;
  }

  /**
   * Async version of renderPlayerBriefing.
   */
  public static async renderPlayerBriefingAsync(
    playerId: string,
    profile: PlayerGameProfile | null,
    displayName?: string
  ): Promise<string> {
    return this.getDossier(playerId, profile, displayName);
  }

  /**
   * Renders a combined operational intelligence briefing for all human players in a match.
   */
  public static renderMatchBriefing(
    players: Array<{ id: string; isBot?: boolean; displayName?: string }>,
    profiles: Map<string, PlayerGameProfile | null>
  ): string {
    const lines: string[] = [];
    for (const p of players) {
      if (p.isBot) continue;
      const profile = profiles.get(p.id) || null;
      lines.push(this.renderPlayerBriefing(p.id, profile, p.displayName));
    }

    if (lines.length === 0) {
      return "OPPOSITION INTEL: No human operatives detected in engagement zone.";
    }

    return `OPPOSITION INTEL BRIEFING:\n${lines.join("\n")}`;
  }

  /**
   * Async version of renderMatchBriefing.
   */
  public static async renderMatchBriefingAsync(
    players: Array<{ id: string; isBot?: boolean; displayName?: string }>,
    profiles: Map<string, PlayerGameProfile | null>
  ): Promise<string> {
    const lines: string[] = await Promise.all(
      players
        .filter((p) => !p.isBot)
        .map(async (p) => {
          const profile = profiles.get(p.id) || null;
          return this.getDossier(p.id, profile, p.displayName);
        })
    );

    if (lines.length === 0) {
      return "OPPOSITION INTEL: No human operatives detected in engagement zone.";
    }

    return `OPPOSITION INTEL BRIEFING:\n${lines.join("\n")}`;
  }

  /**
   * Generates LLM dossier for a single player in Full Briefing tier.
   * Output is capped at 200 tokens at the API call level.
   * Uses separate DOSSIER_MODEL env/config flag.
   */
  public static async generateDossierForPlayer(
    playerId: string,
    profile: PlayerGameProfile,
    displayName?: string
  ): Promise<string | null> {
    if (!playerId || playerId.startsWith("bot_") || !profile || profile.totalMatches < 3) {
      return null;
    }

    const dossierModel = process.env.DOSSIER_MODEL || "gemini-2.5-flash";
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error(`[BriefingRenderer] Cannot generate dossier for ${playerId}: GEMINI_API_KEY not configured.`);
      return null;
    }

    const label = displayName || playerId;
    const preferredRole = profile.preferredRole || "ASSAULT";
    const totalMatches = profile.totalMatches;
    const avgKills = (profile.averages?.kills || 0).toFixed(1);
    const avgDeaths = (profile.averages?.deaths || 0).toFixed(1);
    const avgDmg = Math.round(profile.averages?.damageDealt || 0);
    const recentMatches = profile.recentMatches || [];
    const wins = recentMatches.filter((m) => m.result === "win").length;
    const recentCount = recentMatches.length;
    const winRate = totalMatches > 0 ? Math.round((wins / Math.max(1, recentCount)) * 100) : 0;

    const systemInstruction =
      "You are VEXEA AI Commander evaluating contractor field telemetry. " +
      "Write a concise, clinical, tactical assessment for the specified operative. " +
      "Maximum 3 sentences. Strictly clinical tactical vocabulary. No fluff, no storytelling.";

    const prompt =
      `Operative Codename: ${label}\n` +
      `Preferred Class: ${preferredRole}\n` +
      `Total Matches: ${totalMatches}\n` +
      `Averages: ${avgKills} elims/match, ${avgDeaths} deaths/match, ${avgDmg} dmg/match\n` +
      `Recent Performance: ${wins} wins in last ${recentCount} matches (${winRate}% win rate)\n\n` +
      `Generate operational commander assessment for this operative dossier.`;

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      });

      const response = await ai.models.generateContent({
        model: dossierModel,
        contents: prompt,
        config: {
          systemInstruction,
          maxOutputTokens: 200,
        },
      });

      const generatedText = response.text?.trim();

      if (!generatedText) {
        console.error(`[BriefingRenderer] Empty response from ${dossierModel} for player ${playerId}`);
        return null;
      }

      const dossierData = {
        text: generatedText,
        matchCountAtGeneration: totalMatches,
        generatedAt: new Date(),
        modelUsed: dossierModel,
      };

      const dossierRef = doc(db, `Users/${playerId}/dossier`);
      await setDoc(dossierRef, dossierData);

      return generatedText;
    } catch (err) {
      console.error(`[BriefingRenderer] Dossier generation failed for player ${playerId}:`, err);
      return null;
    }
  }

  /**
   * Triggers async dossier generation at match-end for all players in Tier 3 ("Full Briefing").
   * Never blocks match end or other flows.
   */
  public static triggerMatchEndDossiers(
    players: Array<{ id: string; isBot?: boolean; displayName?: string }>,
    profiles: Map<string, PlayerGameProfile | null>
  ): void {
    // Fire and forget - async execution, never blocks caller
    (async () => {
      for (const p of players) {
        if (p.isBot || !p.id) continue;
        const profile = profiles.get(p.id) || null;
        if (!profile || profile.totalMatches < 3) continue;

        try {
          // Check cache before invoking LLM
          const dossierRef = doc(db, `Users/${p.id}/dossier`);
          const snap = await getDoc(dossierRef);
          if (snap.exists()) {
            const existing = snap.data();
            if (existing && existing.matchCountAtGeneration === profile.totalMatches) {
              continue;
            }
          }
          await this.generateDossierForPlayer(p.id, profile, p.displayName);
        } catch (err) {
          console.error(`[BriefingRenderer] Error checking/generating dossier for ${p.id}:`, err);
        }
      }
    })().catch((err) => {
      console.error("[BriefingRenderer] Match-end dossier generation job failed:", err);
    });
  }
}

