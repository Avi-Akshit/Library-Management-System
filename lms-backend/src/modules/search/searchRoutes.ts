import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireSelfOrStaff } from "../../middleware/rbac";
import { Loan } from "../../models/Loan";
import { Item } from "../../models/Item";
import { SearchService } from "./searchService";

export function createSearchRouter(search = new SearchService()) {
  const router = Router();

  router.get("/faceted", async (req, res, next) => {
    try {
      const values = (key: string) => String(req.query[key] ?? "").split(",").map((value) => value.trim()).filter(Boolean);
      const genres = values("genre"); const subcategories = values("subcategory"); const formats = values("format"); const languages = values("language"); const decades = values("decade");
      const base: Record<string, unknown> = {};
      if (genres.length) base.genres = { $all: genres };
      if (subcategories.length) base.subcategory = { $in: subcategories };
      if (formats.length) base.format = { $in: formats };
      if (languages.length) base.language = { $in: languages };
      if (decades.length) base.$or = decades.map((decade) => ({ publicationYear: { $gte: Number(decade), $lt: Number(decade) + 10 } }));
      const query = String(req.query.q ?? "").trim();
      if (query) {
        const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        base.$and = [{ $or: [{ title: regex }, { creators: regex }, { subjects: regex }, { description: regex }] }];
      }
      const items = await Item.find(base).limit(50).sort({ createdAt: -1 });
      const count = async (field: string, selected: string[]) => {
        const match = { ...base } as Record<string, unknown>;
        delete match[field === "genres" ? "genres" : field];
        const rows = await Item.aggregate([{ $match: match }, { $unwind: `$${field}` }, { $group: { _id: `$${field}`, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]);
        return rows.map((row) => ({ value: row._id, count: row.count, selected: selected.includes(row._id) }));
      };
      const decadeRows = await Item.aggregate([{ $match: { ...base, publicationYear: { $exists: true } } }, { $project: { decade: { $subtract: ["$publicationYear", { $mod: ["$publicationYear", 10] }] } } }, { $group: { _id: "$decade", count: { $sum: 1 } }, }, { $sort: { _id: 1 } }]);
      res.json({ items, facets: { genres: await count("genres", genres), subcategories: await count("subcategory", subcategories), formats: await count("format", formats), languages: await count("language", languages), decades: decadeRows.map((row) => ({ value: String(row._id), count: row.count, selected: decades.includes(String(row._id)) })) } });
    } catch (error) { next(error); }
  });

  // GET /search?q=...&limit=10
  router.get("/", async (req, res, next) => {
    try {
      const query = String(req.query.q ?? "");
      const limit = Math.min(Number(req.query.limit ?? 10), 50);
      const results = await search.hybridSearch({ query, limit });
      res.json(results.map((r) => ({ ...r.item.toObject(), _score: r.score })));
    } catch (error) {
      next(error);
    }
  });

  // GET /search/recommendations/:userId — pull from borrow history
  router.get(
    "/recommendations/:userId",
    requireAuth,
    requireSelfOrStaff("userId"),
    async (req, res, next) => {
      try {
        const userId = String(req.params.userId);
        const limit = Math.min(Number(req.query.limit ?? 10), 50);

        // Collect item IDs from the user's loan history (last 50)
        const loans = await Loan.find({ userId })
          .sort({ createdAt: -1 })
          .limit(50)
          .select("itemId");

        const itemIds = loans.map((l) => String(l.itemId));
        const results = await search.recommendationsFromBorrowedItems(itemIds, limit);
        res.json(results.map((r) => ({ ...r.item.toObject(), _score: r.score })));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
