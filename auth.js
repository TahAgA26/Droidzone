const $ = (id) => document.getElementById(id);

const API = {
  register: "/.netlify/functions/register",
  login: "/.netlify/functions/login"
};

function showMessage(message, isError = false) {
  const box = $("auth-message");
  box.textContent = message;
  box.className = isError ? "error-message" : "success-message";
}

function setLoading(form, loading) {
  const button = form.querySelector('button[type="submit"]');
  button.disabled = loading;
  button.textContent = loading ? "لطفاً صبر کن..." :
    form.id === "login-form" ? "ورود به حساب" : "ساخت حساب";
}

async function request(url, body) {
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    throw new Error("پاسخ سرور قابل خواندن نیست.");
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.message || "عملیات ناموفق بود.");
  }

  return data;
}

function downloadKeyFile(keyData) {
  const content = typeof keyData === "string"
    ? keyData
    : JSON.stringify(keyData);

  const blob = new Blob([content], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "DroidZone-Key.dzkey";
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function switchTab(tab) {
  const login = tab === "login";

  $("login-form").hidden = !login;
  $("register-form").hidden = login;

  $("login-tab").classList.toggle("active", login);
  $("register-tab").classList.toggle("active", !login);

  showMessage("");
}

$("login-tab").addEventListener("click", () => switchTab("login"));
$("register-tab").addEventListener("click", () => switchTab("register"));

$("auth-year").textContent = new Date().getFullYear();

$("register-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  setLoading(form, true);

  try {
    const username = $("register-username").value.trim();
    const email = $("register-email").value.trim().toLowerCase();

    const data = await request(API.register, {
      username,
      email
    });

    if (!data.dzkey) {
      throw new Error("سرور فایل کلید را برنگرداند.");
    }

    downloadKeyFile(data.dzkey);

    showMessage(
      "حساب ساخته شد! فایل DroidZone-Key.dzkey را در جای امن نگه دار."
    );

    form.reset();
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    setLoading(form, false);
  }
});

$("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  setLoading(form, true);

  try {
    const email = $("login-email").value.trim().toLowerCase();
    const file = $("login-key").files[0];

    if (!file) {
      throw new Error("ابتدا فایل .dzkey را انتخاب کن.");
    }

    const fileText = await file.text();
    let keyFile;

    try {
      keyFile = JSON.parse(fileText);
    } catch {
      throw new Error("ساختار فایل کلید معتبر نیست.");
    }

    if (
      !keyFile ||
      keyFile.version !== 1 ||
      typeof keyFile.key !== "string"
    ) {
      throw new Error("فایل انتخاب‌شده یک کلید معتبر DroidZone نیست.");
    }

    const data = await request(API.login, {
      email,
      key: keyFile.key
    });

    if (!data.success) {
      throw new Error("ورود انجام نشد.");
    }

    showMessage("ورود موفق بود! در حال انتقال به پروفایل...");

    window.location.href = "profile.html";
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    setLoading(form, false);
  }
});
