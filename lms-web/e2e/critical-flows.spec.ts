import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill("password123");
  await page.getByTestId("login-submit").click();
  await page.waitForURL(/\/(catalog|member)/);
}

test("member can search and open a catalog item", async ({ page }) => {
  await login(page, "member@test.com");
  await page.goto("/search");
  await page.getByTestId("search-input").fill("Alpha");
  await page.getByTestId("search-input").press("Enter");
  await expect(page.getByText(/Test Book Alpha|Alpha/)).toBeVisible({ timeout: 15_000 });
});

test("member can place a hold from item detail", async ({ page, request }) => {
  const items = await request.get("http://localhost:4000/catalog/items");
  const list = await items.json();
  const itemId = list[0]._id as string;
  await login(page, "member@test.com");
  await page.goto(`/catalog/${itemId}`);
  await page.getByTestId("place-hold").click();
  await expect(page.getByText(/Hold placed|already/i)).toBeVisible({ timeout: 10_000 });
});

test("librarian can check out and return", async ({ page, request }) => {
  const loginRes = await request.post("http://localhost:4000/auth/login", {
    data: { email: "librarian@test.com", password: "password123" },
  });
  const { accessToken } = await loginRes.json();
  const users = await request.get("http://localhost:4000/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const librarian = await users.json();
  const items = await request.get("http://localhost:4000/catalog/items");
  const list = await items.json();
  const barcode = (list[1] ?? list[0]).copies[0].barcode as string;

  await login(page, "librarian@test.com");
  await page.goto("/librarian");
  await page.getByTestId("checkout-user-id").fill(librarian.id);
  await page.getByTestId("checkout-barcode").fill(barcode);
  await page.getByTestId("checkout-submit").click();
  await expect(page.getByText(/Issued on loan/i)).toBeVisible({ timeout: 10_000 });

  const loans = await request.get(`http://localhost:4000/circulation/loans/user/${librarian.id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const loanList = await loans.json();
  const loanId = loanList[0]._id as string;
  await page.getByTestId("return-loan-id").fill(loanId);
  await page.getByTestId("return-submit").click();
  await expect(page.getByText(/Returned/i)).toBeVisible({ timeout: 10_000 });
});
