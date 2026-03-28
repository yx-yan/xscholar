import { getPapers } from "@/lib/db";
import App from "@/components/App";

export const dynamic = "force-dynamic";

export default async function Home() {
  let papers: import("@/lib/db").Paper[] = [];
  try { papers = await getPapers({ limit: 200 }); } catch (e) { console.error(e); }
  return <App initialPapers={papers} />;
}
