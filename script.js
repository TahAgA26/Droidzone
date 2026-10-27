
const articles = [
  {
    id: "android-guide",
    category: "android",
    icon: "🤖",
    title: "شروع کار با اندروید؛ راهنمای کاربردی",
    en: "Getting Started with Android",
    desc: "با تنظیمات مهم، امنیت پایه و امکانات کاربردی گوشی اندرویدی آشنا شو.",
    enDesc: "Explore essential settings, basic security and useful Android features.",
    body: "اندروید امکانات فراوانی برای شخصی‌سازی دارد. برای شروع، سیستم‌عامل و برنامه‌ها را به‌روز نگه دار، قفل صفحهٔ مطمئن انتخاب کن و مجوزهای برنامه‌ها را بررسی کن.",
    enBody: "Android offers extensive customization. Keep your system and apps updated, choose a secure screen lock and review app permissions.",
    categoryName: "Android"
  },
  {
    id: "hyperos",
    category: "hyperos",
    icon: "✨",
    title: "آشنایی با HyperOS و قابلیت‌های آن",
    en: "Discover HyperOS Features",
    desc: "نگاهی به تنظیمات ظاهری، شخصی‌سازی و امکانات گوشی‌های شیائومی.",
    enDesc: "Explore visual settings, customization and Xiaomi phone features.",
    body: "برای شخصی‌سازی HyperOS از تنظیمات رسمی تم‌ها، صفحهٔ قفل، نمایشگر و اعلان‌ها شروع کن. نام و دسترس‌پذیری قابلیت‌ها ممکن است با مدل و نسخهٔ سیستم‌عامل فرق داشته باشد.",
    enBody: "Start with official theme, lock screen, display and notification settings. Feature availability can vary by device and OS version.",
    categoryName: "HyperOS"
  },
  {
    id: "app-safety",
    category: "apps",
    icon: "🛡️",
    title: "چطور برنامه‌های اندروید را امن‌تر نصب کنیم؟",
    en: "How to Install Android Apps Safely",
    desc: "چند نکتهٔ مهم برای بررسی مجوزها و محافظت از اطلاعات شخصی.",
    enDesc: "Tips for reviewing permissions and protecting personal information.",
    body: "تا جای ممکن از فروشگاه‌های معتبر استفاده کن، نام توسعه‌دهنده را بررسی کن و مجوزهایی را که با عملکرد برنامه ارتباط ندارند نپذیر. برای فایل‌های ناشناس با احتیاط عمل کن.",
    enBody: "Prefer trusted app stores, verify the developer and avoid granting permissions unrelated to an app's purpose.",
    categoryName: "Apps"
  },
  {
    id: "updates",
    category: "android",
    icon: "⚡",
    title: "چرا به‌روزرسانی گوشی اهمیت دارد؟",
    en: "Why Phone Updates Matter",
    desc: "مزایای امنیتی و پایداری به‌روزرسانی سیستم‌عامل و برنامه‌ها.",
    enDesc: "Learn how updates can improve security and reliability.",
    body: "به‌روزرسانی‌ها می‌توانند آسیب‌پذیری‌های امنیتی را برطرف کنند و پایداری را بهتر کنند. پیش از به‌روزرسانی بزرگ، از اطلاعات مهم نسخهٔ پشتیبان بگیر و فضای کافی داشته باش.",
    enBody: "Updates can fix security vulnerabilities and improve stability. Back up important data before major upgrades.",
    categoryName: "Android"
  }
];

const $ = id => document.getElementById(id);
let lang = "fa";
let category = "all";
let query = "";

function render() {
  const list = articles.filter(a => {
    const searchable = [a.title, a.en, a.desc, a.enDesc, a.categoryName]
      .join(" ").toLocaleLowerCase();
    return (category === "all" || a.category === category) &&
      searchable.includes(query.toLocaleLowerCase());
  });

  $("article-list").innerHTML = list.map(a => `
    <article class="article">
      <div class="article-icon">${a.icon}</div>
      <div class="tag">${a.categoryName}</div>
      <h3>${lang === "fa" ? a.title : a.en}</h3>
      <p>${lang === "fa" ? a.desc : a.enDesc}</p>
      <button class="read" data-read="${a.id}">
        ${lang === "fa" ? "ادامهٔ مطلب ←" : "Read more →"}
      </button>
    </article>
  `).join("");

  $("count").textContent = lang === "fa"
    ? `${list.length} مقاله`
    : `${list.length} articles`;

  $("empty").hidden = list.length !== 0;
  $("empty").textContent = lang === "fa"
    ? "مقاله‌ای پیدا نشد."
    : "No articles found.";
}

function setLanguage(next) {
  lang = next;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "fa" ? "rtl" : "ltr";
  document.querySelectorAll("[data-fa][data-en]").forEach(el => {
    el.innerHTML = el.dataset[lang];
  });
  $("search").placeholder = lang === "fa"
    ? "جست‌وجو در مقاله‌ها..."
    : "Search articles...";
  $("language").textContent = lang === "fa" ? "EN" : "فا";
  render();
}

$("language").addEventListener("click", () => {
  setLanguage(lang === "fa" ? "en" : "fa");
});

$("theme").addEventListener("click", () => {
  document.body.classList.toggle("light");
  $("theme").textContent = document.body.classList.contains("light")
    ? "☾" : "☼";
});

$("search").addEventListener("input", event => {
  query = event.target.value.trim();
  render();
});

$("clear").addEventListener("click", () => {
  $("search").value = "";
  query = "";
  render();
});

document.querySelectorAll(".filter").forEach(button => {
  button.addEventListener("click", () => {
    category = button.dataset.category;
    document.querySelectorAll(".filter").forEach(b =>
      b.classList.toggle("active", b === button)
    );
    render();
  });
});

$("article-list").addEventListener("click", event => {
  const button = event.target.closest("[data-read]");
  if (!button) return;

  const article = articles.find(a => a.id === button.dataset.read);
  if (!article) return;

  $("reader-content").innerHTML = `
    <div class="eyebrow">${article.categoryName}</div>
    <h2>${lang === "fa" ? article.title : article.en}</h2>
    <p>${lang === "fa" ? article.body : article.enBody}</p>
    <p>${lang === "fa" ? article.desc : article.enDesc}</p>
  `;
  $("reader").showModal();
});

$("close-reader").addEventListener("click", () => $("reader").close());
$("reader").addEventListener("click", event => {
  if (event.target === $("reader")) $("reader").close();
});

$("year").textContent = new Date().getFullYear();
render();
