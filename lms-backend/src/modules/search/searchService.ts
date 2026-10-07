import { Item } from "../../models/Item";

function cosineSimilarity(a: number[], b: number[]) {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let aMag = 0;
  let bMag = 0;
  for (let index = 0; index < length; index += 1) {
    dot += a[index] * b[index];
    aMag += a[index] * a[index];
    bMag += b[index] * b[index];
  }
  return aMag && bMag ? dot / (Math.sqrt(aMag) * Math.sqrt(bMag)) : 0;
}

export class SearchService {
  async hybridSearch(input: { query: string; embedding?: number[]; limit?: number }) {
    const limit = input.limit ?? 10;
    const query = input.query.trim();
    if (!query) return [];

    let matches = [] as Awaited<ReturnType<typeof Item.find>>;
    try {
      matches = await Item.find({ $text: { $search: query } }, { score: { $meta: "textScore" } })
        .sort({ score: { $meta: "textScore" } })
        .limit(limit * 2);
    } catch {
      matches = [];
    }

    if (!matches.length) {
      const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      matches = await Item.find({
        $or: [{ title: regex }, { creators: regex }, { subjects: regex }, { description: regex }],
      }).limit(limit * 2);
    }

    return matches
      .map((item) => {
        const vectorScore =
          input.embedding && item.embedding?.length ? cosineSimilarity(input.embedding, item.embedding) : 0;
        const metaScore = Number((item as unknown as { score?: number }).score);
        const textScore = Number.isFinite(metaScore)
          ? metaScore
          : item.title.toLowerCase().includes(query.toLowerCase())
            ? 5
            : 1;
        return { item, score: textScore * 0.7 + vectorScore * 0.3 };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async recommendationsFromBorrowedItems(itemIds: string[], limit = 10) {
    const borrowed = await Item.find({ _id: { $in: itemIds }, embedding: { $exists: true, $ne: [] } });
    if (!borrowed[0]?.embedding?.length) return [];

    const width = borrowed[0].embedding.length;
    const centroid = Array.from({ length: width }, (_, index) => {
      const values = borrowed.map((item) => item.embedding[index] ?? 0);
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    });

    const candidates = await Item.find({ _id: { $nin: itemIds }, embedding: { $exists: true, $ne: [] } }).limit(200);
    return candidates
      .map((item) => ({ item, score: cosineSimilarity(centroid, item.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
