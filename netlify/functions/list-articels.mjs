import { neon } from "@neondatabase/serverless";
import { createHash } from "node:crypto";

const sql = neon(process.env.DATABASE_URL);

export default async (request) => {
  if (request.method !== "GET") {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Method not allowed"
      }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  try {
    const cookie = request.headers.get("cookie") || "";

    const sessionMatch = cookie.match(
      /(?:^|;\s*)__Host-dz_session=([^;]+)/
    );

    if (!sessionMatch) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Please login first"
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const sessionToken = decodeURIComponent(sessionMatch[1]);

    const tokenHash = createHash("sha256")
      .update(sessionToken)
      .digest("hex");

    const sessions = await sql`
      SELECT user_id
      FROM user_sessions
      WHERE token_hash = ${tokenHash}
        AND revoked_at IS NULL
        AND expires_at > NOW()
      LIMIT 1
    `;

    if (sessions.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Session expired"
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const articles = await sql`
      SELECT
        articles.id,
        articles.title,
        articles.content,
        articles.created_at,
        users.username
      FROM articles
      INNER JOIN users
        ON users.id = articles.author_id
      WHERE articles.status = 'approved'
      ORDER BY articles.created_at DESC
      LIMIT 100
    `;

    return new Response(
      JSON.stringify({
        success: true,
        articles
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store"
        }
      }
    );

  } catch (error) {
    console.error("List articles error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: "Internal server error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
