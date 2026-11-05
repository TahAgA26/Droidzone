import { neon } from "@neondatabase/serverless";
import { getStore } from "@netlify/blobs";
import { createHash, randomUUID } from "node:crypto";

const sql = neon(process.env.DATABASE_URL);
const uploads = getStore({
  name: "droidzone-media",
  consistency: "strong"
});

const MAX_SIZE = 4 * 1024 * 1024;

const ALLOWED_TYPES = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
  "video/mp4": "video",
  "audio/mpeg": "audio",
  "audio/mp4": "audio",
  "audio/ogg": "audio",
  "application/pdf": "file",
  "text/plain": "file"
};

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
    return json({ success: false, message: "Method not allowed" }, 405);
  }

  let storageKey = null;

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

    const form = await request.formData();
    const file = form.get("file");
    const articleId = String(form.get("articleId") || "");

    if (!(file instanceof File)) {
      return json({ success: false, message: "فایلی انتخاب نشده است." }, 400);
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(articleId)) {
      return json({ success: false, message: "شناسه مقاله معتبر نیست." }, 400);
    }

    if (file.size < 1 || file.size > MAX_SIZE) {
      return json({
        success: false,
        message: "حجم فایل باید حداکثر ۴ مگابایت باشد."
      }, 400);
    }

    const mediaType = ALLOWED_TYPES[file.type];

    if (!mediaType) {
      return json({
        success: false,
        message: "این نوع فایل پشتیبانی نمی‌شود."
      }, 400);
    }

    const ownedArticles = await sql`
      SELECT id
      FROM articles
      WHERE id = ${articleId}
        AND author_id = ${sessions[0].user_id}
      LIMIT 1
    `;

    if (ownedArticles.length === 0) {
      return json({
        success: false,
        message: "مقاله پیدا نشد یا متعلق به شما نیست."
      }, 404);
    }

    storageKey = randomUUID();

    await uploads.set(storageKey, file, {
      metadata: {
        originalName: file.name.slice(0, 180),
        mimeType: file.type
      }
    });

    const result = await sql`
      INSERT INTO article_media (
        article_id,
        storage_key,
        original_name,
        mime_type,
        media_type,
        file_size
      )
      VALUES (
        ${articleId},
        ${storageKey},
        ${file.name.slice(0, 180)},
        ${file.type},
        ${mediaType},
        ${file.size}
      )
      RETURNING id, original_name, mime_type, media_type, file_size
    `;

    return json({
      success: true,
      message: "فایل با موفقیت آپلود شد.",
      file: result[0]
    }, 201);

  } catch (error) {
    if (storageKey) {
      try {
        await uploads.delete(storageKey);
      } catch (cleanupError) {
        console.error("Upload cleanup error:", cleanupError);
      }
    }

    console.error("Media upload error:", error);

    return json({
      success: false,
      message: "آپلود فایل انجام نشد."
    }, 500);
  }
};
