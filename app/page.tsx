import { Board } from "@/components/matchday/Board";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-3xl flex-1">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
          Peña
          <span className="ml-2 rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 align-middle text-[10px] font-normal uppercase tracking-widest text-zinc-500">
            live xG
          </span>
        </h1>
        <div className="mt-6">
          <Board />
        </div>
      </div>
    </main>
  );
}