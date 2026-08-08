import { PlayerGameProfile } from "./PlayerProfileStore";

export class BriefingRenderer {
  /**
   * Renders a tactical briefing for a single player (capped at max 3 sentences).
   * Handles totalMatches < 3 gracefully with unclassified threat status.
   */
  public static renderPlayerBriefing(
    playerId: string,
    profile: PlayerGameProfile | null,
    displayName?: string
  ): string {
    const label = displayName || playerId;

    if (!profile || profile.totalMatches < 3) {
      return `OPERATIVE ${label}: Insufficient combat telemetry (< 3 matches logged). Treat as unclassified threat.`;
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
   * Renders a combined tactical intelligence briefing for all human players in a match.
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
}
