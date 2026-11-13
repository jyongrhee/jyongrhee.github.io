# jyongrhee.github.io

이재용(Jaeyong Rhee) 개인 홈페이지. 내용은 `content/`의 JSON 파일에만 있고, GitHub Actions가 매번 사이트를 새로 만들어 GitHub Pages에 올립니다.

© 2026 Jaeyong Rhee. All rights reserved. (폰트 SUIT·Geist Mono는 SIL Open Font License, `hull/fonts/`에 라이선스 포함)

---

## 처음 한 번: GitHub 설정

1. GitHub에서 **`jyongrhee.github.io`** 이름으로 **Public** 저장소를 만든다.
2. 이 폴더의 파일을 전부 올린다. (`node_modules`, `_site`, `.cache` 폴더는 올리지 않는다)
3. 저장소 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 바꾼다.
4. **Actions** 탭에서 "Build and publish"가 초록색으로 끝나면 <https://jyongrhee.github.io> 에 열린다. (1~2분)

## 내용 고치기

가장 쉬운 방법은 Claude Code에 말하는 것이다. 예: "KSME 2027 우수논문상 추가해줘, 상장 사진은 이거야". 규칙은 `CLAUDE.md`에 있다.

직접 고칠 때는 GitHub에서 `content/` 안의 파일을 열어 연필 아이콘으로 수정하고 Commit 하면 된다.

| 무엇 | 파일 |
|---|---|
| 이름, 소속, 소개 문장, 링크, 학력, 히어로 사진 정보 | `content/profile.json` |
| 연구 (하나당 페이지 하나) | `content/research.json` |
| 논문·발표 | `content/publications.json` |
| 수상·장학 | `content/honors.json` |
| 활동·자격 | `content/activities.json` |
| 소식 | `content/news.json` |
| 참여 과제 | `content/projects.json` |

- 글은 항상 `{ "en": "영어", "ko": "한국어" }` 두 개를 같이 쓴다.
- 날짜는 `2027` 또는 `2027-05`.
- **상장·장학·활동·자격증·소식 사진은 비공개 리포지토리 `jyongrhee/photos`에 보관한다.** 홈페이지 리포지토리(공개)에는 넣지 않는다. 지운 사진이 공개 기록에 남지 않게 하려는 것이다.
  - 가장 쉬운 방법: 스캔한 사진을 Claude에게 보내기. 정보 삭제, 확인표, 올리기, 반영까지 해 준다.
  - 직접 넣을 때: photos의 `honors/`·`scholarships/`·`activities/`·`certificates/`·`news/`에 **항목 `id`와 같은 이름**으로 넣는다. 예: `honors/2026-07-best-thesis.jpg`. 여러 장을 한꺼번에 맡길 때는 `inbox/`에 올리고 Claude에게 "inbox 정리해줘"라고 한다.
  - 사진만 바꿨을 때(글은 그대로): Actions → Build and publish → **Run workflow**를 누르면 반영된다.
  - 학번·생년월일·증서번호·장학금 액수는 가리고 올린다. 촬영 정보와 GPS는 배포할 때 다시 한 번 지워진다.
  - 자세한 내용은 `docs/photos-plan.md`.
- 연구 그림은 `media/research/`에 넣고 경로를 적는다. 예: `"figure": { "src": "media/research/2027-05-fig1.jpg" }`. 공개 기록에 영원히 남으니 1MB 아래로 줄이고 촬영 정보를 지운 뒤 넣는다. 위치정보(GPS)가 남은 사진은 검사에서 배포를 막는다.
- 히어로 사진은 `media/hero.jpg`, 프로필 사진은 `media/profile.jpg`(세로 3:4)로 넣으면 된다.

### 2027년 3월 입학 후

`content/profile.json`에서 한 줄만 바꾼다.

```json
"marks": "kaist"
```

상단 바가 [부경대 | 해양공학과] → [KAIST | BSL]로 바뀌고, 학력 KAIST 줄에 연구실이 표시된다. 로고는 `media/brand/`에 이미 들어 있다.

### 히어로 사진 3D 효과

사진을 바꾼 뒤 깊이 지도(`media/hero-depth.png`)를 만들고 `profile.json`의 `"hero": { "depth": true }`로 켠다. 깊이 지도는 Claude Code에 "히어로 사진 깊이 지도 만들어줘"라고 하면 된다.

## 자동으로 일어나는 일 (push 할 때마다)

1. **검사**: JSON 형식 오류, 빠진 항목, 없는 사진, 서로 연결이 끊긴 항목, 전화번호·학번·생년월일 같은 개인정보가 있으면 배포를 멈춘다.
2. **사진 처리**: AVIF·WebP·JPEG 여러 크기로 변환, 촬영 정보와 위치정보 삭제.
3. **페이지 생성**: 영어(`/`)와 한국어(`/ko/`), 연구마다 개별 페이지(`/research/<id>/`).
4. **자동 생성물**: 카카오톡·링크드인 공유 미리보기 이미지, CV PDF(영·한), 검색 색인, 사이트맵, RSS, 구글용 구조화 데이터, 전체 BibTeX.
5. **폰트 최적화**: 사이트에 실제로 쓰인 글자만 남겨 한글 폰트를 667 KB → 약 100 KB로 줄인다.
6. **측정**: Lighthouse로 성능·접근성·SEO를 재서 푸터에 실제 점수를 표시한다.
7. **매일 새벽 3시 17분**: 다시 빌드해서 논문 피인용 수(DOI가 있는 경우)를 갱신하고 외부 링크가 살아 있는지 확인한다.
8. **매시간**: 6시간이 지난 PR 미리보기를 지운다. 지울 것이 없으면 배포하지 않는다.

Actions가 빨간색이면 로그의 `✗` 줄에 무엇을 고쳐야 하는지 적혀 있다.

## PR 미리보기

같은 저장소 안의 브랜치로 PR을 열면(초안 포함) 합치기 전 모습을 실제 주소에서 볼 수 있다.

- **링크 위치**: PR을 열고 1~3분 뒤 PR에 봇 댓글로 `https://jyongrhee.github.io/preview/pr-<번호>/` 링크가 달린다. 페이지 맨 위에 "미리보기 · PR #번호" 줄이 보이면 미리보기다.
- **다시 올리면**: 새 커밋을 push하면 미리보기가 다시 만들어지고, 댓글은 새로 달리지 않고 같은 댓글이 고쳐진다.
- **6시간 만료**: 만든 지 6시간이 지나면 지워진다(매시간 확인하므로 최대 약 7시간). 댓글에 지워지는 시각이 적혀 있다.
- **다시 보기**: 지워진 뒤 다시 보려면 저장소 주인이 PR에 `/preview`라고 댓글을 단다. 다시 만들어지고 6시간이 새로 시작된다.
- **닫으면 삭제**: PR을 합치거나 닫으면 다음 배포에서 바로 지워진다.
- **실패하면**: 미리보기 빌드가 실패해도 실제 사이트와 다른 미리보기는 그대로 올라간다. PR 댓글에 실패 사실과 로그 링크가 달린다.
- 미리보기는 검색엔진에 노출되지 않고(noindex, robots.txt), 공유 이미지·CV PDF·Lighthouse 점수는 만들지 않는다.
- 다른 사람이 포크해서 보낸 PR은 안전을 위해 미리보기를 만들지 않는다. (검사만 한다)
- 이 기능이 생기기 전에 만든 브랜치는 main을 한 번 합쳐야 미리보기가 만들어진다.

## 내 컴퓨터에서 미리보기

`local-view.cmd`를 더블클릭하면 사이트를 만들고 <http://localhost:5321> 을 연다. Node.js(LTS)가 필요하다. 없으면 창에 설치 방법이 나온다. 끄려면 창에서 Ctrl+C.

터미널에서는:

```bash
npm install
npm run check    # 내용 검사만
npm run build    # _site/ 만들기
npm run serve    # http://localhost:5321
npm run audit    # Lighthouse 점수
```

## 사이트 기능

- ⌘K / Ctrl K / `/` : 검색과 명령 (한글 초성 검색 지원: `ㅂㅅㅅ` → 빈산소수괴)
- `G` 다음 `E R H A N C` : 학력·연구·수상·활동·소식·연락으로 이동
- `T` 테마, `L` 언어, `?` 단축키 목록, 연구 페이지에서 `←` `→` 이전·다음 연구
- 연구 카드를 누르면 카드가 그대로 커지며 연구 페이지로 넘어간다 (지원 브라우저)
- 링크에 마우스를 올리면 다음 페이지를 미리 준비해 바로 열린다
- 홈 화면에 앱처럼 설치 가능, 한 번 본 페이지는 오프라인에서도 열린다

## 폴더

```
content/   내용 (JSON)            ← 여기만 고치면 된다
media/     사진·그림 원본, brand/ 로고
engine/    빌드 (Node.js)
hull/      스타일, 스크립트, 폰트
.github/   자동 빌드·배포 설정
```
