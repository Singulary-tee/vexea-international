import { Express } from "express";
import { matchManager } from "../MatchManager";
import { serverEconomyService } from "../data/economy-service";
import { DroneState } from "../../shared/constants";

export function registerApiRoutes(
  app: Express,
  db: any,
  doc: any,
  getDoc: any,
  setDoc: any,
  updateDoc: any,
  runTransaction: any,
  increment: any
): void {
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
          "User-Agent": "Vexea-Game-Server/1.0"
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
      const discountActive = String(req.query.discount || "false") === "true";
      const creditMultiplier = parseFloat(String(req.query.multiplier || "1.0"));
      const offers = serverEconomyService.getOffers(discountActive, creditMultiplier);
      res.json({ success: true, offers });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || err });
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
