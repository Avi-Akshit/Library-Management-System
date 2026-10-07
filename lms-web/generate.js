const fs = require('fs');
const path = require('path');

const files = {
  "src/app/(auth)/layout.tsx": `
import React from 'react';
import { Library } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 flex items-center space-x-2">
        <Library className="h-8 w-8 text-accent" />
        <h1 className="text-2xl font-bold tracking-tight text-primary">Library Management System</h1>
      </div>
      {children}
    </div>
  );
}`,
  "src/app/(auth)/login/page.tsx": `
"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      router.push("/member");
    } catch (err: any) {
      setError(err.message || "Failed to login");
    }
  };

  return (
    <Card className="w-full max-w-[400px]">
      <CardHeader>
        <CardTitle className="text-center text-xl">Sign in</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full">Sign in</Button>
          <p className="text-center text-sm text-muted">
            Don't have an account? <Link href="/register" className="text-accent hover:underline">Register</Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}`,
  "src/app/(auth)/register/page.tsx": `
"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { register as apiRegister } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRegister(name, email, password);
      await login(email, password);
      router.push("/member");
    } catch (err: any) {
      setError(err.message || "Failed to register");
    }
  };

  return (
    <Card className="w-full max-w-[400px]">
      <CardHeader>
        <CardTitle className="text-center text-xl">Register</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full">Register</Button>
          <p className="text-center text-sm text-muted">
            Already have an account? <Link href="/login" className="text-accent hover:underline">Sign in</Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}`,
  "src/app/(app)/layout.tsx": `
"use client";
import React from "react";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Library, Search, BookOpen, Clock, Users, LogOut, CheckCircle, RotateCcw, AlertTriangle, FileText } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading } = useAuth();
  const pathname = usePathname();

  if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  const links = [
    { href: "/catalog", label: "Catalog", icon: Library },
    { href: "/search", label: "Search", icon: Search },
    { href: "/member", label: "Dashboard", icon: BookOpen },
  ];

  if (user?.roles.some(r => ["librarian", "branch_admin", "super_admin"].includes(r))) {
    links.push(
      { href: "/librarian", label: "Circulation", icon: RotateCcw }
    );
  }

  if (user?.roles.includes("super_admin")) {
    links.push(
      { href: "/admin", label: "Admin", icon: Users }
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <aside className="flex w-[240px] flex-col border-r border-border bg-surface">
        <div className="p-4 flex items-center space-x-2 border-b border-border">
          <Library className="h-6 w-6 text-accent" />
          <span className="font-semibold text-primary">LMS</span>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-blue-50 text-accent dark:bg-blue-900/20" : "text-muted hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-800"
                )}
              >
                <Icon className={cn("h-4 w-4", active ? "text-accent" : "text-muted")} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <div className="mb-4">
            <p className="text-sm font-medium text-primary truncate">{user?.name}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {user?.roles.map(r => <Badge key={r}>{r}</Badge>)}
            </div>
          </div>
          <button onClick={logout} className="flex w-full items-center space-x-2 text-sm text-muted hover:text-primary">
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}`,
  "src/app/(app)/catalog/page.tsx": `
"use client";
import useSWR from "swr";
import { getCatalog } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export default function CatalogPage() {
  const [filter, setFilter] = useState("");
  const { data: items, error, isLoading } = useSWR(["catalog", filter], () => getCatalog(filter ? { itemType: filter } : {}));

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Catalog</h1>
        <div className="flex gap-2">
          {["", "Book", "Journal", "Media", "Equipment"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={\`px-3 py-1 text-sm rounded-full border \${filter === f ? 'bg-accent text-white border-accent' : 'border-border text-muted hover:bg-gray-50 dark:hover:bg-gray-800'}\`}
            >
              {f || "All"}
            </button>
          ))}
        </div>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-[200px] w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items?.map(item => (
            <Link key={item.id} href={\`/catalog/\${item.id}\`}>
              <Card className="h-full hover:border-accent transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-lg line-clamp-2">{item.title}</CardTitle>
                    <Badge variant={item.availability === "available" ? "available" : "default"}>{item.availability || "Unknown"}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted mb-2">{item.creators}</p>
                  <Badge>{item.itemType}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}`,
  "src/app/(app)/catalog/[id]/page.tsx": `
"use client";
import useSWR from "swr";
import { getItem, checkout, placeHold } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { useParams } from "next/navigation";

export default function ItemDetail() {
  const { id } = useParams() as { id: string };
  const { user } = useAuth();
  const { data: item, mutate } = useSWR(\`/catalog/\${id}\`, () => getItem(id));
  const [checkoutUserId, setCheckoutUserId] = useState("");
  const isLibrarian = user?.roles.some(r => ["librarian", "branch_admin", "super_admin"].includes(r));

  if (!item) return <div>Loading...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">{item.title}</h1>
        <p className="text-lg text-muted mb-4">{item.creators}</p>
        <div className="flex gap-2 mb-4">
          <Badge>{item.itemType}</Badge>
          <Badge variant={item.availability === "available" ? "available" : "default"}>{item.availability}</Badge>
        </div>
        <p className="text-primary leading-relaxed">{item.description}</p>
      </div>

      {isLibrarian ? (
        <Card>
          <CardHeader><CardTitle>Librarian Actions</CardTitle></CardHeader>
          <CardContent className="flex gap-2">
            <Input placeholder="User ID for checkout" value={checkoutUserId} onChange={e => setCheckoutUserId(e.target.value)} />
            <Button onClick={async () => {
              if (checkoutUserId) {
                await checkout(checkoutUserId, id);
                mutate();
                alert("Checked out!");
              }
            }}>Checkout</Button>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={async () => {
          await placeHold(id);
          alert("Hold placed!");
        }}>Place Hold</Button>
      )}

      <Card>
        <CardHeader><CardTitle>Copies</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Barcode</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {item.copies?.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono">{c.barcode}</TableCell>
                  <TableCell>{c.branch}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === "available" ? "available" : c.status === "checked_out" ? "checked_out" : "default"}>
                      {c.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}`,
  "src/app/(app)/search/page.tsx": `
"use client";
import { useState } from "react";
import useSWR from "swr";
import { search } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { SearchIcon } from "lucide-react";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const { data: results, isLoading } = useSWR(q ? \`/search?q=\${q}\` : null, () => search(q));

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-3 h-5 w-5 text-muted" />
        <Input 
          className="pl-10 h-12 text-lg" 
          placeholder="Search catalog..." 
          value={q} 
          onChange={e => setQ(e.target.value)} 
        />
      </div>

      <div className="space-y-4">
        {isLoading && <div>Searching...</div>}
        {results?.map(item => (
          <Link key={item.id} href={\`/catalog/\${item.id}\`}>
            <Card className="hover:border-accent transition-colors">
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">{item.title}</h3>
                  <p className="text-sm text-muted">{item.creators}</p>
                </div>
                <Badge variant={item.availability === "available" ? "available" : "default"}>{item.availability}</Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
        {q && results?.length === 0 && <div className="text-center text-muted py-8">No results found for "{q}"</div>}
      </div>
    </div>
  );
}`,
  "src/app/(app)/member/page.tsx": `
"use client";
import useSWR from "swr";
import { getUserLoans, getUserHolds, getFineBalance, renewLoan } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function MemberDashboard() {
  const { user } = useAuth();
  const userId = user?.id || "";
  const { data: loans, mutate: mutateLoans } = useSWR(userId ? \`/users/\${userId}/loans\` : null, () => getUserLoans(userId));
  const { data: holds } = useSWR(userId ? \`/users/\${userId}/holds\` : null, () => getUserHolds(userId));
  const { data: fines } = useSWR(userId ? \`/users/\${userId}/fines\` : null, () => getFineBalance(userId));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">My Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Active Loans</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans?.map(loan => (
                  <TableRow key={loan.id}>
                    <TableCell>{loan.itemTitle || loan.itemId}</TableCell>
                    <TableCell>{new Date(loan.dueDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={loan.status === "overdue" ? "overdue" : "checked_out"}>{loan.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="secondary" onClick={async () => {
                        await renewLoan(loan.id);
                        mutateLoans();
                      }}>Renew</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!loans?.length && <TableRow><TableCell colSpan={4} className="text-center text-muted">No active loans</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Fine Balance</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                $\{(fines?.total || 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>My Holds</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Pos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holds?.map(hold => (
                    <TableRow key={hold.id}>
                      <TableCell className="truncate max-w-[150px]">{hold.itemTitle || hold.itemId}</TableCell>
                      <TableCell>#{hold.position}</TableCell>
                    </TableRow>
                  ))}
                  {!holds?.length && <TableRow><TableCell colSpan={2} className="text-center text-muted">No holds</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}`,
  "src/app/(app)/librarian/page.tsx": `
"use client";
import { useState } from "react";
import { checkout, returnLoan } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LibrarianDashboard() {
  const { user } = useAuth();
  const [checkoutUserId, setCheckoutUserId] = useState("");
  const [checkoutItemId, setCheckoutItemId] = useState("");
  const [returnLoanId, setReturnLoanId] = useState("");

  if (!user?.roles.some(r => ["librarian", "branch_admin", "super_admin"].includes(r))) {
    return <Card><CardContent className="p-6">403 - Forbidden</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Circulation Desk</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Quick Checkout</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="User ID" value={checkoutUserId} onChange={e => setCheckoutUserId(e.target.value)} />
            <Input placeholder="Item ID" value={checkoutItemId} onChange={e => setCheckoutItemId(e.target.value)} />
            <Button onClick={async () => {
              if (checkoutUserId && checkoutItemId) {
                await checkout(checkoutUserId, checkoutItemId);
                alert("Checked out!");
                setCheckoutItemId("");
              }
            }}>Checkout</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Quick Return</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Loan ID" value={returnLoanId} onChange={e => setReturnLoanId(e.target.value)} />
            <Button onClick={async () => {
              if (returnLoanId) {
                await returnLoan(returnLoanId);
                alert("Returned!");
                setReturnLoanId("");
              }
            }}>Return</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}`,
  "src/app/(app)/admin/page.tsx": `
"use client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDashboard() {
  const { user } = useAuth();

  if (!user?.roles.includes("super_admin")) {
    return <Card><CardContent className="p-6">403 - Forbidden</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
      <Card>
        <CardHeader><CardTitle>Users (Placeholder)</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted">User management table goes here.</p>
        </CardContent>
      </Card>
    </div>
  );
}`
};

Object.entries(files).forEach(([filepath, content]) => {
  const fullPath = path.join(process.cwd(), filepath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n');
});
