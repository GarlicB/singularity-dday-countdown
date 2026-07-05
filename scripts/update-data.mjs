import { XMLParser } from "fast-xml-parser";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "public", "data");
const now = new Date();
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text"
});

const categoryMeta = {
  major: {
    label: "중요소식",
    description: "공식 발표, 주요 AI 기업, 글로벌 뉴스 흐름",
    weight: 0.34
  },
  academic: {
    label: "학계소식",
    description: "AI 연구기관, 평가기관, 장기 지표",
    weight: 0.18
  },
  papers: {
    label: "논문",
    description: "arXiv 최신 논문과 연구 주제 변화",
    weight: 0.28
  },
  community: {
    label: "커뮤니티반응",
    description: "Hacker News, Reddit 등 공개 커뮤니티 열기",
    weight: 0.2
  }
};

const rssFeeds = [
  { category: "major", source: "OpenAI News", url: "https://openai.com/news/rss.xml", trust: 0.9 },
  { category: "major", source: "Google DeepMind", url: "https://deepmind.google/blog/rss.xml", trust: 0.86 },
  { category: "major", source: "Google AI Blog", url: "https://blog.google/technology/ai/rss/", trust: 0.82 },
  { category: "academic", source: "METR", url: "https://metr.org/blog/rss.xml", trust: 0.84 },
  { category: "academic", source: "SemiAnalysis", url: "https://www.semianalysis.com/feed", trust: 0.68 },
  { category: "academic", source: "Interconnects", url: "https://www.interconnects.ai/feed", trust: 0.62 },
  { category: "academic", source: "Alignment Forum", url: "https://www.alignmentforum.org/feed.xml", trust: 0.58 },
  { category: "community", source: "r/singularity", url: "https://www.reddit.com/r/singularity/top/.rss?t=day", trust: 0.34 },
  { category: "community", source: "r/MachineLearning", url: "https://www.reddit.com/r/MachineLearning/top/.rss?t=day", trust: 0.38 }
];

const accelerators = [
  ["agi", 13, "AGI"],
  ["artificial general intelligence", 13, "AGI"],
  ["superintelligence", 12, "초지능"],
  ["agent", 7, "에이전트"],
  ["autonomous", 7, "자율성"],
  ["ai scientist", 11, "AI 연구 자동화"],
  ["self-improvement", 11, "자기개선"],
  ["reasoning", 7, "추론"],
  ["frontier model", 8, "프런티어 모델"],
  ["chatgpt", 6, "ChatGPT"],
  ["gpt", 7, "GPT"],
  ["gemini", 7, "Gemini"],
  ["claude", 7, "Claude"],
  ["llm", 5, "LLM"],
  ["large language model", 6, "LLM"],
  ["coding agent", 9, "코딩 에이전트"],
  ["model", 3, "모델"],
  ["benchmark", 6, "벤치마크"],
  ["swe-bench", 9, "코딩 성능"],
  ["arc-agi", 9, "추론 벤치마크"],
  ["hle", 7, "고난도 평가"],
  ["multimodal", 6, "멀티모달"],
  ["robotics", 5, "로보틱스"],
  ["open weights", 5, "오픈 모델"],
  ["compute", 5, "컴퓨트"],
  ["inference", 4, "추론 인프라"],
  ["breakthrough", 8, "돌파"],
  ["outperform", 6, "성능 향상"],
  ["state-of-the-art", 7, "SOTA"]
];

const dampeners = [
  ["lawsuit", 7, "소송"],
  ["copyright", 6, "저작권"],
  ["regulation", 7, "규제"],
  ["safety", 5, "안전 이슈"],
  ["attack", 8, "공격/악용"],
  ["attacks", 8, "공격/악용"],
  ["misaligned", 9, "정렬 실패"],
  ["prompt injection", 8, "프롬프트 인젝션"],
  ["vulnerability", 7, "취약점"],
  ["risk", 5, "위험"],
  ["delay", 6, "지연"],
  ["shortage", 6, "공급 병목"],
  ["energy", 5, "전력 병목"],
  ["hallucination", 6, "환각"],
  ["bias", 4, "편향"],
  ["data wall", 8, "데이터 한계"],
  ["plateau", 8, "정체"],
  ["saturation", 7, "포화"],
  ["underperform", 7, "기대 이하"],
  ["not improve", 8, "개선 부족"],
  ["rollback", 7, "후퇴"],
  ["winter", 6, "겨울 신호"]
];

const axes = [
  {
    key: "model",
    label: "신규 모델/벤치마크",
    hot: ["benchmark", "swe-bench", "arc-agi", "state-of-the-art", "frontier model", "reasoning", "outperform"],
    cold: ["plateau", "saturation", "underperform", "not improve"]
  },
  {
    key: "research",
    label: "AI 연구 자동화",
    hot: ["ai scientist", "agent", "autonomous", "self-improvement", "research"],
    cold: ["safety", "hallucination", "rollback"]
  },
  {
    key: "infra",
    label: "컴퓨트/인프라",
    hot: ["compute", "inference", "chip", "datacenter", "gpu"],
    cold: ["shortage", "energy", "delay"]
  },
  {
    key: "adoption",
    label: "실사용/산업 도입",
    hot: ["enterprise", "product", "deployment", "customer", "developer"],
    cold: ["lawsuit", "copyright", "regulation"]
  },
  {
    key: "hype",
    label: "커뮤니티 열기",
    hot: ["agi", "breakthrough", "superintelligence", "agent"],
    cold: ["winter", "hype", "plateau", "underperform"]
  }
];

const fallbackItems = [
  {
    category: "major",
    source: "시스템 자체점검",
    title: "공개 피드 수집 대기 중: 중요소식은 다음 6시간 슬롯에서 다시 확인합니다",
    url: "https://openai.com/news/",
    publishedAt: now.toISOString(),
    summary: "외부 피드 응답이 부족할 때는 예측을 크게 움직이지 않고 보수적으로 유지합니다.",
    trust: 0.45
  },
  {
    category: "academic",
    source: "시스템 자체점검",
    title: "학계 지표는 단기 뉴스보다 느리게 반영합니다",
    url: "https://epoch.ai/data/ai-models",
    publishedAt: now.toISOString(),
    summary: "장기 추세는 모델 성능, 컴퓨트, 평가 방식의 누적 변화를 중심으로 봅니다.",
    trust: 0.5
  },
  {
    category: "papers",
    source: "arXiv 점검",
    title: "최신 논문 수집이 비어 있으면 이전 스냅샷과 보수 점수를 우선합니다",
    url: "https://arxiv.org/list/cs.AI/recent",
    publishedAt: now.toISOString(),
    summary: "논문 수 자체보다 에이전트, 추론, 자동 연구, 벤치마크 변화 키워드를 가중합니다.",
    trust: 0.58
  },
  {
    category: "community",
    source: "커뮤니티 점검",
    title: "커뮤니티 열기는 날짜를 직접 움직이지 않고 온도 보조 신호로만 반영합니다",
    url: "https://news.ycombinator.com/",
    publishedAt: now.toISOString(),
    summary: "밈, 루머, 반복 인용을 피하기 위해 커뮤니티 신호의 가중치는 낮게 유지합니다.",
    trust: 0.32
  }
];

await mkdir(dataDir, { recursive: true });

const collected = [
  ...(await collectRssFeeds()),
  ...(await collectArxiv()),
  ...(await collectHackerNews()),
  ...(await collectGdelt())
];

const deduped = dedupe(collected).filter((item) => item.title.length > 8);
const enriched = deduped
  .map(enrichItem)
  .filter((item) => {
    if (item.category === "community") {
      return item.relevance >= 9 && item.signalScore >= 5;
    }
    return item.relevance >= 7 || (item.trust >= 0.58 && item.ageHours <= 24 * 21 && item.signalScore >= 3);
  });
const items = ensureCategoryCoverage(enriched);
const categories = buildCategories(items);
const aggregate = buildAggregate(categories, items);
const current = buildSnapshot(categories, aggregate, items);
const history = await buildHistory(current);

await writeFile(path.join(dataDir, "current.json"), `${JSON.stringify(current, null, 2)}\n`);
await writeFile(path.join(dataDir, "history.json"), `${JSON.stringify(history, null, 2)}\n`);

console.log(`Generated ${items.length} signal items at ${current.generatedAtKst}`);
console.log(`Momentum ${current.season.score}/100, median ${current.singularity.medianDate}`);

async function collectRssFeeds() {
  const settled = await Promise.allSettled(
    rssFeeds.map(async (feed) => {
      const text = await fetchText(feed.url);
      return parseFeed(text, feed);
    })
  );

  return settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}

async function collectArxiv() {
  const query = [
    "cat:cs.AI",
    "OR",
    "cat:cs.CL",
    "OR",
    "cat:cs.LG",
    "OR",
    "cat:stat.ML"
  ].join("+");
  const url = `https://export.arxiv.org/api/query?search_query=${query}&sortBy=submittedDate&sortOrder=descending&max_results=40`;

  try {
    const text = await fetchText(url, 14000);
    const parsed = parser.parse(text);
    const entries = asArray(parsed?.feed?.entry);
    return entries.map((entry) => ({
      category: "papers",
      source: "arXiv",
      title: normalizeText(readText(entry?.title)),
      url: readHref(entry?.id) || "https://arxiv.org/list/cs.AI/recent",
      publishedAt: normalizeDate(entry?.published || entry?.updated),
      summary: normalizeText(readText(entry?.summary)),
      trust: 0.72
    }));
  } catch {
    return [];
  }
}

async function collectHackerNews() {
  const queries = ["AI agent benchmark", "AGI", "large language model", "AI coding model"];
  const settled = await Promise.allSettled(
    queries.map(async (query) => {
      const url = `https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=12&query=${encodeURIComponent(query)}`;
      const data = await fetchJson(url);
      return asArray(data?.hits).map((hit) => ({
        category: "community",
        source: "Hacker News",
        title: normalizeText(hit.title || hit.story_title || ""),
        url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
        publishedAt: normalizeDate(hit.created_at),
        summary: `${hit.points || 0} points, ${hit.num_comments || 0} comments`,
        trust: 0.42,
        engagement: Math.min(1, ((hit.points || 0) + (hit.num_comments || 0) * 2) / 500)
      }));
    })
  );

  return settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}

async function collectGdelt() {
  const q = '"artificial intelligence" OR "AI model" OR "AGI" OR "large language model" OR "AI agents"';
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(q)}&mode=ArtList&format=json&maxrecords=30&sort=HybridRel&timespan=6h`;

  try {
    await sleep(5200);
    const data = await fetchJson(url, 12000);
    return asArray(data?.articles).map((article) => ({
      category: "major",
      source: article.sourceCommonName || article.domain || "GDELT",
      title: normalizeText(article.title || ""),
      url: article.url,
      publishedAt: normalizeDate(article.seendate),
      summary: normalizeText(article.socialimage ? "GDELT global news signal" : "Global news signal"),
      trust: 0.56
    }));
  } catch {
    return [];
  }
}

function parseFeed(xml, feed) {
  const parsed = parser.parse(xml);
  const rssItems = asArray(parsed?.rss?.channel?.item);
  const atomItems = asArray(parsed?.feed?.entry);
  const entries = rssItems.length > 0 ? rssItems : atomItems;

  return entries.slice(0, 15).map((entry) => ({
    category: feed.category,
    source: feed.source,
    title: normalizeText(readText(entry?.title)),
    url: readHref(entry?.link) || readHref(entry?.id) || feed.url,
    publishedAt: normalizeDate(entry?.pubDate || entry?.published || entry?.updated),
    summary: normalizeText(readText(entry?.description || entry?.summary || entry?.content)),
    trust: feed.trust
  }));
}

async function fetchText(url, timeoutMs = 10000) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Singularity-D-Day/0.1 (+https://github.com/GarlicB/singularity-dday-countdown)",
      Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, text/plain"
    },
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.text();
}

async function fetchJson(url, timeoutMs = 10000) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Singularity-D-Day/0.1 (+https://github.com/GarlicB/singularity-dday-countdown)",
      Accept: "application/json"
    },
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
}

function enrichItem(item) {
  const text = `${item.title} ${item.summary}`.toLowerCase();
  const hotMatches = accelerators.filter(([keyword]) => text.includes(keyword));
  const coldMatches = dampeners.filter(([keyword]) => text.includes(keyword));
  const hotScore = hotMatches.reduce((sum, [, weight]) => sum + weight, 0);
  const coldScore = coldMatches.reduce((sum, [, weight]) => sum + weight, 0);
  const ageHours = Math.max(0, (now.getTime() - new Date(item.publishedAt).getTime()) / 36e5);
  const recency = Math.max(0.18, 1 - Math.min(ageHours, 96) / 120);
  const categoryBase = { major: 11, academic: 10, papers: 9, community: 7 }[item.category] || 7;
  const recencyFloor = { major: 0.42, academic: 0.38, papers: 0.28, community: 0.18 }[item.category] || 0.18;
  const engagementBoost = Math.round((item.engagement || 0) * 8);
  const adjustedRecency = Math.max(recencyFloor, recency);
  const relevance = Math.round((categoryBase + hotScore + coldScore * 0.65 + engagementBoost) * adjustedRecency);
  const netSignal = hotScore - coldScore * 0.9;
  const impact = clamp(Math.round(netSignal * recency + categoryBase * item.trust + engagementBoost), -20, 36);
  const confidence = clamp(Math.round(item.trust * 100 + Math.min(relevance, 30) * 0.8), 20, 92);
  const stance =
    coldScore >= 8 && coldScore >= hotScore * 0.58
      ? "decelerate"
      : impact >= 12
        ? "accelerate"
        : impact <= 2 && coldScore > 0
          ? "decelerate"
          : "watch";
  const tags = unique([...hotMatches.map(([, , tag]) => tag), ...coldMatches.map(([, , tag]) => tag)]).slice(0, 4);

  return {
    ...item,
    publishedAt: item.publishedAt,
    ageHours,
    signalScore: hotScore + coldScore,
    relevance,
    impact,
    confidence,
    stance,
    tags,
    why: buildWhy({ hotMatches, coldMatches, stance, item })
  };
}

function buildWhy({ hotMatches, coldMatches, stance, item }) {
  const hotTags = hotMatches.map(([, , tag]) => tag).slice(0, 2);
  const coldTags = coldMatches.map(([, , tag]) => tag).slice(0, 2);
  if (stance === "accelerate" && hotTags.length) {
    return `${hotTags.join(", ")} 신호가 감지되어 온도를 끌어올렸습니다.`;
  }
  if (stance === "decelerate" && coldTags.length) {
    return `${coldTags.join(", ")} 이슈가 있어 감속 신호로 분류했습니다.`;
  }
  if (item.category === "community") {
    return "커뮤니티 관심도는 보조 지표로만 반영했습니다.";
  }
  return "큰 날짜 변동보다는 관측 로그에 반영할 신호입니다.";
}

function buildCategories(items) {
  return Object.entries(categoryMeta).map(([key, meta]) => {
    const sectionItems = items
      .filter((item) => item.category === key)
      .sort((a, b) => Math.abs(b.impact) + b.confidence / 100 - (Math.abs(a.impact) + a.confidence / 100))
      .slice(0, 5);
    const hot = sectionItems.filter((item) => item.stance === "accelerate").length;
    const cold = sectionItems.filter((item) => item.stance === "decelerate").length;
    const avgImpact = average(sectionItems.map((item) => item.impact));
    const avgConfidence = average(sectionItems.map((item) => item.confidence));
    const score = clamp(Math.round(48 + avgImpact + hot * 2 - cold * 4), 0, 100);
    const delta = clamp(Math.round((score - 50) / 4), -12, 12);

    return {
      key,
      label: meta.label,
      description: meta.description,
      score,
      delta,
      weight: meta.weight,
      confidence: Math.round(avgConfidence || 38),
      trend: score >= 58 ? "hot" : score <= 42 ? "cold" : "watch",
      items: sectionItems.map(projectPublicItem)
    };
  });
}

function buildAggregate(categories, items) {
  const score = clamp(
    Math.round(categories.reduce((sum, category) => sum + category.score * category.weight, 0)),
    0,
    100
  );
  const confidence = clamp(
    Math.round(categories.reduce((sum, category) => sum + category.confidence * category.weight, 0)),
    25,
    76
  );
  const hotCount = items.filter((item) => item.stance === "accelerate").length;
  const coldCount = items.filter((item) => item.stance === "decelerate").length;
  const volatility = clamp(Math.round(Math.abs(hotCount - coldCount) + standardDeviation(categories.map((c) => c.score)) / 3), 0, 30);
  const axisScores = axes.map((axis) => scoreAxis(axis, items));

  return { score, confidence, volatility, axisScores, hotCount, coldCount };
}

function buildSnapshot(categories, aggregate, items) {
  const baseDate = Date.UTC(2036, 0, 1);
  const shiftDays = Math.round((aggregate.score - 50) * -45);
  const median = new Date(baseDate + shiftDays * 864e5);
  const uncertaintyDays = clamp(Math.round(3000 - aggregate.confidence * 20 + aggregate.volatility * 35), 1200, 4300);
  const minRangeStart = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1));
  const rangeStart = new Date(Math.max(median.getTime() - uncertaintyDays * 864e5, minRangeStart.getTime()));
  const rangeEnd = new Date(median.getTime() + uncertaintyDays * 864e5);
  const dday = Math.ceil((median.getTime() - now.getTime()) / 864e5);
  const nextUpdate = nextKstUpdate(now);
  const temperature = Math.round(-12 + aggregate.score * 0.86);
  const seasonLabel = aggregate.score >= 58 ? "여름" : aggregate.score <= 42 ? "겨울" : "간절기";
  const seasonTone =
    seasonLabel === "여름"
      ? "가속 신호가 더 뜨겁습니다"
      : seasonLabel === "겨울"
        ? "감속 신호가 공기를 식힙니다"
        : "뜨거운 신호와 찬 신호가 맞서는 중입니다";
  const topDrivers = items
    .filter((item) => item.stance === "accelerate")
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3)
    .map((item) => ({
      title: item.title,
      source: item.source,
      url: item.url,
      impact: item.impact,
      reason: item.why
    }));
  const topDampeners = items
    .filter((item) => item.stance === "decelerate")
    .sort((a, b) => a.impact - b.impact)
    .slice(0, 3)
    .map((item) => ({
      title: item.title,
      source: item.source,
      url: item.url,
      impact: item.impact,
      reason: item.why
    }));

  return {
    generatedAt: now.toISOString(),
    generatedAtKst: formatKst(now),
    nextUpdateAt: nextUpdate.toISOString(),
    nextUpdateAtKst: formatKst(nextUpdate),
    timezone: "Asia/Seoul",
    updateSlotsKst: ["06:00", "12:00", "18:00", "24:00"],
    singularity: {
      definition: "AI가 AI 연구와 소프트웨어 생산의 상당 부분을 자율적으로 가속하는 변곡점",
      medianDate: dateOnly(median),
      rangeStart: dateOnly(rangeStart),
      rangeEnd: dateOnly(rangeEnd),
      dday,
      confidence: aggregate.confidence,
      deltaDays: Math.round((aggregate.score - 50) * -1.5),
      disclaimer: "실험적 모멘텀 지표입니다. 실제 예언이나 투자 판단 근거가 아닙니다."
    },
    season: {
      label: seasonLabel,
      score: aggregate.score,
      temperature,
      tone: seasonTone,
      hotCount: aggregate.hotCount,
      coldCount: aggregate.coldCount,
      summary: buildSeasonSummary(seasonLabel, aggregate)
    },
    axes: aggregate.axisScores,
    categories,
    topDrivers,
    topDampeners,
    methodology: {
      headline: "D-Day는 후킹 장치, 신뢰는 근거 로그에서 만듭니다.",
      weights: Object.entries(categoryMeta).map(([key, meta]) => ({
        key,
        label: meta.label,
        weight: Math.round(meta.weight * 100)
      })),
      rules: [
        "공식 발표와 논문은 높은 신뢰도, 커뮤니티 반응은 낮은 신뢰도로 반영합니다.",
        "뉴스나 커뮤니티 단독 신호만으로는 날짜를 크게 움직이지 않습니다.",
        "감속 신호가 있으면 AI 겨울 쪽으로 온도를 낮추고 변경 사유를 남깁니다.",
        "6시간마다 수집하지만 특이점 날짜는 보수적으로 움직입니다."
      ],
      sources: [
        "OpenAI, Google DeepMind, Google AI 공개 피드와 GDELT 글로벌 뉴스",
        "METR, SemiAnalysis, Interconnects, Alignment Forum 등 평가/분석 피드",
        "arXiv cs.AI/cs.CL/cs.LG/stat.ML 최신 논문",
        "Hacker News, Reddit 공개 피드, GDELT 글로벌 뉴스"
      ]
    }
  };
}

function scoreAxis(axis, items) {
  let hot = 0;
  let cold = 0;
  for (const item of items) {
    const text = `${item.title} ${item.summary}`.toLowerCase();
    hot += axis.hot.filter((keyword) => text.includes(keyword)).length;
    cold += axis.cold.filter((keyword) => text.includes(keyword)).length;
  }
  const value = clamp(Math.round(46 + Math.min(hot, 12) * 4 - Math.min(cold, 8) * 6), 0, 100);
  return {
    key: axis.key,
    label: axis.label,
    value,
    delta: clamp(Math.round((value - 50) / 5), -10, 10),
    tone: value >= 58 ? "hot" : value <= 42 ? "cold" : "watch"
  };
}

async function buildHistory(current) {
  const historyPath = path.join(dataDir, "history.json");
  let previous = [];
  try {
    previous = JSON.parse(await readFile(historyPath, "utf8"));
  } catch {
    previous = [];
  }

  const entry = {
    generatedAt: current.generatedAt,
    generatedAtKst: current.generatedAtKst,
    score: current.season.score,
    temperature: current.season.temperature,
    season: current.season.label,
    medianDate: current.singularity.medianDate,
    dday: current.singularity.dday,
    confidence: current.singularity.confidence
  };

  return [...previous.filter((item) => item.generatedAt !== entry.generatedAt), entry].slice(-60);
}

function ensureCategoryCoverage(items) {
  const byCategory = new Set(items.map((item) => item.category));
  const needed = fallbackItems.filter((item) => !byCategory.has(item.category)).map(enrichItem);
  return [...items, ...needed];
}

function projectPublicItem(item) {
  return {
    title: item.title,
    source: item.source,
    url: item.url,
    publishedAt: item.publishedAt,
    publishedAtKst: formatKst(new Date(item.publishedAt)),
    summary: item.summary.slice(0, 220),
    impact: item.impact,
    confidence: item.confidence,
    stance: item.stance,
    tags: item.tags,
    why: item.why
  };
}

function buildSeasonSummary(label, aggregate) {
  if (label === "여름") {
    return `가속 신호 ${aggregate.hotCount}건이 우세합니다. 새 모델, 에이전트, 연구 자동화 키워드가 온도를 올렸습니다.`;
  }
  if (label === "겨울") {
    return `감속 신호 ${aggregate.coldCount}건이 눈에 띕니다. 규제, 성능 정체, 인프라 병목을 더 보수적으로 반영했습니다.`;
  }
  return `가속 ${aggregate.hotCount}건과 감속 ${aggregate.coldCount}건이 섞여 있습니다. 날짜는 크게 흔들지 않고 관측을 이어갑니다.`;
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = normalizeText(item.title).toLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu, " ").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function readHref(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const alternate = value.find((item) => item?.["@_rel"] === "alternate") || value[0];
    return readHref(alternate);
  }
  return value["@_href"] || value.href || value["#text"] || "";
}

function readText(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value["#text"] === "string") return value["#text"];
  if (Array.isArray(value)) return value.map(readText).join(" ");
  return "";
}

function normalizeText(value) {
  return stripHtml(String(value || ""))
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

function normalizeDate(value) {
  const parsed = new Date(value || now);
  if (Number.isNaN(parsed.getTime())) return now.toISOString();
  return parsed.toISOString();
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function average(values) {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (!filtered.length) return 0;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function standardDeviation(values) {
  const avg = average(values);
  const variance = average(values.map((value) => (value - avg) ** 2));
  return Math.sqrt(variance);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function formatKst(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function nextKstUpdate(date) {
  const kstOffset = 9 * 60 * 60 * 1000;
  const kst = new Date(date.getTime() + kstOffset);
  const year = kst.getUTCFullYear();
  const month = kst.getUTCMonth();
  const day = kst.getUTCDate();
  const hour = kst.getUTCHours();
  const slots = [0, 6, 12, 18];
  const nextHour = slots.find((slot) => slot > hour);

  if (nextHour !== undefined) {
    return new Date(Date.UTC(year, month, day, nextHour, 0, 0) - kstOffset);
  }
  return new Date(Date.UTC(year, month, day + 1, 0, 0, 0) - kstOffset);
}
