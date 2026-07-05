# 특이점은 온다

AI 특이점 D-Day를 카운트다운처럼 보여주는 한 페이지 대시보드입니다. 단일 예언 날짜가 아니라 공개 신호를 점수화한 `AI Momentum Index`로 설계했습니다.

## 업데이트 주기

GitHub Actions가 KST 기준 하루 4회 실행됩니다.

- 06:00
- 12:00
- 18:00
- 24:00

각 실행은 `scripts/update-data.mjs`를 돌려 `public/data/current.json`과 `public/data/history.json`을 갱신한 뒤 GitHub Pages로 배포합니다.

## 산출 신호

- 중요소식: OpenAI, Google DeepMind, Google AI, GDELT 글로벌 뉴스
- 학계소식: METR, SemiAnalysis, Interconnects, Alignment Forum
- 논문: arXiv `cs.AI`, `cs.CL`, `cs.LG`, `stat.ML`
- 커뮤니티반응: Hacker News, Reddit 공개 피드

커뮤니티 반응은 과열을 잘 보여주지만 신뢰도는 낮게 반영합니다. 뉴스나 커뮤니티 단독 신호만으로 날짜가 크게 움직이지 않도록 보수 계수를 둡니다.

## 로컬 실행

```bash
npm install
npm run update:data
npm run dev
```

빌드 검증:

```bash
npm run typecheck
npm run build
```

## Claude CLI 검토

요청에 따라 Claude Code CLI 오케스트레이션 검토를 시도했습니다. `npx @anthropic-ai/claude-code`는 실행됐지만 현재 환경에 Claude 로그인이 없어 `Not logged in · Please run /login`에서 중단됐습니다. 대신 Codex 서브에이전트 2개로 제품/콘텐츠 관점과 기술/운영 관점 검토를 병행했고, 그 결과를 방법론과 UI에 반영했습니다.
