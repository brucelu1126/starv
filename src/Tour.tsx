import type { Copy, Lang } from "./i18n.ts";

export type TourStep = {
  title: string;
  body: string;
  page: "machine" | "defence" | "spec";
  mode: "observer" | "sandbox";
  spot: string | null;
};

export function tourSteps(lang: Lang): TourStep[] {
  if (lang === "zh") {
    return [
      {
        title: "這台機器只看一個數字",
        body: "Hook 數的是淨 ETH 流：買入減賣出。成交量、筆數都不算。綠粒子從左邊流進來，紅的從右邊出去，中間那座 hook 是現在的 Fₙ。",
        page: "machine",
        mode: "observer",
        spot: "machine",
      },
      {
        title: "上面只有三頁",
        body: "機台＝看銀行怎麼走。防衛＝擠兌時跑的人付給留下的人多少。規格＝公式對哪一節白皮書。先留在機台就好。",
        page: "machine",
        mode: "observer",
        spot: "nav",
      },
      {
        title: "先看，再動手",
        body: "觀察：只能加速時間。沙盒：才能灌 ETH、強制 20%／40% 七日擠兌。剛進來預設是觀察，右邊不會跳出一堆旋鈕。",
        page: "machine",
        mode: "observer",
        spot: "modes",
      },
      {
        title: "點零件，看為什麼是這個數字",
        body: "點機台或下面 Fₙ／regime／m／exit。旁邊會寫這一紀走了哪條分支，以及對應的白皮書公式。",
        page: "machine",
        mode: "observer",
        spot: "why",
      },
      {
        title: "想搞爆它，進沙盒",
        body: "灌入、抽走、或一鍵協調擠兌。白皮書說 run 會自己死掉——這裡可以自己按一次看規則有沒有守住。",
        page: "machine",
        mode: "sandbox",
        spot: "hands",
      },
      {
        title: "旋鈕先不用全碰",
        body: "右邊預設只留利率跟退出費。其餘（金價、bots）收在進階。數字幾乎都是白皮書還沒公開的假設，轉了整場會重跑。",
        page: "machine",
        mode: "sandbox",
        spot: "params",
      },
    ];
  }
  return [
    {
      title: "The machine reads one number",
      body: "The hook counts net ETH flow: buys minus sells. Not volume, not trade count. Green particles come in from the left, red leave on the right. The center block is Fₙ.",
      page: "machine",
      mode: "observer",
      spot: "machine",
    },
    {
      title: "Three pages, that's it",
      body: "Machine = watch the bank. Defence = what leavers pay stayers in a run. Spec = formula → whitepaper section. Stay on Machine first.",
      page: "machine",
      mode: "observer",
      spot: "nav",
    },
    {
      title: "Watch first, then shove",
      body: "Observer: you can only speed time. Sandbox: inject ETH or force a 20% / 40% seven-day run. You start in Observer so the knob wall stays hidden.",
      page: "machine",
      mode: "observer",
      spot: "modes",
    },
    {
      title: "Click a part. See why the number is that number.",
      body: "Hit the machine or Fₙ / regime / m / exit. The card shows which branch this epoch took, and the formula from the paper.",
      page: "machine",
      mode: "observer",
      spot: "why",
    },
    {
      title: "To break it, open Sandbox",
      body: "Push, pull, or fire a coordinated run. The paper says a run dies on its own. Press it once and see if the rules hold.",
      page: "machine",
      mode: "sandbox",
      spot: "hands",
    },
    {
      title: "Don't touch every knob",
      body: "The side panel starts with rate and the exit-fee curve. Gold price and bots sit under Advanced. Most numbers are still blank in §14 — twist one and the tape reruns.",
      page: "machine",
      mode: "sandbox",
      spot: "params",
    },
  ];
}

export function TourCard({
  step,
  i,
  n,
  t,
  onPrev,
  onNext,
  onSkip,
}: {
  step: TourStep;
  i: number;
  n: number;
  t: Copy;
  onPrev: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="guide" role="dialog" aria-label={step.title}>
      <div className="guide-mask" />
      <article className="guide-card">
        <p className="kicker">
          {i + 1} / {n}
        </p>
        <h2>{step.title}</h2>
        <p>{step.body}</p>
        <footer>
          <button type="button" onClick={onSkip}>
            {t.skipTour}
          </button>
          <button type="button" disabled={i === 0} onClick={onPrev}>
            {t.prev}
          </button>
          <button type="button" className="primary" onClick={onNext}>
            {i === n - 1 ? t.doneTour : t.next}
          </button>
        </footer>
      </article>
    </div>
  );
}
