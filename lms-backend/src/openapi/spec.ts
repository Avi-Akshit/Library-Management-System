const bearerAuth = {
  bearerAuth: [],
};

const errorSchema = {
  type: "object",
  properties: {
    error: { type: "string" },
  },
};

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Library Management System API",
    version: "1.0.0",
    description:
      "Production-grade LMS API — circulation, holds, fines, catalog, search, and notifications.",
  },
  servers: [{ url: "http://localhost:4000", description: "Local dev" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Error: errorSchema,
      TokenPair: {
        type: "object",
        properties: {
          accessToken: { type: "string" },
          refreshToken: { type: "string" },
          expiresIn: { type: "number", description: "Access token TTL in seconds" },
        },
      },
    },
  },
  paths: {
    // ─── Health ──────────────────────────────────────────────────────────────
    "/health": {
      get: {
        summary: "Service health check",
        tags: ["System"],
        responses: {
          "200": {
            description: "Service is healthy",
            content: {
              "application/json": {
                schema: { type: "object", properties: { status: { type: "string" } } },
              },
            },
          },
        },
      },
    },

    // ─── Auth ─────────────────────────────────────────────────────────────────
    "/auth/register": {
      post: {
        summary: "Register a new member account",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                  memberType: { type: "string", enum: ["student", "faculty", "guest"] },
                  branchId: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Created — returns user + token pair", content: { "application/json": { schema: { $ref: "#/components/schemas/TokenPair" } } } },
          "409": { description: "Email already registered" },
        },
      },
    },
    "/auth/login": {
      post: {
        summary: "Login and receive access + refresh tokens",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: { email: { type: "string" }, password: { type: "string" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Success", content: { "application/json": { schema: { $ref: "#/components/schemas/TokenPair" } } } },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/auth/refresh": {
      post: {
        summary: "Rotate refresh token — returns a new token pair",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["refreshToken"], properties: { refreshToken: { type: "string" } } },
            },
          },
        },
        responses: {
          "200": { description: "New token pair", content: { "application/json": { schema: { $ref: "#/components/schemas/TokenPair" } } } },
          "401": { description: "Invalid or expired refresh token" },
        },
      },
    },
    "/auth/logout": {
      post: {
        summary: "Revoke refresh token",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["refreshToken"], properties: { refreshToken: { type: "string" } } },
            },
          },
        },
        responses: {
          "204": { description: "Logged out" },
        },
      },
    },
    "/auth/me": {
      get: {
        summary: "Get authenticated user profile",
        tags: ["Auth"],
        security: [bearerAuth],
        responses: {
          "200": { description: "User profile" },
          "401": { description: "Unauthenticated" },
        },
      },
    },

    // ─── Catalog ──────────────────────────────────────────────────────────────
    "/catalog/items": {
      get: {
        summary: "List / search catalog items",
        tags: ["Catalog"],
        parameters: [
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "itemType", in: "query", schema: { type: "string", enum: ["book", "journal", "media", "equipment"] } },
          { name: "availability", in: "query", schema: { type: "string", enum: ["available", "checked_out", "reserved"] } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: { "200": { description: "Paginated catalog results" } },
      },
      post: {
        summary: "Create a catalog item (librarian+)",
        tags: ["Catalog"],
        security: [bearerAuth],
        responses: { "201": { description: "Created item" }, "403": { description: "Insufficient role" } },
      },
    },
    "/catalog/items/{id}": {
      get: {
        summary: "Get single catalog item",
        tags: ["Catalog"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Item" }, "404": { description: "Not found" } },
      },
      patch: {
        summary: "Update catalog item (librarian+)",
        tags: ["Catalog"],
        security: [bearerAuth],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Updated item" }, "404": { description: "Not found" } },
      },
      delete: {
        summary: "Delete catalog item (super_admin)",
        tags: ["Catalog"],
        security: [bearerAuth],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "204": { description: "Deleted" } },
      },
    },

    // ─── Circulation ──────────────────────────────────────────────────────────
    "/circulation/checkouts": {
      post: {
        summary: "Check out an item copy (librarian+)",
        tags: ["Circulation"],
        security: [bearerAuth],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object", required: ["userId", "itemId"],
                properties: { userId: { type: "string" }, itemId: { type: "string" } },
              },
            },
          },
        },
        responses: {
          "201": { description: "Loan created" },
          "409": { description: "No available copy or loan limit reached" },
        },
      },
    },
    "/circulation/returns/{loanId}": {
      post: {
        summary: "Return a loan — accrues fines, promotes holds (librarian+)",
        tags: ["Circulation"],
        security: [bearerAuth],
        parameters: [{ name: "loanId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Return result with fineCents and holdReady" }, "404": { description: "Loan not found" } },
      },
    },
    "/circulation/renewals/{loanId}": {
      post: {
        summary: "Renew a loan (blocked if holds exist)",
        tags: ["Circulation"],
        security: [bearerAuth],
        parameters: [{ name: "loanId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Renewed loan" },
          "409": { description: "Renewal limit reached or holds exist" },
        },
      },
    },
    "/circulation/loans/user/{userId}": {
      get: {
        summary: "Get active/overdue loans for a user",
        tags: ["Circulation"],
        security: [bearerAuth],
        parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "List of loans" } },
      },
    },
    "/circulation/loans/overdue": {
      get: {
        summary: "Get all overdue loans (librarian+)",
        tags: ["Circulation"],
        security: [bearerAuth],
        responses: { "200": { description: "Overdue loans" } },
      },
    },

    // ─── Holds ────────────────────────────────────────────────────────────────
    "/holds": {
      post: {
        summary: "Place a hold / join waitlist",
        tags: ["Holds"],
        security: [bearerAuth],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object", required: ["itemId"],
                properties: { itemId: { type: "string" }, pickupBranchId: { type: "string" }, userId: { type: "string" } },
              },
            },
          },
        },
        responses: { "201": { description: "Hold created with queue position" }, "409": { description: "Already has active hold" } },
      },
    },
    "/holds/user/{userId}": {
      get: {
        summary: "Get active holds for a user",
        tags: ["Holds"],
        security: [bearerAuth],
        parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Holds list" } },
      },
    },
    "/holds/queue/{itemId}": {
      get: {
        summary: "View hold queue for an item (librarian+)",
        tags: ["Holds"],
        security: [bearerAuth],
        parameters: [{ name: "itemId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Ordered hold queue" } },
      },
    },
    "/holds/{holdId}": {
      delete: {
        summary: "Cancel a hold",
        tags: ["Holds"],
        security: [bearerAuth],
        parameters: [{ name: "holdId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Cancelled hold" } },
      },
    },

    // ─── Fines ────────────────────────────────────────────────────────────────
    "/fines/users/{userId}/balance": {
      get: {
        summary: "Get fine balance for a user",
        tags: ["Fines"],
        security: [bearerAuth],
        parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Balance in cents" } },
      },
    },
    "/fines/users/{userId}/ledger": {
      get: {
        summary: "Get fine ledger entries for a user",
        tags: ["Fines"],
        security: [bearerAuth],
        parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Ledger entries" } },
      },
    },
    "/fines/waive": {
      post: {
        summary: "Waive a fine (librarian+)",
        tags: ["Fines"],
        security: [bearerAuth],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object", required: ["userId", "amountCents", "reason"],
                properties: { userId: { type: "string" }, amountCents: { type: "number" }, reason: { type: "string" } },
              },
            },
          },
        },
        responses: { "201": { description: "Waiver ledger entry" } },
      },
    },

    // ─── Search ───────────────────────────────────────────────────────────────
    "/search": {
      get: {
        summary: "Hybrid full-text + vector search",
        tags: ["Search"],
        parameters: [
          { name: "q", in: "query", required: true, schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
        ],
        responses: { "200": { description: "Scored search results" } },
      },
    },
    "/search/recommendations/{userId}": {
      get: {
        summary: "Personalized recommendations from borrow history",
        tags: ["Search"],
        security: [bearerAuth],
        parameters: [
          { name: "userId", in: "path", required: true, schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
        ],
        responses: { "200": { description: "Recommended items" } },
      },
    },

    // ─── Notifications ────────────────────────────────────────────────────────
    "/catalog/search": {
      get: {
        summary: "Hybrid catalog search (text + vector fallback)",
        tags: ["Catalog"],
        parameters: [{ name: "q", in: "query", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Scored search results" } },
      },
    },
    "/notifications": {
      get: {
        summary: "Get in-app notifications for the authenticated user",
        tags: ["Notifications"],
        security: [bearerAuth],
        parameters: [{ name: "unread", in: "query", schema: { type: "boolean" } }],
        responses: { "200": { description: "Notifications" } },
      },
    },
    "/notifications/{id}/read": {
      patch: {
        summary: "Mark a notification as read",
        tags: ["Notifications"],
        security: [bearerAuth],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Updated notification" } },
      },
    },

    // ─── Audit Log ────────────────────────────────────────────────────────────
    "/audit": {
      get: {
        summary: "Query audit log (super_admin)",
        tags: ["Audit"],
        security: [bearerAuth],
        parameters: [
          { name: "actorId", in: "query", schema: { type: "string" } },
          { name: "action", in: "query", schema: { type: "string" } },
          { name: "targetType", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
        ],
        responses: { "200": { description: "Paginated audit log" } },
      },
    },

    // ─── Users (admin CRUD) ───────────────────────────────────────────────────
    "/users": {
      get: {
        summary: "List users (librarian+)",
        tags: ["Users"],
        security: [bearerAuth],
        parameters: [
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "role", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        ],
        responses: { "200": { description: "User list" } },
      },
    },
    "/users/{userId}": {
      get: {
        summary: "Get user by ID (self or staff)",
        tags: ["Users"],
        security: [bearerAuth],
        parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "User" }, "404": { description: "Not found" } },
      },
      patch: {
        summary: "Update user (self or staff)",
        tags: ["Users"],
        security: [bearerAuth],
        parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Updated user" } },
      },
    },
    "/users/{userId}/roles": {
      patch: {
        summary: "Change user roles (super_admin)",
        tags: ["Users"],
        security: [bearerAuth],
        parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", properties: { roles: { type: "array", items: { type: "string" } } } },
            },
          },
        },
        responses: { "200": { description: "Updated roles" } },
      },
    },

    // ─── Policies ─────────────────────────────────────────────────────────────
    "/policies": {
      get: {
        summary: "List loan policies",
        tags: ["Policies"],
        security: [bearerAuth],
        responses: { "200": { description: "Policies" } },
      },
      post: {
        summary: "Create loan policy (super_admin)",
        tags: ["Policies"],
        security: [bearerAuth],
        responses: { "201": { description: "Created policy" } },
      },
    },
    "/policies/{id}": {
      patch: {
        summary: "Update loan policy (super_admin)",
        tags: ["Policies"],
        security: [bearerAuth],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Updated policy" } },
      },
    },
  },
};
