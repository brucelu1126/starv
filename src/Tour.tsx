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
        body: "Hook 數的是淨 ETH 流：買入減賣出。成交量、筆數都不算。綠粒子從左邊流進來，紅的從右邊出去，中間那座雙塔是現在的 Fₙ。",
        page: "machine",
        mode: "sandbox",
        spot: "machine",
      },
      {
        title: "左邊三頁在下半段",
        body: "機台＝看銀行怎麼走。防衛＝擠兌時跑的人付給留下的人多少。規格＝公式對哪一節白皮書。Tour／Voice／白皮書在上面，三頁在下面。先留在機台就好。",
        page: "machine",
        mode: "sandbox",
        spot: "nav",
      },
      {
        title: "進來就是沙盒",
        body: "沙盒可以灌 ETH、強制 20%／40% 七日擠兌、轉白皮書沒公開的數字。觀察只能加速時間。要改看、不動手，再切回觀察。",
        page: "machine",
        mode: "sandbox",
        spot: "modes",
      },
      {
        title: "點零件，看為什麼是這個數字",
        body: "點機台會跳到「為什麼」。Fₙ／regime／m／exit 對應白皮書公式，以及這一紀走了哪條分支。",
        page: "machine",
        mode: "sandbox",
        spot: "why",
      },
      {
        title: "先推一下池子",
        body: "灌入、抽走、或一鍵協調擠兌。白皮書沒答應銀行不會死，只答應門口會定價。自己按一次，看恆等式有沒有守住。",
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
  if (lang === "ko") {
    return [
      {
        title: "이 머신은 숫자 하나만 본다",
        body: "훅이 세는 것은 순 ETH 흐름이다. 매수 빼기 매도. 거래량도, 체결 수도 아니다. 초록 입자는 왼쪽에서 들어오고, 빨간 입자는 오른쪽으로 나간다. 가운데 쌍둥이 탑이 지금 Fₙ이다.",
        page: "machine",
        mode: "sandbox",
        spot: "machine",
      },
      {
        title: "세 페이지는 왼쪽 아래",
        body: "머신 = 은행이 어떻게 움직이는지. 방어 = 런에서 떠나는 사람이 남는 사람에게 내는 것. 스펙 = 공식 → 백서 절. 투어 / 음성 / 백서는 위에 있다. 먼저 머신에 머물러라.",
        page: "machine",
        mode: "sandbox",
        spot: "nav",
      },
      {
        title: "들어오면 샌드박스다",
        body: "샌드박스에서는 ETH를 넣고, 20% / 40% 7일 런을 강제하고, 백서가 비워 둔 숫자를 돌릴 수 있다. 관찰은 시간만 빨리 감는다. 보기만 하려면 관찰로 돌아가라.",
        page: "machine",
        mode: "sandbox",
        spot: "modes",
      },
      {
        title: "부품을 누르면 왜 이 숫자인지 보인다",
        body: "머신을 클릭하면 「왜」가 열린다. Fₙ / 레짐 / m / exit이 이번 에포크가 탄 분기와 백서 공식을 보여 준다.",
        page: "machine",
        mode: "sandbox",
        spot: "why",
      },
      {
        title: "풀을 한 번 밀어 봐라",
        body: "넣고, 빼고, 또는 협력 런을 발사하라. 백서는 은행이 산다고 약속하지 않았다. 문이 가격 매겨진다고만. 한 번 눌러 항등식이 버티는지 봐라.",
        page: "machine",
        mode: "sandbox",
        spot: "hands",
      },
      {
        title: "노브를 다 만지지 마라",
        body: "오른쪽은 금리와 이탈 수수료 곡선부터 시작한다. 금 가격과 봇은 고급에 있다. 숫자의 대부분은 §14에서 아직 비어 있다. 하나 돌리면 테이프가 다시 돈다.",
        page: "machine",
        mode: "sandbox",
        spot: "params",
      },
    ];
  }
  return [
    {
      title: "The machine reads one number",
      body: "The hook counts net ETH flow: buys minus sells. Not volume, not trade count. Green particles come in from the left, red leave on the right. The center twin towers are Fₙ.",
      page: "machine",
      mode: "sandbox",
      spot: "machine",
    },
    {
      title: "Three pages, under the utilities",
      body: "Machine = watch the bank. Defence = what leavers pay stayers in a run. Spec = formula → whitepaper section. Tour / Voice / Whitepaper sit above. Stay on Machine first.",
      page: "machine",
      mode: "sandbox",
      spot: "nav",
    },
    {
      title: "You start in Sandbox",
      body: "Sandbox lets you inject ETH, force a 20% / 40% seven-day run, or twist a number the paper left blank. Observer is watch-only: you can only speed time. Switch back if you just want to watch.",
      page: "machine",
      mode: "sandbox",
      spot: "modes",
    },
    {
      title: "Click a part. See why the number is that number.",
      body: "Click a part of the machine — it opens Why. Fₙ / regime / m / exit show which branch this epoch took, and the formula from the paper.",
      page: "machine",
      mode: "sandbox",
      spot: "why",
    },
    {
      title: "Shove the pool once",
      body: "Push, pull, or fire a coordinated run. The paper never promised the bank survives — only that the door is priced. Press it once and see if the identities hold.",
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
