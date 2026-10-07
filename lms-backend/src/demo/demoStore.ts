import { Router } from "express";
import { PolicyEngine } from "../modules/circulation/policyEngine";
import { ItemType, MemberType } from "../types";

type CopyStatus = "available" | "checked_out" | "reserved" | "in_transfer";

interface DemoCopy {
  id: string;
  barcode: string;
  branchId: string;
  branchName: string;
  status: CopyStatus;
}

interface DemoItem {
  id: string;
  itemType: ItemType;
  title: string;
  creators: string[];
  subjects: string[];
  description: string;
  copies: DemoCopy[];
  embedding: number[];
}

interface DemoUser {
  id: string;
  name: string;
  email: string;
  memberType: MemberType;
}

interface DemoLoan {
  id: string;
  userId: string;
  itemId: string;
  copyId: string;
  checkoutAt: string;
  dueAt: string;
  returnedAt?: string;
  status: "active" | "returned";
}

interface DemoHold {
  id: string;
  itemId: string;
  userId: string;
  pickupBranchId: string;
  position: number;
  status: "queued" | "ready" | "fulfilled" | "expired";
  readyAt?: string;
  expiresAt?: string;
}

interface DemoFineEntry {
  id: string;
  userId: string;
  loanId?: string;
  type: "fine" | "payment";
  amountCents: number;
  reason: string;
  createdAt: string;
}

const branches = [
  { id: "branch-central", name: "Central Library" },
  { id: "branch-east", name: "East Branch" },
];

const users: DemoUser[] = [
  { id: "user-student", name: "Aarav Student", email: "student@example.com", memberType: "student" },
  { id: "user-faculty", name: "Dr. Meera Faculty", email: "faculty@example.com", memberType: "faculty" },
];

const items: DemoItem[] = [
  {
    id: "item-ddia",
    itemType: "book",
    title: "Designing Data-Intensive Applications",
    creators: ["Martin Kleppmann"],
    subjects: ["distributed systems", "databases"],
    description: "Architecture patterns for reliable, scalable data systems.",
    copies: [
      { id: "copy-ddia-1", barcode: "CENTRAL-0001", branchId: "branch-central", branchName: "Central Library", status: "available" },
      { id: "copy-ddia-2", barcode: "EAST-0001", branchId: "branch-east", branchName: "East Branch", status: "available" },
    ],
    embedding: [0.9, 0.2, 0.3],
  },
  {
    id: "item-clean-code",
    itemType: "book",
    title: "Clean Code",
    creators: ["Robert C. Martin"],
    subjects: ["software engineering", "quality"],
    description: "Practical guidance for writing maintainable software.",
    copies: [{ id: "copy-clean-1", barcode: "CENTRAL-0002", branchId: "branch-central", branchName: "Central Library", status: "available" }],
    embedding: [0.5, 0.8, 0.2],
  },
  {
    id: "item-ai-journal",
    itemType: "journal",
    title: "Journal of Applied AI Systems",
    creators: ["Library Research Press"],
    subjects: ["artificial intelligence", "research"],
    description: "Peer-reviewed AI systems articles for applied computing programs.",
    copies: [{ id: "copy-ai-1", barcode: "EAST-0002", branchId: "branch-east", branchName: "East Branch", status: "available" }],
    embedding: [0.7, 0.4, 0.8],
  },
];

const loans: DemoLoan[] = [];
const holds: DemoHold[] = [];
const fineLedger: DemoFineEntry[] = [];
const policies = new PolicyEngine();

function nextId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function textScore(item: DemoItem, query: string) {
  const haystack = [item.title, ...item.creators, ...item.subjects, item.description].join(" ").toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
}

export function createDemoRouter() {
  const router = Router();

  router.get("/demo/state", (_req, res) => {
    res.json({ branches, users, items, loans, holds, fineLedger });
  });

  router.get("/catalog/items", (req, res) => {
    const query = String(req.query.q ?? "").trim();
    const result = query
      ? items
          .map((item) => ({ item, score: textScore(item, query) }))
          .filter((entry) => entry.score > 0)
          .sort((a, b) => b.score - a.score)
      : items.map((item) => ({ item, score: 1 }));
    res.json(result);
  });

  router.post("/catalog/items", (req, res) => {
    const branch = branches[0];
    const item: DemoItem = {
      id: nextId("item"),
      itemType: req.body.itemType ?? "book",
      title: req.body.title,
      creators: req.body.creators ?? [],
      subjects: req.body.subjects ?? [],
      description: req.body.description ?? "",
      copies: [{
        id: nextId("copy"),
        barcode: req.body.barcode ?? nextId("BARCODE"),
        branchId: branch.id,
        branchName: branch.name,
        status: "available",
      }],
      embedding: req.body.embedding ?? [0.1, 0.1, 0.1],
    };
    items.unshift(item);
    res.status(201).json(item);
  });

  router.post("/circulation/checkouts", (req, res) => {
    const user = users.find((candidate) => candidate.id === req.body.userId) ?? users[0];
    const item = items.find((candidate) => candidate.id === req.body.itemId);
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    const copy = item.copies.find((candidate) => candidate.status === "available");
    if (!copy) {
      res.status(409).json({ error: "No available copy. Place a hold instead." });
      return;
    }

    const checkoutAt = new Date();
    const dueAt = policies.dueDate(checkoutAt, item.itemType, user.memberType);
    copy.status = "checked_out";
    const loan: DemoLoan = {
      id: nextId("loan"),
      userId: user.id,
      itemId: item.id,
      copyId: copy.id,
      checkoutAt: checkoutAt.toISOString(),
      dueAt: dueAt.toISOString(),
      status: "active",
    };
    loans.unshift(loan);
    res.status(201).json(loan);
  });

  router.post("/circulation/returns/:loanId", (req, res) => {
    const loan = loans.find((candidate) => candidate.id === req.params.loanId && candidate.status === "active");
    if (!loan) {
      res.status(404).json({ error: "Active loan not found" });
      return;
    }

    const item = items.find((candidate) => candidate.id === loan.itemId);
    const user = users.find((candidate) => candidate.id === loan.userId);
    const copy = item?.copies.find((candidate) => candidate.id === loan.copyId);
    if (!item || !user || !copy) {
      res.status(404).json({ error: "Loan references missing item, user, or copy" });
      return;
    }

    const returnedAt = new Date();
    const fineCents = policies.fineForReturn(new Date(loan.dueAt), returnedAt, item.itemType, user.memberType);
    loan.status = "returned";
    loan.returnedAt = returnedAt.toISOString();

    const nextHold = holds.find((hold) => hold.itemId === item.id && hold.status === "queued");
    if (nextHold) {
      copy.status = "reserved";
      nextHold.status = "ready";
      nextHold.readyAt = returnedAt.toISOString();
      nextHold.expiresAt = new Date(returnedAt.getTime() + 48 * 60 * 60 * 1000).toISOString();
    } else {
      copy.status = "available";
    }

    if (fineCents > 0) {
      fineLedger.unshift({
        id: nextId("fine"),
        userId: user.id,
        loanId: loan.id,
        type: "fine",
        amountCents: fineCents,
        reason: "Overdue return",
        createdAt: returnedAt.toISOString(),
      });
    }

    res.json({ loan, fineCents, holdReady: nextHold ?? null });
  });

  router.post("/holds", (req, res) => {
    const item = items.find((candidate) => candidate.id === req.body.itemId);
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    const activeHolds = holds.filter((hold) => hold.itemId === item.id && ["queued", "ready"].includes(hold.status));
    const hold: DemoHold = {
      id: nextId("hold"),
      itemId: item.id,
      userId: req.body.userId ?? users[0].id,
      pickupBranchId: req.body.pickupBranchId ?? branches[0].id,
      position: activeHolds.length + 1,
      status: "queued",
    };
    holds.push(hold);
    res.status(201).json(hold);
  });

  router.get("/fines/users/:userId/balance", (req, res) => {
    const balanceCents = fineLedger
      .filter((entry) => entry.userId === req.params.userId)
      .reduce((sum, entry) => sum + entry.amountCents, 0);
    res.json({ userId: req.params.userId, balanceCents });
  });

  router.get("/recommendations/users/:userId", (req, res) => {
    const borrowedIds = new Set(loans.filter((loan) => loan.userId === req.params.userId).map((loan) => loan.itemId));
    const recommendations = items.filter((item) => !borrowedIds.has(item.id)).slice(0, 3).map((item) => ({ item, score: 0.75 }));
    res.json(recommendations);
  });

  return router;
}
