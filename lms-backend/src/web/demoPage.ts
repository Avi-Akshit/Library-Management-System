export function demoPage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>LMS Operations Console</title>
  <style>
    :root {
      --bg: #FAFAFA;
      --surface: #FFFFFF;
      --border: #E4E4E7;
      --text: #18181B;
      --muted: #71717A;
      --accent: #2563EB;
      --ok-bg: #ECFDF5;
      --ok-text: #047857;
      --warn-bg: #FFFBEB;
      --warn-text: #B45309;
      --bad-bg: #FEF2F2;
      --bad-text: #B91C1C;
      --neutral-bg: #F4F4F5;
      --neutral-text: #52525B;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 14px;
    }
    header {
      border-bottom: 1px solid var(--border);
      background: var(--surface);
      padding: 14px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    h1 { font-size: 18px; margin: 0; font-weight: 600; }
    h2 { font-size: 15px; margin: 0 0 12px; font-weight: 600; }
    main { max-width: 1180px; margin: 0 auto; padding: 20px; display: grid; gap: 16px; }
    .toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .panel {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 14px;
    }
    .grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; align-items: start; }
    input, select {
      height: 34px;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 0 10px;
      background: var(--surface);
      color: var(--text);
    }
    button, a.button {
      height: 34px;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0 10px;
      background: var(--surface);
      color: var(--text);
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
    }
    button.primary { background: var(--accent); color: white; border-color: var(--accent); }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid var(--border); vertical-align: top; }
    th { font-size: 12px; color: var(--muted); font-weight: 600; }
    .muted { color: var(--muted); }
    .badge { display: inline-flex; border-radius: 6px; padding: 2px 8px; font-size: 12px; font-weight: 500; }
    .available { background: var(--ok-bg); color: var(--ok-text); }
    .checked_out { background: var(--neutral-bg); color: var(--neutral-text); }
    .reserved, .in_transfer { background: var(--warn-bg); color: var(--warn-text); }
    .error { color: var(--bad-text); background: var(--bad-bg); border: 1px solid #FECACA; border-radius: 6px; padding: 8px; display: none; }
    .stack { display: grid; gap: 10px; }
    @media (max-width: 800px) { .grid { grid-template-columns: 1fr; } header { align-items: flex-start; flex-direction: column; } }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>LMS Operations Console</h1>
      <div class="muted">Catalog, circulation, holds, fines, and API docs connected to the running server.</div>
    </div>
    <div class="toolbar">
      <a class="button" href="/docs">Docs</a>
      <a class="button" href="/openapi.json">OpenAPI</a>
      <button onclick="refresh()">Refresh</button>
    </div>
  </header>
  <main>
    <div id="error" class="error"></div>
    <section class="panel">
      <div class="toolbar">
        <input id="query" placeholder="Search title, author, subject" oninput="search()" />
        <select id="user"></select>
        <select id="branch"></select>
      </div>
    </section>
    <div class="grid">
      <section class="panel">
        <h2>Catalog</h2>
        <table>
          <thead><tr><th>Item</th><th>Copies</th><th>Actions</th></tr></thead>
          <tbody id="catalog"></tbody>
        </table>
      </section>
      <div class="stack">
        <section class="panel">
          <h2>Active Loans</h2>
          <div id="loans" class="stack"></div>
        </section>
        <section class="panel">
          <h2>Holds</h2>
          <div id="holds" class="stack"></div>
        </section>
        <section class="panel">
          <h2>Fine Balance</h2>
          <div id="balance" class="muted">No balance loaded.</div>
        </section>
      </div>
    </div>
  </main>
  <script>
    let state = { users: [], branches: [], items: [], loans: [], holds: [], fineLedger: [] };

    async function api(path, options = {}) {
      const response = await fetch(path, {
        ...options,
        headers: { "content-type": "application/json", "x-user-id": selectedUser(), "x-user-roles": "librarian", ...(options.headers || {}) },
      });
      if (!response.ok) throw new Error((await response.json()).error || response.statusText);
      return response.json();
    }

    function selectedUser() {
      return document.getElementById("user").value || "user-student";
    }

    function selectedBranch() {
      return document.getElementById("branch").value || "branch-central";
    }

    function showError(error) {
      const node = document.getElementById("error");
      node.textContent = error.message || String(error);
      node.style.display = "block";
      setTimeout(() => { node.style.display = "none"; }, 3500);
    }

    async function refresh() {
      state = await api("/demo/state");
      renderControls();
      await search();
      renderSidebars();
    }

    function renderControls() {
      document.getElementById("user").innerHTML = state.users.map(user => '<option value="' + user.id + '">' + user.name + '</option>').join("");
      document.getElementById("branch").innerHTML = state.branches.map(branch => '<option value="' + branch.id + '">' + branch.name + '</option>').join("");
    }

    async function search() {
      const query = encodeURIComponent(document.getElementById("query").value);
      const results = await api("/catalog/items" + (query ? "?q=" + query : ""));
      const rows = results.map(({ item }) => {
        const copies = item.copies.map(copy => '<span class="badge ' + copy.status + '">' + copy.status.replace("_", " ") + '</span><div class="muted">' + copy.barcode + " · " + copy.branchName + '</div>').join("");
        return '<tr><td><strong>' + item.title + '</strong><div class="muted">' + item.creators.join(", ") + '</div><div>' + item.description + '</div></td><td>' + copies + '</td><td><div class="toolbar"><button class="primary" onclick="checkout(\\'' + item.id + '\\')">Checkout</button><button onclick="hold(\\'' + item.id + '\\')">Hold</button></div></td></tr>';
      }).join("");
      document.getElementById("catalog").innerHTML = rows || '<tr><td colspan="3" class="muted">No results.</td></tr>';
    }

    function renderSidebars() {
      const activeLoans = state.loans.filter(loan => loan.status === "active");
      document.getElementById("loans").innerHTML = activeLoans.map(loan => {
        const item = state.items.find(candidate => candidate.id === loan.itemId);
        return '<div><strong>' + (item?.title || loan.itemId) + '</strong><div class="muted">Due ' + new Date(loan.dueAt).toLocaleDateString() + '</div><button onclick="returnLoan(\\'' + loan.id + '\\')">Return</button></div>';
      }).join("") || '<div class="muted">No active loans.</div>';

      document.getElementById("holds").innerHTML = state.holds.map(hold => {
        const item = state.items.find(candidate => candidate.id === hold.itemId);
        return '<div><strong>' + (item?.title || hold.itemId) + '</strong><div><span class="badge reserved">' + hold.status + '</span></div><div class="muted">Position ' + hold.position + '</div></div>';
      }).join("") || '<div class="muted">No holds.</div>';

      const balance = state.fineLedger.filter(entry => entry.userId === selectedUser()).reduce((sum, entry) => sum + entry.amountCents, 0);
      document.getElementById("balance").textContent = "$" + (balance / 100).toFixed(2);
    }

    async function checkout(itemId) {
      try {
        await api("/circulation/checkouts", { method: "POST", body: JSON.stringify({ userId: selectedUser(), itemId }) });
        await refresh();
      } catch (error) { showError(error); }
    }

    async function hold(itemId) {
      try {
        await api("/holds", { method: "POST", body: JSON.stringify({ userId: selectedUser(), itemId, pickupBranchId: selectedBranch() }) });
        await refresh();
      } catch (error) { showError(error); }
    }

    async function returnLoan(loanId) {
      try {
        await api("/circulation/returns/" + loanId, { method: "POST", body: "{}" });
        await refresh();
      } catch (error) { showError(error); }
    }

    refresh().catch(showError);
  </script>
</body>
</html>`;
}
