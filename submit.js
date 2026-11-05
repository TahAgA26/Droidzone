const form = document.getElementById("article-form");
const button = document.getElementById("submit-button");
const message = document.getElementById("message");
const fileInput = document.getElementById("files");

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const MAX_FILES = 5;

function showMessage(text) {
  message.textContent = text;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = document.getElementById("title").value.trim();
  const content = document.getElementById("content").value.trim();
  const files = Array.from(fileInput.files || []);

  if (files.length > MAX_FILES) {
    showMessage("حداکثر می‌توانی ۵ فایل انتخاب کنی.");
    return;
  }

  if (files.some(file => file.size > MAX_FILE_SIZE)) {
    showMessage("حجم هر فایل باید حداکثر ۴ مگابایت باشد.");
    return;
  }

  button.disabled = true;

  try {
    showMessage("در حال ثبت مقاله...");

    button.textContent = "در حال ثبت مقاله...";

    const articleResponse = await fetch(
      "/.netlify/functions/create-article",
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ title, content })
      }
    );

    const articleData = await articleResponse.json();

    if (!articleResponse.ok || !articleData.success) {
      throw new Error(
        articleData.message || "ثبت مقاله ناموفق بود."
      );
    }

    const articleId = articleData.article?.id;

    if (!articleId) {
      throw new Error("شناسه مقاله دریافت نشد.");
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      showMessage(
        `در حال آپلود فایل ${i + 1} از ${files.length}...`
      );

      button.textContent = `آپلود ${i + 1} از ${files.length}`;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("articleId", articleId);

      const uploadResponse = await fetch(
        "/.netlify/functions/upload-media",
        {
          method: "POST",
          credentials: "include",
          body: formData
        }
      );

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok || !uploadData.success) {
        throw new Error(
          `آپلود ${file.name} ناموفق بود: ${
            uploadData.message || "خطای نامشخص"
          }`
        );
      }
    }

    showMessage("✅ مقاله و فایل‌های پیوست با موفقیت منتشر شدند!");

    form.reset();

    setTimeout(() => {
      location.href = "index.html";
    }, 1800);

  } catch (error) {
    showMessage("❌ " + error.message);
  } finally {
    button.disabled = false;
    button.textContent = "انتشار مقاله";
  }
});
