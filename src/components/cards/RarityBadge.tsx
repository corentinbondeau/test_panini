import { CardRarity } from "@/data/cards";

const RARITY_CONFIG: Record<CardRarity, { label: string; classes: string }> = {
  COMMUNE: {
    label: "COMMUNE",
    classes: "bg-gray-600/80 text-gray-200 border border-gray-500/40",
  },
  RARE: {
    label: "RARE",
    classes: "bg-amber-500/80 text-amber-950 border border-amber-400/60 font-bold",
  },
  LEGENDAIRE: {
    label: "LEGENDAIRE",
    classes: "bg-purple-600/80 text-purple-200 border border-purple-400/60 font-bold shadow-[0_0_8px_rgba(168,85,247,0.5)]",
  },
};

type RarityBadgeProps = {
  rarity: CardRarity;
  size?: "sm" | "md" | "lg";
};

export function RarityBadge({ rarity, size = "sm" }: RarityBadgeProps) {
  const config = RARITY_CONFIG[rarity];
  const sizeClasses = size === "sm" ? "text-[0.6rem] px-1.5 py-0.5" : size === "md" ? "text-xs px-2.5 py-1" : "text-sm px-3 py-1.5";

  return (
    <span
      className={`inline-flex items-center rounded-full uppercase tracking-wider ${sizeClasses} ${config.classes}`}
    >
      {config.label}
    </span>
  );
}
