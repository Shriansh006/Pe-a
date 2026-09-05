import type { Metadata } from "next";
import { MatchView } from "@/components/match/MatchView";

export const metadata: Metadata = {
  title: "Match detail · Peña",
  description: "Per-minute xG timeline and win-probability curve for a La Liga match.",
};

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="flex flex-1 flex-col px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-3xl flex-1">
        <MatchView matchId={id} />
      </div>
    </main>
  );
}