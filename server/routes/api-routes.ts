import { Express } from "express";
import { matchManager } from "../MatchManager";
import { serverEconomyService, getCatalogItems } from "../data/economy-service";
import { DroneState } from "../../shared/constants";
import catalogItems from "../../shared/catalog.json";
import { CatalogItem } from "../../shared/verification/types";
import {
  verifyPurchase,
  verifyClaim,
  verifyPostMatchRewards,
  verifyAdReward,
  calculateLevelMetrics
} from "../../shared/verification/verifier";
import { db, doc, getDoc, setDoc, updateDoc, runTransaction, increment } from "../index";
import { DEFAULT_SHARED_FEATURE_FLAGS, SharedFeatureFlagKey } from "../../shared/feature-flags";

export function registerApiRoutes(app: Express): void {
  app.get("/.well-known/discord", (req, res) => {
    res.type("text/plain").send("dh=c7fcc88ec8fb058c2fa2b99e5a177846e092b3f7");
  });

  app.get("/api/health", (req, res) => {
    res.status(200).send("OK");
  });

  app.get("/api/debug-sentry", (req, res) => {
    // Intentional error test snippet
    (global as any).myUndefinedFunction();
    res.send("Triggered Sentry test error");
  });

  app.post("/api/log", (req, res) => {
    console.log("[CLIENT LOG]", ...req.body);
    res.sendStatus(200);
  });

  app.get("/api/logs", (req, res) => {
    res.json((global as any).serverLogs || []);
  });

  app.get("/api/doppler-client-secrets", async (req, res) => {
    const token =
      (req.query.token as string) ||
      process.env.VITE_DOPPLER_TOKEN ||
      process.env.DOPPLER_TOKEN;

    if (!token) {
      return res.status(400).json({ error: "No Doppler token provided" });
    }

    try {
      const response = await fetch(
        "https://api.doppler.com/v3/configs/config/secrets/download?format=json",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "User-Agent": "Vexea-Server/1.0",
          },
        }
      );

      if (!response.ok) {
        return res
          .status(response.status)
          .json({ error: `Doppler API error: ${response.statusText}` });
      }

      const secrets = await response.json();
      return res.json(secrets);
    } catch (err: any) {
      return res
        .status(500)
        .json({ error: err.message || "Failed to fetch Doppler client secrets" });
    }
  });

  app.get("/api/proxy-asset", async (req, res) => {
    const fileUrl = req.query.url as string;
    if (!fileUrl) {
      return res.status(400).send("URL parameter is required");
    }

    try {
      const fetchResponse = await fetch(fileUrl, {
        headers: {
          "User-Agent": "Vexea-Game-Server/1.0",
          "Origin": "http://localhost:5173"
        }
      });
      if (!fetchResponse.ok) {
        return res
          .status(fetchResponse.status)
          .send(`Failed to fetch from remote: ${fetchResponse.statusText}`);
      }

      const contentType =
        fetchResponse.headers.get("Content-Type") || "application/octet-stream";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

      const contentLength = fetchResponse.headers.get("Content-Length");
      if (contentLength) {
        res.setHeader("Content-Length", contentLength);
      }

      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

      const arrayBuffer = await fetchResponse.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (error: any) {
      console.error(`[Proxy] Error fetching from remote URL ${fileUrl}:`, error);
      res.status(500).send(`Proxy Error: ${error.message || error}`);
    }
  });

  app.get("/api/debug", (req, res) => {
    const roomsData = matchManager.getRooms().map((r) => ({
      roomId: r.roomId,
      active: r.matchActive,
      playerCount: r.players.size,
      players: Array.from(r.players.keys()),
      droneCount: r.drones.filter((d) => d.state !== DroneState.DEAD).length,
    }));
    res.json({ rooms: roomsData, logs: (global as any).serverLogs || [] });
  });

  app.get("/api/test-compile", (req, res) => {
    console.log("[SERVER TEST] Custom /api/test-compile endpoint was hit!");
    res.json({ success: true, timestamp: Date.now(), customLabel: "VEXEA_COMPILED_VERSION" });
  });

  app.get("/api/economy/store", async (req, res) => {
    try {
      const items = getCatalogItems();
      const discountActive = String(req.query.discount || "false") === "true";
      const creditMultiplier = parseFloat(String(req.query.multiplier || "1.0"));
      const offers = serverEconomyService.getOffers(discountActive, creditMultiplier);
      res.json({ success: true, catalog: items, offers });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || err });
    }
  });

  app.post("/api/economy/init-player", async (req, res) => {
    try {
      const { playerId } = req.body;
      if (!playerId) {
        return res.status(400).json({ success: false, error: "playerId is required." });
      }
      const userRef = doc(db, "Users", playerId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        const starterPack = {
          credits: 500,
          energy: 10,
          unlockedItems: [],
          totalXp: 0,
          adClaimsToday: 0,
          lastAdClaimDate: 0
        };
        await setDoc(userRef, starterPack, { merge: true });
        return res.json({ success: true, created: true, data: starterPack });
      }
      const existingData = userSnap.data();
      const patchedData = {
        credits: existingData.credits ?? 500,
        energy: existingData.energy ?? 10,
        unlockedItems: existingData.unlockedItems ?? [],
        totalXp: existingData.totalXp ?? 0,
        adClaimsToday: existingData.adClaimsToday ?? 0,
        lastAdClaimDate: existingData.lastAdClaimDate ?? 0
      };
      return res.json({ success: true, created: false, data: patchedData });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || err });
    }
  });

  app.post("/api/economy/purchase", async (req, res) => {
    try {
      const { playerId, itemId, currentCredits, currentEnergy, unlockedItems } = req.body;
      if (!playerId || !itemId) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'playerId and itemId are required.' }
        });
      }

      const catalogItem = (catalogItems as CatalogItem[]).find((i) => i.id === itemId);
      if (!catalogItem) {
        return res.status(404).json({
          success: false,
          error: { code: 'ITEM_NOT_FOUND', message: 'Item not found in catalog.' }
        });
      }

      const userRef = doc(db, "Users", playerId);
      const userSnap = await getDoc(userRef);
      const playerData = userSnap.exists() ? userSnap.data() : {};

      const pCredits = currentCredits ?? playerData.credits ?? 500;
      const pEnergy = currentEnergy ?? playerData.energy ?? 10;
      const pUnlocked = unlockedItems ?? playerData.unlockedItems ?? [];
      const pLevel = playerData.battlePass || 1;

      const result = verifyPurchase(
        {
          playerId,
          itemId,
          currentCredits: pCredits,
          currentEnergy: pEnergy,
          currentLevel: pLevel,
          unlockedItems: pUnlocked
        },
        catalogItem
      );

      if (!result.isApproved) {
        return res.status(400).json({ success: false, error: result.error });
      }

      const updatedUnlocked = pUnlocked.includes(itemId) ? pUnlocked : [...pUnlocked, itemId];

      if (userSnap.exists()) {
        await updateDoc(userRef, {
          credits: result.remainingCredits,
          energy: result.remainingEnergy,
          unlockedItems: updatedUnlocked
        });
      } else {
        await setDoc(userRef, {
          credits: result.remainingCredits,
          energy: result.remainingEnergy,
          unlockedItems: updatedUnlocked,
          totalXp: 0,
          adClaimsToday: 0,
          lastAdClaimDate: 0
        });
      }

      return res.json({
        success: true,
        newCredits: result.remainingCredits,
        newEnergy: result.remainingEnergy,
        unlockedItems: updatedUnlocked
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: err.message || String(err) }
      });
    }
  });

  app.post("/api/economy/claim-daily", async (req, res) => {
    try {
      const { playerId, currentCredits, currentEnergy, lastClaimTimestamp } = req.body;
      if (!playerId) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'playerId is required.' }
        });
      }

      const userRef = doc(db, "Users", playerId);
      const userSnap = await getDoc(userRef);
      const playerData = userSnap.exists() ? userSnap.data() : {};

      const pCredits = currentCredits ?? playerData.credits ?? 500;
      const pEnergy = currentEnergy ?? playerData.energy ?? 10;
      const pLastClaim = lastClaimTimestamp ?? playerData.dailyRefreshedAt ?? 0;

      const result = verifyClaim({
        playerId,
        claimType: "DAILY_LOGIN",
        currentCredits: pCredits,
        currentEnergy: pEnergy,
        lastClaimTimestamp: pLastClaim
      });

      if (!result.isApproved) {
        return res.status(400).json({ success: false, error: result.error });
      }

      const now = Date.now();
      if (userSnap.exists()) {
        await updateDoc(userRef, {
          credits: result.newCredits,
          energy: result.newEnergy,
          dailyRefreshedAt: now
        });
      } else {
        await setDoc(userRef, {
          credits: result.newCredits,
          energy: result.newEnergy,
          dailyRefreshedAt: now,
          unlockedItems: [],
          totalXp: 0,
          adClaimsToday: 0,
          lastAdClaimDate: 0
        });
      }

      return res.json({
        success: true,
        newCredits: result.newCredits,
        newEnergy: result.newEnergy
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: err.message || String(err) }
      });
    }
  });

  app.post("/api/economy/match-rewards", async (req, res) => {
    try {
      const {
        playerId,
        matchDurationSec,
        kills,
        deaths,
        damageDealt,
        objectiveTimeHeld,
        revives,
        scoreIndividual,
        isWin,
        gameMode,
        adMultiplier
      } = req.body;

      if (!playerId) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'playerId is required.' }
        });
      }

      // Feature flag values
      const matchEnergyCost = DEFAULT_SHARED_FEATURE_FLAGS[SharedFeatureFlagKey.MATCH_ENERGY_COST]; // should be 2
      const starterCredits = DEFAULT_SHARED_FEATURE_FLAGS[SharedFeatureFlagKey.NEW_PLAYER_STARTER_CREDITS];
      const starterEnergy = DEFAULT_SHARED_FEATURE_FLAGS[SharedFeatureFlagKey.NEW_PLAYER_STARTER_ENERGY];

      const result = verifyPostMatchRewards({
        playerId,
        matchDurationSec: matchDurationSec || 0,
        kills: kills || 0,
        deaths: deaths || 0,
        damageDealt: damageDealt || 0,
        objectiveTimeHeld: objectiveTimeHeld || 0,
        isWin: !!isWin,
        gameMode: gameMode || 'INFILTRATION'
      });

      if (!result.isApproved) {
        return res.status(400).json({ success: false, error: result.error });
      }

      const mult = adMultiplier || 1;
      const droneKills = kills || 0;
      const pDeaths = deaths || 0;
      const pScoreIndividual = scoreIndividual || 0;
      const objectiveTime = objectiveTimeHeld || 0;
      const pRevives = revives || 0;

      let bpRankChange = mult * (pScoreIndividual > 0 ? 1 : 0);

      // Use verifier output for rewards (applying adMultiplier if applicable)
      const creditsEarned = Math.round(result.creditsEarned * mult);
      const xpEarned = Math.round(result.xpEarned * mult);

      const userRef = doc(db, "Users", playerId);
      
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists()) {
          const totalMatches = 1;
          const totalWins = isWin ? 1 : 0;
          const winRate = (totalWins / totalMatches) * 100;

          transaction.set(userRef, {
            displayName: "GUEST",
            faction: "Vibe Co.",
            credits: starterCredits + creditsEarned,
            energy: Math.max(0, starterEnergy - matchEnergyCost),
            createdAt: new Date(),
            dailyRefreshedAt: new Date(),
            
            score: xpEarned,
            lifetimeXP: xpEarned,
            kills: droneKills,
            battlePass: bpRankChange + 1,

            totalMatches,
            totalWins,
            totalDroneEliminations: droneKills,
            totalDeaths: pDeaths,
            totalObjectiveTimeHeld: objectiveTime,
            totalRevivesPerformed: pRevives,
            highestIndividualScore: pScoreIndividual,
            winRate: parseFloat(winRate.toFixed(1))
          });
        } else {
          const data = userDoc.data() || {};
          
          const currentMatches = (data.totalMatches || 0) + 1;
          const currentWins = (data.totalWins || 0) + (isWin ? 1 : 0);
          const winRate = (currentWins / currentMatches) * 100;

          const currentHigh = data.highestIndividualScore || 0;
          const newHigh = Math.max(currentHigh, pScoreIndividual);

          const currentCredits = data.credits !== undefined ? data.credits : starterCredits;
          const currentEnergy = data.energy !== undefined ? data.energy : starterEnergy;

          transaction.update(userRef, {
            score: increment(xpEarned),
            lifetimeXP: increment(xpEarned),
            kills: increment(droneKills),
            battlePass: increment(bpRankChange),

            credits: Math.max(0, currentCredits + creditsEarned),
            energy: Math.max(0, currentEnergy - matchEnergyCost),

            totalMatches: currentMatches,
            totalWins: currentWins,
            totalDroneEliminations: increment(droneKills),
            totalDeaths: increment(pDeaths),
            totalObjectiveTimeHeld: increment(objectiveTime),
            totalRevivesPerformed: increment(pRevives),
            highestIndividualScore: newHigh,
            winRate: parseFloat(winRate.toFixed(1))
          });
        }

        const matchRef = doc(db, "MatchInProgress", playerId);
        transaction.delete(matchRef);
      });

      return res.json({
        success: true,
        creditsEarned,
        xpEarned,
        newLevel: bpRankChange
      });
    } catch (err: any) {
      console.error("[API] Error in /api/economy/match-rewards:", err);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: err.message || String(err) }
      });
    }
  });

  app.post("/api/economy/ad-reward", async (req, res) => {
    try {
      const { playerId, currentEnergy, adClaimsToday, lastAdClaimDate } = req.body;
      if (!playerId) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'playerId is required.' }
        });
      }

      const userRef = doc(db, "Users", playerId);
      const userSnap = await getDoc(userRef);
      const playerData = userSnap.exists() ? userSnap.data() : {};

      const pEnergy = currentEnergy ?? playerData.energy ?? 10;
      const pAdClaimsToday = adClaimsToday ?? playerData.adClaimsToday ?? 0;
      const pLastAdClaimDate = lastAdClaimDate ?? playerData.lastAdClaimDate ?? 0;

      const result = verifyAdReward({
        playerId,
        currentEnergy: pEnergy,
        adClaimsToday: pAdClaimsToday,
        lastAdClaimDate: pLastAdClaimDate
      });

      if (!result.isApproved) {
        return res.status(400).json({ success: false, error: result.error });
      }

      const now = Date.now();
      if (userSnap.exists()) {
        await updateDoc(userRef, {
          energy: result.newEnergy,
          adClaimsToday: result.adClaimsToday,
          lastAdClaimDate: now
        });
      } else {
        await setDoc(userRef, {
          credits: 500,
          energy: result.newEnergy,
          unlockedItems: [],
          totalXp: 0,
          adClaimsToday: result.adClaimsToday,
          lastAdClaimDate: now
        });
      }

      return res.json({
        success: true,
        newEnergy: result.newEnergy,
        adClaimsToday: result.adClaimsToday
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: err.message || String(err) }
      });
    }
  });

  app.get("/api/economy/factions", async (req, res) => {
    try {
      const warMultiplier = parseFloat(String(req.query.warMultiplier || "1.0"));
      const sectors = serverEconomyService.getFactionSectors(warMultiplier);
      res.json({ success: true, sectors, globalWarStatus: "active", epoch: 4 });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || err });
    }
  });
}
