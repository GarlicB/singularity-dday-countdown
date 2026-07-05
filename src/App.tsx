import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  Clock3,
  ExternalLink,
  Flame,
  Gauge,
  GraduationCap,
  History,
  Newspaper,
  Radio,
  RefreshCw,
  ShieldCheck,
  Snowflake,
  Sparkles,
  ThermometerSun,
  UsersRound
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Stance = "accelerate" | "decelerate" | "watch";
type Tone = "hot" | "cold" | "watch";

type SignalItem = {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  publishedAtKst: string;
  summary: string;
  impact: number;
  confidence: number;
  stance: Stance;
  tags: string[];
  why: string;
};

type Category = {
  key: "major" | "academic" | "papers" | "community";
  label: string;
  description: string;
  score: number;
  delta: number;
  weight: number;
  confidence: number;
  trend: Tone;
  items: SignalItem[];
};

type Axis = {
  key: string;
  label: string;
  value: number;
  delta: number;
  tone: Tone;
};

type Driver = {
  title: string;
  source: string;
  url: string;
  impact: number;
  reason: string;
};

type Snapshot = {
  generatedAt: string;
  generatedAtKst: string;
  nextUpdateAt: string;
  nextUpdateAtKst: string;
  timezone: string;
  updateSlotsKst: string[];
  singularity: {
    definition: string;
    medianDate: string;
    rangeStart: string;
    rangeEnd: string;
    dday: number;
    confidence: number;
    deltaDays: number;
    disclaimer: string;
  };
  season: {
    label: string;
    score: number;
    temperature: number;
    tone: string;
    hotCount: number;
    coldCount: number;
    summary: string;
  };
  axes: Axis[];
  categories: Category[];
  topDrivers: Driver[];
  topDampeners: Driver[];
  methodology: {
    headline: string;
    weights: { key: string; label: string; weight: number }[];
    rules: string[];
    sources: string[];
  };
};

type HistoryPoint = {
  generatedAt: string;
  generatedAtKst: string;
  score: number;
  temperature: number;
  season: string;
  medianDate: string;
  dday: number;
  confidence: number;
};

const categoryIcons = {
  major: Newspaper,
  academic: GraduationCap,
  papers: Sparkles,
  community: UsersRound
} satisfies Record<Category["key"], typeof Newspaper>;

const toneLabels = {
  hot: "가속",
  cold: "감속",
  watch: "관측"
} satisfies Record<Tone, string>;

const stanceLabels = {
  accelerate: "가속",
  decelerate: "감속",
  watch: "관측"
} satisfies Record<Stance, string>;

const baseUrl = import.meta.env.BASE_URL;
const assetUrl = (path: string) => `${baseUrl}${path.replace(/^\//, "")}`;

export default function App() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const stamp = Date.now();
        const [currentResponse, historyResponse] = await Promise.all([
          fetch(`${assetUrl("/data/current.json")}?v=${stamp}`),
          fetch(`${assetUrl("/data/history.json")}?v=${stamp}`)
        ]);
        if (!currentResponse.ok) throw new Error("current.json not found");
        const current = (await currentResponse.json()) as Snapshot;
        const historyData = historyResponse.ok ? ((await historyResponse.json()) as HistoryPoint[]) : [];
        if (isMounted) {
          setSnapshot(current);
          setHistory(historyData);
          setLoadState("ready");
        }
      } catch {
        if (isMounted) setLoadState("error");
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loadState === "loading") {
    return <LoadingScreen label="자체점검 데이터를 불러오는 중" />;
  }

  if (!snapshot || loadState === "error") {
    return <LoadingScreen label="데이터 스냅샷을 찾을 수 없습니다" />;
  }

  return (
    <main className="app-shell">
      <Hero snapshot={snapshot} />
      <MomentumStrip snapshot={snapshot} />
      <section className="section evidence-section" aria-labelledby="evidence-title">
        <div className="section-heading">
          <span className="eyebrow">
            <Radio size={16} />
            6시간 자체점검
          </span>
          <h2 id="evidence-title">왜 앞당겨지거나 늦춰졌나</h2>
          <p>{snapshot.season.summary}</p>
        </div>
        <DriverGrid title="가속 근거" tone="hot" items={snapshot.topDrivers} />
        <DriverGrid title="감속 근거" tone="cold" items={snapshot.topDampeners} />
      </section>
      <section className="section categories-section" aria-labelledby="sections-title">
        <div className="section-heading">
          <span className="eyebrow">
            <Activity size={16} />
            섹션별 신호
          </span>
          <h2 id="sections-title">중요소식, 학계, 논문, 커뮤니티</h2>
        </div>
        <div className="category-grid">
          {snapshot.categories.map((category) => (
            <CategoryPanel key={category.key} category={category} />
          ))}
        </div>
      </section>
      <section className="section telemetry-section" aria-labelledby="telemetry-title">
        <div className="section-heading compact">
          <span className="eyebrow">
            <Gauge size={16} />
            속도계
          </span>
          <h2 id="telemetry-title">모멘텀 축과 최근 기록</h2>
        </div>
        <div className="telemetry-grid">
          <AxisPanel axes={snapshot.axes} />
          <HistoryPanel history={history} />
          <MethodologyPanel snapshot={snapshot} />
        </div>
      </section>
    </main>
  );
}

function Hero({ snapshot }: { snapshot: Snapshot }) {
  const countdown = useCountdown(snapshot.singularity.medianDate);
  const isHot = snapshot.season.label === "여름";
  const SeasonIcon = isHot ? Flame : snapshot.season.label === "겨울" ? Snowflake : ThermometerSun;

  return (
    <section className="hero" aria-labelledby="hero-title">
      <img className="hero-media" src={assetUrl("/assets/singularity-observatory.png")} alt="" />
      <div className="hero-wash" />
      <header className="topbar">
        <div className="brand-mark">
          <Sparkles size={18} />
          <span>Singularity Watch</span>
        </div>
        <div className="update-pill">
          <RefreshCw size={15} />
          <span>{snapshot.nextUpdateAtKst} KST</span>
        </div>
      </header>

      <div className="hero-layout">
        <div className="hero-copy">
          <span className="eyebrow hero-eyebrow">
            <CalendarClock size={16} />
            AI D-Day Countdown
          </span>
          <h1 id="hero-title">특이점은 온다</h1>
          <p className="hero-definition">{snapshot.singularity.definition}</p>
          <div className="hero-badges" aria-label="업데이트 주기">
            {snapshot.updateSlotsKst.map((slot) => (
              <span key={slot}>{slot}</span>
            ))}
          </div>
        </div>

        <div className="countdown-console" aria-label="특이점 카운트다운">
          <div className="console-head">
            <span>D-Day 중앙 추정</span>
            <span className="confidence">
              <ShieldCheck size={14} />
              신뢰도 {snapshot.singularity.confidence}%
            </span>
          </div>
          <div className="dday-line">
            <strong>D-{formatNumber(Math.max(0, snapshot.singularity.dday))}</strong>
            <span>{snapshot.singularity.medianDate}</span>
          </div>
          <div className="time-grid" aria-label="남은 시간">
            <TimeCell label="days" value={countdown.days} />
            <TimeCell label="hours" value={countdown.hours} />
            <TimeCell label="mins" value={countdown.minutes} />
            <TimeCell label="secs" value={countdown.seconds} />
          </div>
          <div className="range-row">
            <span>{snapshot.singularity.rangeStart}</span>
            <span>80% 관측 범위</span>
            <span>{snapshot.singularity.rangeEnd}</span>
          </div>
          <div className={`season-meter ${isHot ? "hot" : snapshot.season.label === "겨울" ? "cold" : "watch"}`}>
            <div>
              <SeasonIcon size={22} />
              <span>{snapshot.season.label}</span>
            </div>
            <strong>{snapshot.season.temperature}°</strong>
            <small>{snapshot.season.tone}</small>
          </div>
        </div>
      </div>

      <div className="hero-footnote">
        <Clock3 size={15} />
        <span>마지막 자체점검 {snapshot.generatedAtKst} KST</span>
        <span>{snapshot.singularity.disclaimer}</span>
      </div>
    </section>
  );
}

function MomentumStrip({ snapshot }: { snapshot: Snapshot }) {
  return (
    <section className="momentum-strip" aria-label="현재 AI 모멘텀">
      <div className="score-block">
        <span>Momentum Index</span>
        <strong>{snapshot.season.score}</strong>
        <small>/100</small>
      </div>
      <div className="delta-block">
        {snapshot.singularity.deltaDays <= 0 ? <ArrowUpRight size={22} /> : <ArrowDownRight size={22} />}
        <div>
          <span>이번 산출 변화</span>
          <strong>
            {snapshot.singularity.deltaDays <= 0 ? "앞당김" : "늦춤"} {Math.abs(snapshot.singularity.deltaDays)}일
          </strong>
        </div>
      </div>
      <div className="heat-bar" aria-label={`가속 온도 ${snapshot.season.score}점`}>
        <span style={{ width: `${snapshot.season.score}%` }} />
      </div>
      <div className="season-counts">
        <span>
          <Flame size={16} />
          {snapshot.season.hotCount}
        </span>
        <span>
          <Snowflake size={16} />
          {snapshot.season.coldCount}
        </span>
      </div>
    </section>
  );
}

function DriverGrid({ title, tone, items }: { title: string; tone: Tone; items: Driver[] }) {
  const Icon = tone === "hot" ? Flame : Snowflake;
  const visibleItems =
    items.length > 0
      ? items
      : [
          {
            title: "아직 큰 신호가 없습니다",
            source: "자체점검",
            url: "",
            impact: 0,
            reason: "이번 슬롯에서는 날짜를 크게 움직일 근거가 부족합니다."
          }
        ];

  return (
    <div className={`driver-lane ${tone}`}>
      <div className="lane-title">
        <Icon size={18} />
        <h3>{title}</h3>
      </div>
      <div className="driver-list">
        {visibleItems.map((item, index) => (
          <a
            className="driver-card"
            href={item.url || undefined}
            target={item.url ? "_blank" : undefined}
            rel="noreferrer"
            key={`${title}-${item.title}-${index}`}
          >
            <span>{item.source}</span>
            <strong>{item.title}</strong>
            <small>{item.reason}</small>
            {item.url && <ExternalLink size={15} />}
          </a>
        ))}
      </div>
    </div>
  );
}

function CategoryPanel({ category }: { category: Category }) {
  const Icon = categoryIcons[category.key];

  return (
    <article className={`category-panel ${category.trend}`}>
      <div className="category-head">
        <div>
          <Icon size={20} />
          <h3>{category.label}</h3>
        </div>
        <span>{toneLabels[category.trend]}</span>
      </div>
      <p>{category.description}</p>
      <div className="mini-meter" aria-label={`${category.label} 점수 ${category.score}점`}>
        <span style={{ width: `${category.score}%` }} />
      </div>
      <div className="category-stats">
        <span>{category.score}점</span>
        <span>{category.delta > 0 ? "+" : ""}{category.delta}</span>
        <span>신뢰 {category.confidence}%</span>
      </div>
      <div className="signal-list">
        {category.items.map((item) => (
          <SignalCard item={item} key={`${category.key}-${item.title}`} />
        ))}
      </div>
    </article>
  );
}

function SignalCard({ item }: { item: SignalItem }) {
  return (
    <a className={`signal-card ${item.stance}`} href={item.url} target="_blank" rel="noreferrer">
      <div className="signal-meta">
        <span>{item.source}</span>
        <span>{item.publishedAtKst}</span>
      </div>
      <strong>{item.title}</strong>
      <p>{item.why}</p>
      <div className="tag-row">
        <span className="stance">{stanceLabels[item.stance]}</span>
        {item.tags.slice(0, 3).map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
    </a>
  );
}

function AxisPanel({ axes }: { axes: Axis[] }) {
  return (
    <article className="telemetry-panel axis-panel">
      <div className="panel-title">
        <ThermometerSun size={18} />
        <h3>가속 축</h3>
      </div>
      <div className="axis-list">
        {axes.map((axis) => (
          <div className="axis-row" key={axis.key}>
            <div>
              <span>{axis.label}</span>
              <strong>{axis.value}</strong>
            </div>
            <div className={`axis-track ${axis.tone}`}>
              <span style={{ width: `${axis.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function HistoryPanel({ history }: { history: HistoryPoint[] }) {
  const recent = useMemo(() => history.slice(-18), [history]);
  const maxScore = Math.max(100, ...recent.map((point) => point.score));
  const latest = recent[recent.length - 1];

  return (
    <article className="telemetry-panel history-panel">
      <div className="panel-title">
        <History size={18} />
        <h3>최근 온도 기록</h3>
      </div>
      <div className="history-bars">
        {recent.length > 0 ? (
          recent.map((point) => (
            <span
              key={point.generatedAt}
              className={point.season === "여름" ? "hot" : point.season === "겨울" ? "cold" : "watch"}
              style={{ height: `${Math.max(10, (point.score / maxScore) * 100)}%` }}
              title={`${point.generatedAtKst}: ${point.score}`}
            />
          ))
        ) : (
          <p>첫 스냅샷을 기록했습니다.</p>
        )}
      </div>
      {latest && (
        <div className="history-caption">
          <span>{latest.season}</span>
          <strong>{latest.medianDate}</strong>
        </div>
      )}
    </article>
  );
}

function MethodologyPanel({ snapshot }: { snapshot: Snapshot }) {
  return (
    <article className="telemetry-panel method-panel">
      <div className="panel-title">
        <ShieldCheck size={18} />
        <h3>산출 기준</h3>
      </div>
      <p>{snapshot.methodology.headline}</p>
      <div className="weight-grid">
        {snapshot.methodology.weights.map((weight) => (
          <div key={weight.key}>
            <span>{weight.label}</span>
            <strong>{weight.weight}%</strong>
          </div>
        ))}
      </div>
      <ul>
        {snapshot.methodology.rules.slice(0, 3).map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
    </article>
  );
}

function TimeCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="time-cell">
      <strong>{String(value).padStart(2, "0")}</strong>
      <span>{label}</span>
    </div>
  );
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <main className="loading-screen">
      <Sparkles size={30} />
      <h1>특이점은 온다</h1>
      <p>{label}</p>
    </main>
  );
}

function useCountdown(dateValue: string) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const target = new Date(`${dateValue}T00:00:00+09:00`).getTime();
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 864e5);
  const hours = Math.floor((diff % 864e5) / 36e5);
  const minutes = Math.floor((diff % 36e5) / 6e4);
  const seconds = Math.floor((diff % 6e4) / 1000);

  return { days, hours, minutes, seconds };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}
