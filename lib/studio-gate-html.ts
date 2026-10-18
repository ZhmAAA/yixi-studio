import { FIXED_DISCLOSURE } from "@/lib/disclaimer";

export function studioUnauthorizedHtml() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>需要编辑部登录 · 一席话</title>
  <style>
    body { margin: 0; background: #f6f4ef; color: #1d1d1b; font-family: Arial, "PingFang SC", "Microsoft YaHei", sans-serif; }
    main { width: min(560px, calc(100% - 32px)); margin: 64px auto; }
    h1 { font-size: 32px; line-height: 1.2; letter-spacing: -0.03em; }
    p { color: #706d67; line-height: 1.7; }
    form { display: grid; gap: 12px; padding: 20px; border: 1px solid #dfdcd3; border-radius: 20px; background: #fffdf8; }
    label { display: grid; gap: 8px; font-size: 13px; font-weight: 700; }
    input { min-height: 44px; padding: 0 12px; border: 1px solid #dfdcd3; border-radius: 12px; font: inherit; }
    button, a.button { display: inline-flex; align-items: center; justify-content: center; min-height: 42px; padding: 0 18px; border: 0; border-radius: 999px; background: #1d1d1b; color: white; font: inherit; font-weight: 700; text-decoration: none; }
    .row { display: flex; flex-wrap: wrap; gap: 10px; }
    .error { color: #923d30; font-size: 13px; }
    footer { margin-top: 28px; color: #1d1d1b; font-size: 13px; line-height: 1.6; }
  </style>
</head>
<body>
  <main>
    <h1>内容工作台仅供编辑部使用</h1>
    <p>这一页需要编辑部密码。未登录不能查看或修改草稿。公开站点仍可阅读已发布的一席。</p>
    <form id="studio-login">
      <label>编辑部密码
        <input name="password" type="password" autocomplete="current-password" required />
      </label>
      <div class="row">
        <button type="submit">进入工作台</button>
        <a class="button" href="/" style="background:#fffdf8;color:#1d1d1b;border:1px solid #dfdcd3">返回公开站</a>
      </div>
      <p id="studio-login-error" class="error" role="alert"></p>
    </form>
    <footer>${FIXED_DISCLOSURE}</footer>
  </main>
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
