import { BookingAgent } from "@/components/booking/BookingAgent";
import { HomeHeroContent } from "@/components/booking/HomeHero";

export default function HomePage() {
  return (
    <BookingAgent showOwnerLinks hero={<HomeHeroContent />} />
  );
}
