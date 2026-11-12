import type { Metadata } from "next";
import { ProfileView } from "@/landing/ProfileView";

export const metadata: Metadata = { title: "A Pixi profile", description: "Looks shared from Pixi, the free on-device retro camera." };

export default function ProfileRoute() {
  return <ProfileView />;
}
