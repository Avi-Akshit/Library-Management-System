import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { SearchService } from "../search/searchService";

const questionSchema = z.object({ question: z.string().trim().min(3).max(500) });
export function createAssistantRouter(search = new SearchService()) {
  const router = Router();
  router.post("/ask", requireAuth, validateBody(questionSchema), async (req, res, next) => {
    try {
      const queryTerms = req.body.question.toLowerCase().match(/[a-z0-9]{3,}/g)?.filter((term: string) => !["about", "book", "have", "that", "with", "from", "this", "tell", "what", "does", "there", "collection", "called"].includes(term)) ?? [];
      const matches = (await search.hybridSearch({ query: req.body.question, limit: 8 })).filter(({ item }) => {
        const recordText = [item.title, ...item.creators, ...item.subjects, item.description ?? ""].join(" ").toLowerCase();
        return queryTerms.some((term: string) => recordText.includes(term));
      }).slice(0, 3);
      if (!matches.length) return res.json({ answer: "I could not find that in our collection. Try a broader title, author, or subject.", references: [] });
      const references = matches.map(({ item }) => ({ id: String(item._id), title: item.title, creators: item.creators, availableCopies: item.copies.filter((copy) => copy.status === "available").length, description: item.description }));
      const primary = references[0];
      const availability = primary.availableCopies ? `${primary.availableCopies} copy${primary.availableCopies === 1 ? " is" : "ies are"} on shelf` : "no copies are currently on shelf";
      res.json({ answer: `${primary.title}${primary.creators.length ? ` by ${primary.creators.join(", ")}` : ""} is the closest match in the catalog. It currently has ${availability}.`, references });
    } catch (error) { next(error); }
  });
  return router;
}
