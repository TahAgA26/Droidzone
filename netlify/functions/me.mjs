import { neon } from "@neondatabase/serverless";
import { createHash } from "node:crypto";

export default async (request, context) => {
  if (request.method !== "GET") {
    return Response.json(
      { success: false, message: "Method not allowed" },
      { status: 405 }
    );
  }

  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("Database configuration missing");
    }

    const token = await context.cookies.get("__Host-dz_session");

    if (!token) {
      return Response.json(
        { success: false, loggedIn: false },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const tokenHash = createHash("sha256")
      .update(token)
      .digest("hex");

    const sql = neon(process.env.DATABASE_URL);

    const result = await sql`
      SELECT
        u.id,
        u.email,
        u.username,
        u.role
      FROM user_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ${tokenHash}
        AND s.revoked_at IS NULL
        AND s.expires_at > NOW()
        AND u.email_verified = TRUE
      LIMIT 1
    `;

    if (result.length === 0) {
      context.cookies.delete("__Host-dz_session");

      return Response.json(
        { success: true, loggedIn: false },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    await sql`
      UPDATE user_sessions
      SET last_used_at = NOW()
      WHERE token_hash = ${tokenHash}
    `;

    return Response.json(
      {
        success: true,
        loggedIn: true,
        user: result[0]
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch {
    return Response.json(
      { success: false, message: "Could not check session" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
  
    );
  }
};
