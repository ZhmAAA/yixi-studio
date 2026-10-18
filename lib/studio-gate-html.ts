import { FIXED_DISCLOSURE } from "@/lib/disclaimer";

export function studioUnauthorizedHtml() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>需要编辑部登录 · 一席话</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@600&family=Source+Sans+3:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    body { margin: 0; background: #f3eee4; color: #1a1916; font-family: "Source Sans 3", "PingFang SC", "Microsoft YaHei", sans-serif; }
    main { width: min(560px, calc(100% - 32px)); margin: 72px auto 48px; padding: 48px 28px; text-align: center; border: 1px solid #ddd4c5; border-radius: 14px; background: #fffbf5; }
    .eyebrow { margin: 0 0 12px; color: #6f6860; font-size: 12px; font-weight: 600; letter-spacing: 0.06em; }
    h1 { margin: 0 0 14px; font-family: "Noto Serif SC", Georgia, serif; font-size: clamp(28px, 4vw, 40px); font-weight: 600; line-height: 1.25; letter-spacing: -0.02em; }
    p { margin: 0 auto 28px; max-width: 36em; color: #6f6860; font-size: 16px; line-height: 1.7; }
    form { display: grid; gap: 14px; text-align: left; }
    label { display: grid; gap: 8px; color: #6f6860; font-size: 12px; font-weight: 600; letter-spacing: 0.04em; }
    input { min-height: 46px; padding: 0 14px; border: 1px solid #ddd4c5; border-radius: 10px; background: #fff; color: #1a1916; font: inherit; font-weight: 400; letter-spacing: 0; }
    .row { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
    button, a.button { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 0 18px; border-radius: 999px; font: inherit; font-weight: 600; text-decoration: none; }
    button { border: 0; background: #1a1916; color: #fff; cursor: pointer; }
    a.button { border: 1px solid #c9bfae; background: transparent; color: #2e2b26; }
    .error { min-height: 1.4em; margin: 0; color: #923d30; font-size: 13px; text-align: center; }
    footer { width: min(560px, calc(100% - 32px)); margin: 0 auto 48px; color: #2e2b26; font-size: 12.5px; line-height: 1.7; }
  </style>
</head>
<body>
  <main>
    <p class="eyebrow">若未登录</p>
    <h1>工作台仅供编辑部使用</h1>
    <p>读者可返回公开站，阅读已发布的一席。编辑请用密码进入，未登录不能查看或修改草稿。</p>
    <form id="studio-login">
      <label>编辑部密码
        <input name="password" type="password" autocomplete="current-password" required />
      </label>
      <div class="row">
        <button type="submit">进入工作台</button>
        <a class="button" href="/">回公开站</a>
      </div>
      <p id="studio-login-error" class="error" role="alert"></p>
    </form>
  </main>
  <footer>${FIXED_DISCLOSURE}</footer>
  <script>
    document.getElementById("studio-login").addEventListener("submit", async (event) => {
      event.preventDefault();
      const password = new FormData(event.currentTarget).get("password");
      const response = await fetch("/api/studio/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        location.href = "/studio";
        return;
      }
      document.getElementById("studio-login-error").textContent = payload.error || "密码不正确";
    });
  </script>
</body>
</html>`;
}
