
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
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const tokenHash = createHash("sha256")
      .update(token)
      .digest("hex");

    const sql = neon(process.env.DATABASE_URL);

    const sessions = await sql`
      SELECT user_id
      FROM user_sessions
      WHERE token_hash = ${tokenHash}
        AND revoked_at IS NULL
        AND expires_at > NOW()
      LIMIT 1
    `;

    if (!sessions.length) {
      return Response.json(
        { success: false, message: "Invalid session" },
        { status: 401 }
      );
    }

    const keys = await sql`
      SELECT
        id,
        key_name,
        created_at,
        last_used_at,
        expires_at,
        revoked_at,
        CASE
          WHEN revoked_at IS NOT NULL THEN 'revoked'
          WHEN expires_at IS NOT NULL AND expires_at <= NOW()
            THEN 'expired'
          ELSE 'active'
        END AS status
      FROM dzkeys
      WHERE user_id = ${sessions[0].user_id}
      ORDER BY created_at DESC
    `;

    return Response.json(
      {
        success: true,
        keys
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );

  } catch (error) {
    console.error("Key listing failed");

    return Response.json(
      { success: false, message: "Could not load keys" },
      { status: 500 }
 
            );
  }
};
