import { Card } from "@/data/cards";

export type SharedCollectionPayload = {
  version: 1;
  generatedAt: string;
  doubles: Record<string, number>;
};

export const buildSharedCollectionPayload = (
  cards: Card[],
  quantities: Record<string, number>
): SharedCollectionPayload => {
  const doubles = cards
    .filter((card) => (quantities[card.id] ?? 0) >= 2)
    .reduce<Record<string, number>>((acc, card) => {
      acc[card.id] = quantities[card.id];
      return acc;
    }, {});

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    doubles
  };
};

export const encodeSharedCollection = (payload: SharedCollectionPayload): string =>
  btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(payload))));

const SHARE_REGISTRY_KEY = "ecc-panini-share-registry-v1";

const decodePayloadString = (value: string): SharedCollectionPayload => {
  const bytes = Uint8Array.from(atob(value.trim()), (char) => char.charCodeAt(0));
  const decoded = new TextDecoder().decode(bytes);
  const payload = JSON.parse(decoded) as SharedCollectionPayload;
  if (!payload || payload.version !== 1 || typeof payload.doubles !== "object") {
    throw new Error("Format de partage invalide.");
  }
  return payload;
};

const shortHash8 = (input: string): string => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const normalized = (hash >>> 0).toString(36).toUpperCase();
  return normalized.padStart(8, "0").slice(0, 8);
};

const saveCodeMapping = (code: string, encodedPayload: string) => {
  if (typeof window === "undefined") return;
  const raw = window.localStorage.getItem(SHARE_REGISTRY_KEY);
  const registry = raw ? (JSON.parse(raw) as Record<string, string>) : {};
  registry[code] = encodedPayload;
  window.localStorage.setItem(SHARE_REGISTRY_KEY, JSON.stringify(registry));
};

const loadCodeMapping = (code: string): string | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SHARE_REGISTRY_KEY);
  if (!raw) return null;
  const registry = JSON.parse(raw) as Record<string, string>;
  return registry[code] ?? null;
};

export const decodeSharedCollection = (value: string): SharedCollectionPayload => {
  const input = value.trim();
  if (!input) throw new Error("Code vide");
  const normalized = input.toUpperCase();

  // Cas 1: lien direct (peut contenir share + data)
  if (input.includes("://") || input.includes("/doubles?")) {
    const parsedUrl = new URL(input, typeof window !== "undefined" ? window.location.origin : "https://example.com");
    const data = parsedUrl.searchParams.get("data");
    const share = parsedUrl.searchParams.get("share");
    if (data) return decodePayloadString(data);
    if (share && /^[A-Z0-9]{1,8}$/.test(share)) {
      const encodedFromCode = loadCodeMapping(share);
      if (encodedFromCode) return decodePayloadString(encodedFromCode);
    }
    throw new Error("Lien de partage invalide.");
  }

  // Cas 2: code court (8 chars max)
  if (/^[A-Z0-9]{1,8}$/.test(normalized)) {
    const encodedFromCode = loadCodeMapping(normalized);
    if (!encodedFromCode) {
      throw new Error("Code inconnu localement. Utilise le lien direct pour un import fiable.");
    }
    return decodePayloadString(encodedFromCode);
  }

  // Cas 3: payload encodé brut
  return decodePayloadString(input);
};

export const shareCollection = (cards: Card[], quantities: Record<string, number>) => {
  const payload = buildSharedCollectionPayload(cards, quantities);
  const doubles = cards.filter((card) => (payload.doubles[card.id] ?? 0) >= 2);
  const lines = doubles.map((card) => `- ${card.firstName} ${card.lastName} (${card.id}) x${quantities[card.id]}`);
  const encodedPayload = encodeSharedCollection(payload);
  const shareCode = shortHash8(encodedPayload);
  saveCodeMapping(shareCode, encodedPayload);
  const text = [
    "Mes cartes en double (disponibles à l'échange) :",
    lines.length > 0 ? lines.join("\n") : "Aucun double pour le moment.",
    "",
    `Code de partage: ${shareCode}`
  ].join("\n");

  const url = `${typeof window !== "undefined" ? window.location.origin : "https://example.com"}/doubles?share=${encodeURIComponent(shareCode)}&data=${encodeURIComponent(encodedPayload)}`;

  return { text, url, shareCode };
};
