import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { auditAction } from "../../middleware/audit";
import { validateBody } from "../../middleware/validate";
import { requireRole } from "../../middleware/rbac";
import { Branch } from "../../models/Branch";
import { Book, Equipment, Item, Journal, Media } from "../../models/Item";
import { Work } from "../../models/Work";
import { SearchService } from "../search/searchService";

const createItemSchema = z.object({
  itemType: z.enum(["book", "journal", "media", "equipment"]).default("book"),
  workId: z.string().optional(),
  format: z.string().optional(),
  language: z.string().optional(),
  genres: z.array(z.string()).default([]),
  subcategory: z.string().optional(),
  donatedBy: z.string().trim().max(160).optional(),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  creators: z.array(z.string()).default([]),
  subjects: z.array(z.string()).default([]),
  description: z.string().optional(),
  isbn: z.string().optional(),
  publicationYear: z.number().optional(),
  copies: z
    .array(
      z.object({
        barcode: z.string(),
        branchId: z.string().optional(),
        shelfLocation: z.string().optional(),
      }),
    )
    .min(1),
  embedding: z.array(z.number()).optional(),
});

const importRowSchema = z.object({
  title: z.string().trim().min(1), creators: z.array(z.string()).default([]), isbn: z.string().optional(), itemType: z.enum(["book", "journal", "media", "equipment"]).default("book"), format: z.string().optional(), language: z.string().optional(), genres: z.array(z.string()).default([]), subcategory: z.string().optional(), copies: z.array(z.object({ barcode: z.string(), shelfLocation: z.string().optional() })).min(1),
});
const importSchema = z.object({ rows: z.array(importRowSchema).min(1).max(500) });

const updateItemSchema = z.object({
  title: z.string().min(1).optional(),
  subtitle: z.string().optional(),
  creators: z.array(z.string()).optional(),
  subjects: z.array(z.string()).optional(),
  description: z.string().optional(),
  isbn: z.string().optional(),
  publicationYear: z.number().optional(),
});

export function createCatalogRouter(search = new SearchService()) {
  const router = Router();

  router.get("/items", async (req, res, next) => {
    try {
      const query = String(req.query.q ?? "").trim();
      if (query) {
        const results = await search.hybridSearch({ query });
        res.json(results.map((r) => ("toObject" in r.item ? r.item.toObject() : r.item)));
        return;
      }
      const filter: Record<string, unknown> = {};
      if (req.query.itemType) filter.itemType = String(req.query.itemType);
      if (req.query.format) filter.format = { $in: String(req.query.format).split(",") };
      if (req.query.language) filter.language = { $in: String(req.query.language).split(",") };
      if (req.query.genre) filter.genres = { $all: String(req.query.genre).split(",") };
      if (req.query.subcategory) filter.subcategory = { $in: String(req.query.subcategory).split(",") };
      if (req.query.decade) {
        const decade = Number(req.query.decade);
        filter.publicationYear = { $gte: decade, $lt: decade + 10 };
      }
      res.json(await Item.find(filter).limit(50).sort({ createdAt: -1 }));
    } catch (error) {
      next(error);
    }
  });

  router.get("/search", async (req, res, next) => {
    try {
      const query = String(req.query.q ?? "").trim();
      if (!query) {
        res.status(400).json({ error: "Query parameter q is required" });
        return;
      }
      res.json(await search.hybridSearch({ query }));
    } catch (error) {
      next(error);
    }
  });

  router.get("/items/:id", async (req, res, next) => {
    try {
      const item = await Item.findById(req.params.id);
      if (!item) {
        res.status(404).json({ error: "Item not found" });
        return;
      }
      res.json(item);
    } catch (error) {
      next(error);
    }
  });

  router.get("/items/:id/editions", async (req, res, next) => {
    try {
      const item = await Item.findById(req.params.id);
      if (!item) return res.status(404).json({ error: "Item not found" });
      const editions = item.workId ? await Item.find({ workId: item.workId }).sort({ format: 1 }) : [item];
      res.json({ workId: item.workId, editions });
    } catch (error) { next(error); }
  });

  router.get("/reports/donors", requireAuth, requireRole("librarian", "branch_admin", "super_admin"), async (_req, res, next) => {
    try { res.json(await Item.aggregate([{ $match: { donatedBy: { $type: "string", $ne: "" } } }, { $group: { _id: "$donatedBy", itemCount: { $sum: 1 }, items: { $push: "$title" } } }, { $sort: { itemCount: -1, _id: 1 } }])); } catch (error) { next(error); }
  });

  router.post(
    "/items",
    requireAuth,
    requireRole("librarian", "branch_admin", "super_admin"),
    validateBody(createItemSchema),
    auditAction("catalog.item.create", "Item"),
    async (req, res, next) => {
      try {
        const branch = await Branch.findOne().sort({ createdAt: 1 });
        const copies = (req.body.copies as Array<{ barcode: string; branchId?: string; shelfLocation?: string }>).map(
          (copy) => ({
            ...copy,
            branchId: copy.branchId ?? (branch ? String(branch._id) : undefined),
          }),
        );
        const Model =
          req.body.itemType === "journal"
            ? Journal
            : req.body.itemType === "media"
              ? Media
              : req.body.itemType === "equipment"
                ? Equipment
                : Book;
        const work = req.body.workId ? await Work.findById(req.body.workId) : await Work.create({ title: req.body.title, creators: req.body.creators, subjects: req.body.subjects });
        const item = await Model.create({ ...req.body, workId: work?._id, copies });
        res.status(201).json(item);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post("/import/preview", requireAuth, requireRole("librarian", "branch_admin", "super_admin"), validateBody(importSchema), async (req, res, next) => {
    try {
      const review = await Promise.all(req.body.rows.map(async (row: z.infer<typeof importRowSchema>, index: number) => {
        const duplicate = await Item.findOne({ $or: [{ isbn: row.isbn || "__none__" }, { title: new RegExp(`^${row.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }] }).select("_id title");
        return { index, row, status: duplicate ? "possible_duplicate" : "new", duplicate: duplicate ? { id: String(duplicate._id), title: duplicate.title } : undefined };
      }));
      res.json({ review });
    } catch (error) { next(error); }
  });

  router.post("/import/commit", requireAuth, requireRole("librarian", "branch_admin", "super_admin"), validateBody(importSchema), async (req, res, next) => {
    try {
      const branch = await Branch.findOne().sort({ createdAt: 1 });
      if (!branch) return res.status(500).json({ error: "No branch configured" });
      const created = [];
      for (const row of req.body.rows as z.infer<typeof importRowSchema>[]) {
        const work = await Work.create({ title: row.title, creators: row.creators, subjects: row.genres });
        const item = await Book.create({ ...row, workId: work._id, copies: row.copies.map((copy) => ({ ...copy, branchId: branch._id })) });
        created.push(item);
      }
      res.status(201).json({ created });
    } catch (error) { next(error); }
  });

  router.patch(
    "/items/:id",
    requireAuth,
    requireRole("librarian", "branch_admin", "super_admin"),
    validateBody(updateItemSchema),
    auditAction("catalog.item.update", "Item"),
    async (req, res, next) => {
      try {
        const item = await Item.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after" });
        if (!item) {
          res.status(404).json({ error: "Item not found" });
          return;
        }
        res.json(item);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/items/:id/copies",
    requireAuth,
    requireRole("librarian", "branch_admin", "super_admin"),
    auditAction("catalog.copy.create", "Item"),
    async (req, res, next) => {
      try {
        const item = await Item.findById(req.params.id);
        if (!item) {
          res.status(404).json({ error: "Item not found" });
          return;
        }
        item.copies.push(req.body);
        await item.save();
        res.status(201).json(item);
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    "/items/:id",
    requireAuth,
    requireRole("branch_admin", "super_admin"),
    auditAction("catalog.item.delete", "Item"),
    async (req, res, next) => {
      try {
        const item = await Item.findByIdAndDelete(req.params.id);
        if (!item) {
          res.status(404).json({ error: "Item not found" });
          return;
        }
        res.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
