import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { Branch } from "../../src/models/Branch";
import { Book } from "../../src/models/Item";
import { LoanPolicy } from "../../src/models/LoanPolicy";
import { User } from "../../src/models/User";
import { RefreshToken } from "../../src/models/RefreshToken";
import { PasswordResetToken } from "../../src/models/PasswordResetToken";
import { defaultLoanPolicies } from "../../src/modules/circulation/policyEngine";

let replSet: MongoMemoryReplSet;

export async function setupTestDb() {
  process.env.NODE_ENV = "test";
  // Use a replica set so MongoDB transactions work in tests
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
  await mongoose.connection.syncIndexes();
}

export async function teardownTestDb() {
  await mongoose.disconnect();
  if (replSet) await replSet.stop();
}

export async function seedTestData() {
  await Promise.all([
    Branch.deleteMany({}),
    Book.deleteMany({}),
    User.deleteMany({}),
    RefreshToken.deleteMany({}),
    PasswordResetToken.deleteMany({}),
    LoanPolicy.deleteMany({}),
  ]);

  const branch = await Branch.create({
    name: "Test Library",
    code: "TEST",
    address: "1 Test St",
  });

  await LoanPolicy.insertMany(defaultLoanPolicies);

  const passwordHash = await bcrypt.hash("password123", 10);
  const [member, librarian, admin] = await User.create([
    {
      name: "Test Member",
      email: "member@test.com",
      passwordHash,
      roles: ["member"],
      memberType: "student",
      branchId: branch._id,
    },
    {
      name: "Test Librarian",
      email: "librarian@test.com",
      passwordHash,
      roles: ["librarian"],
      memberType: "faculty",
      branchId: branch._id,
    },
    {
      name: "Test Administrator",
      email: "admin@test.com",
      username: "admin",
      passwordHash,
      roles: ["super_admin", "branch_admin", "librarian"],
      memberType: "faculty",
      branchId: branch._id,
    },
  ]);

  const book = await Book.create({
    itemType: "book",
    title: "Test Book Alpha",
    creators: ["Author One"],
    subjects: ["testing"],
    description: "A book for integration tests",
    copies: [
      { barcode: "TEST-0001", branchId: branch._id, status: "available" },
      { barcode: "TEST-0002", branchId: branch._id, status: "available" },
    ],
    embedding: [0.9, 0.1, 0.2, 0.3],
  });

  const book2 = await Book.create({
    itemType: "book",
    title: "Another Book Beta",
    creators: ["Author Two"],
    subjects: ["fiction"],
    copies: [{ barcode: "TEST-0003", branchId: branch._id, status: "available" }],
    embedding: [0.1, 0.9, 0.2, 0.3],
  });

  return { branch, member, librarian, admin, book, book2 };
}
