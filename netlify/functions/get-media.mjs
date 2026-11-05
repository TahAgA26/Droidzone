import { neon } from "@neondatabase/serverless";
import { getStore } from "@netlify/blobs";
import { createHash } from "node:crypto";

const sql = neon(process.env.DATABASE_URL);

const uploads = getStore({
  name: "droidzone-media",
  consistency: "strong"
});

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
    return json({ success: false, message: "Method not allowed" }, 405);
  }

  try {
    const cookie = request.headers.get("cookie") || "";
    const match = cookie.match(
      /(?:^|;\s*)__Host-dz_session=([^;]+)/
    );

    if (!match) {
      return json({ success: false, message: "ابتدا وارد حساب شوید." }, 401);
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
      return json({ success: false, message: "نشست شما منقضی شده است." }, 401);
    }

    const url = new URL(request.url);
    const mediaId = url.searchParams.get("id");

    if (
      !mediaId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mediaId)
    ) {
      return json({ success: false, message: "شناسه فایل معتبر نیست." }, 400);
    }

    const rows = await sql`
      SELECT
        m.storage_key,
        m.mime_type,
        m.original_name
      FROM article_media m
      INNER JOIN articles a ON a.id = m.article_id
      WHERE m.id = ${mediaId}
        AND a.status = 'approved'
      LIMIT 1
    `;

    if (rows.length === 0) {
      return json({ success: false, message: "فایل پیدا نشد." }, 404);
    }

    const media = rows[0];
    const blob = await uploads.get(media.storage_key, {
      type: "blob"
    });

    if (!blob) {
      return json({ success: false, message: "فایل در فضای ذخیره‌سازی پیدا نشد." }, 404);
    }

    const safeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "video/mp4",
      "audio/mpeg",
      "audio/mp4",
      "audio/ogg",
      "application/pdf",
      "text/plain"
    ];

    const contentType = safeTypes.includes(media.mime_type)
      ? media.mime_type
      : "application/octet-stream";

    return new Response(blob, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(blob.size),
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store"
      }
    });

  } catch (error) {
    console.error("Get media error:", error);

    return json({
      success: false,
      message: "دریافت فایل ناموفق بود."
    }, 500);
  }
};
