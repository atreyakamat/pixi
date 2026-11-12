import type { Metadata } from "next";
import { CarouselMaker } from "@/landing/CarouselMaker";
import { BackLink } from "@/ui/BackLink";

export const metadata: Metadata = {
  title: "Carousel maker · Pixi",
  description: "Make a swipeable Instagram carousel from your photos. Thirty frames, no account, nothing uploaded.",
};

export default function MakeRoute() {
  return (
    <>
      <BackLink className="mx-auto block w-full max-w-5xl px-5 pt-6 text-[0.875rem] text-white/45 hover:text-white/70">← Pixi</BackLink>
      <CarouselMaker />
    </>
  );
}
