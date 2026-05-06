import mclaren from "@/assets/teams/mclaren.png";
import ferrari from "@/assets/teams/ferrari.png";
import porsche from "@/assets/teams/porsche.png";
import lamborghini from "@/assets/teams/lamborghini.png";

export function getTeamEmblem(name?: string | null): string | null {
  if (!name) return null;
  const n = name.toLowerCase();
  if (n.includes("mclaren") || n.includes("mc laren")) return mclaren;
  if (n.includes("ferrari")) return ferrari;
  if (n.includes("porsche")) return porsche;
  if (n.includes("lambo")) return lamborghini;
  return null;
}
