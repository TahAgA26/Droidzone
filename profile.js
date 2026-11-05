const $ = (id) => document.getElementById(id);

let currentUser = null;
let selectedKeyId = null;

const endpoints = {
  me: "/.netlify/functions/me",
  keys: "/.netlify/functions/keys",
  revoke: "/.netlify/functions/revoke-key",
  logout: "/.netlify/functions/logout"
};

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...options,
    headers: {
      ...(options.headers || {})
    }
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.message || `خطای سرور: ${response.status}`);
  }

  return data;
}

function showNotice(title, message) {
  $("notice-title").textContent = title;
  $("notice-message").textContent = message;

  const dialog = $("profile-notice");

  if (dialog && !dialog.open) {
    dialog.showModal();
  }
}

function formatDate(value) {
  if (!value) return "ثبت نشده";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "نامشخص";

  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function setText(id, value) {
  const element = $(id);
  if (element) element.textContent = value ?? "";
}

async function loadProfile() {
  try {
    const data = await api(endpoints.me);

    if (!data.loggedIn || !data.user) {
      showNotice(
        "ورود به حساب",
        "برای مشاهده پروفایل ابتدا باید وارد حساب کاربری خود شوی."
      );
      return;
    }

    currentUser = data.user;

    setText("profile-username", currentUser.username);
    setText("profile-email", currentUser.email);
    setText(
      "profile-role",
      currentUser.role === "admin" ? "مدیر" : "کاربر"
    );

    const avatar = $("profile-avatar");
    if (avatar) {
      avatar.textContent =
        (currentUser.username || "D").trim().charAt(0).toUpperCase();
    }

    await loadKeys();
  } catch (error) {
    showNotice("خطا در دریافت پروفایل", error.message);
  }
}

async function loadKeys() {
  const loading = $("keys-loading");
  const errorBox = $("keys-error");
  const emptyBox = $("keys-empty");
  const list = $("keys-list");

  loading.hidden = false;
  errorBox.hidden = true;
  emptyBox.hidden = true;
  list.replaceChildren();

  try {
    const data = await api(endpoints.keys);
    const keys = Array.isArray(data.keys) ? data.keys : [];

    loading.hidden = true;

    const activeCount = keys.filter(
      key => key.status === "active"
    ).length;

    setText("active-key-count", activeCount);
    setText("total-key-count", keys.length);

    if (keys.length === 0) {
      emptyBox.hidden = false;
      return;
    }

    keys.forEach(key => {
      const card = document.createElement("article");
      card.className = "key-card";

      const title = document.createElement("h3");
      title.textContent = key.key_name || "دستگاه من";

      const status = document.createElement("span");
      status.className = "key-status";
      status.textContent =
        key.status === "active" ? "فعال" :
        key.status === "revoked" ? "لغوشده" :
        "منقضی‌شده";

      const created = document.createElement("p");
      created.textContent = `تاریخ ساخت: ${formatDate(key.created_at)}`;

      const lastUsed = document.createElement("p");
      lastUsed.textContent = `آخرین استفاده: ${formatDate(key.last_used_at)}`;

      card.append(title, status, created, lastUsed);

      if (key.expires_at) {
        const expiry = document.createElement("p");
        expiry.textContent = `انقضا: ${formatDate(key.expires_at)}`;
        card.appendChild(expiry);
      }

      if (key.status === "active") {
        const revokeButton = document.createElement("button");
        revokeButton.className = "danger-button";
        revokeButton.textContent = "لغو این کلید";

        revokeButton.addEventListener("click", () => {
          selectedKeyId = key.id;

          const dialog = $("revoke-dialog");
          if (dialog) dialog.showModal();
        });

        card.appendChild(revokeButton);
      }

      list.appendChild(card);
    });
  } catch (error) {
    loading.hidden = true;
    errorBox.hidden = false;
    errorBox.textContent = error.message;
  }
}

async function revokeSelectedKey() {
  if (!selectedKeyId) return;

  const button = $("confirm-revoke");
  button.disabled = true;

  try {
    await api(endpoints.revoke, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        keyId: selectedKeyId
      })
    });

    $("revoke-dialog").close();

    showNotice(
      "کلید لغو شد",
      "کلید انتخاب‌شده و نشست‌های فعال حساب لغو شدند. برای ادامه باید دوباره وارد شوی."
    );

    selectedKeyId = null;

    setTimeout(() => {
      window.location.href = "index.html";
    }, 2500);
  } catch (error) {
    showNotice("خطا در لغو کلید", error.message);
  } finally {
    button.disabled = false;
  }
}

async function logout() {
  const button = $("logout-button");
  button.disabled = true;

  try {
    await api(endpoints.logout, {
      method: "POST"
    });

    window.location.href = "index.html";
  } catch (error) {
    showNotice("خطا در خروج", error.message);
    button.disabled = false;
  }
}

function setupTheme() {
  const button = $("profile-theme");

  if (!button) return;

  const savedTheme = localStorage.getItem("dz-theme");

  if (savedTheme === "light") {
    document.body.classList.add("light-theme");
  }

  button.addEventListener("click", () => {
    document.body.classList.toggle("light-theme");

    localStorage.setItem(
      "dz-theme",
      document.body.classList.contains("light-theme")
        ? "light"
        : "dark"
    );
  });
}

function setupEvents() {
  $("refresh-keys")?.addEventListener("click", loadKeys);
  $("retry-keys")?.addEventListener("click", loadKeys);

  $("logout-button")?.addEventListener("click", logout);

  $("confirm-revoke")?.addEventListener(
    "click",
    revokeSelectedKey
  );

  $("cancel-revoke")?.addEventListener("click", () => {
    selectedKeyId = null;
    $("revoke-dialog").close();
  });

  $("close-notice")?.addEventListener("click", () => {
    $("profile-notice").close();
  });

  setText("profile-year", new Date().getFullYear());
}

document.addEventListener("DOMContentLoaded", () => {
  setupEvents();
  setupTheme();
  loadProfile();
});
