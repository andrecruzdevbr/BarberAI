"use client";

import { use } from "react";
import { BookingAgent } from "@/components/booking/BookingAgent";

type PageProps = { params: Promise<{ slug: string }> };

export default function PublicBookingPage({ params }: PageProps) {
  const { slug } = use(params);
  return <BookingAgent slug={slug} />;
}
