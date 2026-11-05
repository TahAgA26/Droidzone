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
  if (request.method !== "POST") {
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
        message: "لطفاً ابتدا وارد حساب خود شوید."
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
        message: "نشست شما منقضی شده است."
      }, 401);
    }

    const body = await request.json();

    const title = String(body.title || "").trim();
    const content = String(body.content || "").trim();

    if (title.length < 3 || title.length > 120) {
      return json({
        success: false,
        message: "عنوان باید بین ۳ تا ۱۲۰ کاراکتر باشد."
      }, 400);
    }

    if (content.length < 20 || content.length > 20000) {
      return json({
        success: false,
        message: "متن مقاله باید بین ۲۰ تا ۲۰۰۰۰ کاراکتر باشد."
      }, 400);
    }

    const result = await sql`
      INSERT INTO articles (
        author_id,
        title,
        content,
        status
      )
      VALUES (
        ${sessions[0].user_id},
        ${title},
        ${content},
        'approved'
      )
      RETURNING id, title, status, created_at
    `;

    return json({
      success: true,
      message: "مقاله با موفقیت منتشر شد.",
      article: result[0]
    }, 201);

  } catch (error) {
    console.error("Create article error:", error);

    return json({
      success: false,
      message: "خطا در ثبت مقاله."
    }, 500);
  }
};
