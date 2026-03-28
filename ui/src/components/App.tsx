"use client";
import { useState } from "react";
import type { Paper } from "@/lib/db";
import StarField from "./StarField";
import Sidebar from "./Sidebar";

export default function App({ initialPapers }: { initialPapers: Paper[] }) {
  const [papers, setPapers] = useState<Paper[]>(initialPapers);
  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <StarField papers={papers} />
      <Sidebar allPapers={initialPapers} onFilter={setPapers} />
    </div>
  );
}
