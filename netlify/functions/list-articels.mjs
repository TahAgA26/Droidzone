import { neon } from "@neondatabase/serverless";
import { createHash } from "node:crypto";

const sql = neon(process.env.DATABASE_URL);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export default async (request) => {
  if (request.method !== "GET") {
    return json({
      success: false,
      message: "Method not allowed"
    }, 405);
  }

  try {
    const cookie = request.headers.get("cookie") || "";

    const match = cookie.match(
      /(?:^|;\s*)__Host-dz_session=([^;]+)/
    );

    if (!match) {
      return json({
        success: false,
        message: "Please login first"
      }, 401);
    }

    const token = decodeURIComponent(match[1]);

    const tokenHash = createHash("sha256")
      .update(token)
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
      return json({
        success: false,
        message: "Session expired"
      }, 401);
    }

    const articles = await sql`
      SELECT
        a.id,
        a.title,
        a.content,
        a.created_at,
        u.username,
        COALESCE(
          json_agg(
            json_build_object(
              'id', m.id,
              'original_name', m.original_name,
              'mime_type', m.mime_type,
              'media_type', m.media_type,
              'file_size', m.file_size
            )
          ) FILTER (WHERE m.id IS NOT NULL),
          '[]'::json
        ) AS media

      FROM articles a

      INNER JOIN users u
        ON u.id = a.author_id

      LEFT JOIN article_media m
        ON m.article_id = a.id

      WHERE a.status = 'approved'

      GROUP BY a.id, u.username

      ORDER BY a.created_at DESC

      LIMIT 100
    `;

    return json({
      success: true,
      articles
    });

  } catch (error) {
    console.error("List articles error:", error);

    return json({
      success: false,
      message: "Internal server error"
    }, 500);
  }
};
