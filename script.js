const API = "/.netlify/functions/list-articles";

const articleList = document.getElementById("article-list");
const emptyMessage = document.getElementById("empty");
const searchInput = document.getElementById("search");

let articles = [];

document.getElementById("year").textContent =
  new Date().getFullYear();

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function renderArticles() {
  const query = searchInput.value.trim().toLowerCase();

  const filtered = articles.filter(article => {
    const title = String(article.title || "").toLowerCase();
    const content = String(article.content || "").toLowerCase();

    return title.includes(query) || content.includes(query);
  });

  articleList.innerHTML = "";

  if (filtered.length === 0) {
    emptyMessage.hidden = false;
    emptyMessage.textContent = query
      ? "مقاله‌ای با این عبارت پیدا نشد."
      : "هنوز مقاله‌ای منتشر نشده است.";
    return;
  }

  emptyMessage.hidden = true;

  filtered.forEach(article => {
    const card = document.createElement("article");
    card.className = "dz-article";

    const title = escapeHTML(article.title || "بدون عنوان");
    const content = escapeHTML(article.content || "");

    const author = escapeHTML(
      article.username || "کاربر DroidZone"
    );

    const date = article.created_at
      ? new Date(article.created_at).toLocaleDateString("fa-IR")
      : "";

    card.innerHTML = `
      <h3>${title}</h3>
      <p>${content.slice(0, 220)}${content.length > 220 ? "..." : ""}</p>
      <small>${author}${date ? " • " + escapeHTML(date) : ""}</small>
    `;

    articleList.appendChild(card);
  });
}

async function loadArticles() {
  emptyMessage.hidden = false;
  emptyMessage.textContent = "در حال بارگذاری مقاله‌ها...";

  try {
    const response = await fetch(API, {
      method: "GET",
      credentials: "include",
      cache: "no-store"
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "خطا در دریافت مقاله‌ها");
    }

    articles = Array.isArray(data.articles)
      ? data.articles
      : [];

    renderArticles();

  } catch (error) {
    console.error("DroidZone articles:", error);

    articleList.innerHTML = "";
    emptyMessage.hidden = false;
    emptyMessage.textContent =
      "دریافت مقاله‌ها ناموفق بود. لطفاً دوباره تلاش کن.";
  }
}

searchInput.addEventListener("input", renderArticles);

loadArticles();
