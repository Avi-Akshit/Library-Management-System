import bcrypt from "bcrypt";
import { Branch } from "./models/Branch";
import { LoanPolicy } from "./models/LoanPolicy";
import { User } from "./models/User";
import { defaultLoanPolicies } from "./modules/circulation/policyEngine";

/**
 * Operational bootstrap only — never inserts sample catalog titles or demo patrons.
 */
export async function bootstrapLibrary() {
  let branch = await Branch.findOne().sort({ createdAt: 1 });
  if (!branch) {
    branch = await Branch.create({
      name: process.env.LIBRARY_NAME ?? "Central Library",
      code: process.env.LIBRARY_CODE ?? "CENTRAL",
      address: process.env.LIBRARY_ADDRESS ?? "",
    });
  }

  const policyCount = await LoanPolicy.countDocuments();
  if (policyCount === 0) {
    await LoanPolicy.insertMany(defaultLoanPolicies);
  }

  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase();
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const existing = await User.findOne({ email: adminEmail });
    if (!existing) {
      await User.create({
        name: process.env.BOOTSTRAP_ADMIN_NAME ?? "Library Administrator",
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 10),
        roles: ["super_admin", "branch_admin", "librarian"],
        memberType: "faculty",
        branchId: branch._id,
      });
    }
  }

  return branch;
}
