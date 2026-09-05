import type { LiveMatch } from "@/lib/types";
import { FixtureRow } from "./FixtureRow";

export function LeagueSection({ matches }: { matches: LiveMatch[] }) {
  return (
    <section className="flex flex-col gap-3">
      {matches.map((match) => (
        <FixtureRow key={match.id} match={match} />
      ))}
    </section>
  );
}