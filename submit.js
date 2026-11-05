const form = document.getElementById("article-form");
const button = document.getElementById("submit-button");
const message = document.getElementById("message");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = document.getElementById("title").value.trim();
  const content = document.getElementById("content").value.trim();

  button.disabled = true;
  button.textContent = "در حال انتشار...";
  message.textContent = "";

  try {
    const response = await fetch(
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

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "انتشار مقاله ناموفق بود.");
    }

    message.textContent = "✅ مقاله با موفقیت منتشر شد!";
    form.reset();

    setTimeout(() => {
      location.href = "index.html";
    }, 1500);

  } catch (error) {
    message.textContent = "❌ " + error.message;
  } finally {
    button.disabled = false;
    button.textContent = "انتشار مقاله";
  }
});
