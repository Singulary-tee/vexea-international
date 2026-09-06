const requestedTransport =
  typeof process !== "undefined" ? process.env.VEXEA_TRANSPORT : undefined;

export const TRANSPORT_MODE: "geckos" | "socketio" =
  requestedTransport === "geckos" ? "geckos" : "socketio";
