import { vndbClient } from '@/lib/vndb'

async function main() {
  try {
    const { results, more } = await vndbClient.listVisualNovels({
      filters: [["search", "=", "tsukihime"]],
      fields: "id,title",
      page: 1,
      results: 3,
    })
    console.log("SEARCH tsukihime => count", results.length, "first", JSON.stringify(results[0] ?? null), "more", more)
  } catch (e) {
    console.log("SEARCH ERROR", e instanceof Error ? e.message : String(e))
  }
}
main().then(() => process.exit(0))
