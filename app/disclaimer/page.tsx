import { FIXED_DISCLOSURE } from "@/lib/disclaimer";

export default function DisclaimerPage() {
  return (
    <div className="container">
      <section className="page-intro">
        <span className="kicker">Disclaimer</span>
        <h1>关于与免责</h1>
        <p>{FIXED_DISCLOSURE}</p>
      </section>
      <section className="card" style={{ marginBottom: 70 }}>
        <h2>这是什么</h2>
        <p>一席话把公开资料、人物观点和编辑策划整理成可阅读的对谈。现在能公开看到的，都是编辑部审核后发布的内容。</p>
        <h2>这不是什么</h2>
        <p>页面里的人物发言不是本人原话，也不代表本人参与、认可或持有这些观点。这一版没有音频，不能当成录音或新闻引语。</p>
        <h2>资料</h2>
        <p>每一席会标出来源。种子内容里有演示占位，发布前应以编辑核对为准。</p>
      </section>
    </div>
  );
}
