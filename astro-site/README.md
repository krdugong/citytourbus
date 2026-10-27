# CITYTOURBUS 정적 사이트

Astro, Tailwind CSS, `@astrojs/sitemap`으로 만든 도시별 시티투어버스 비교 사이트입니다. `data/citybus.csv`에는 기존 CITYTOURBUS 운영 저장소의 도시 가이드와 비교 화면에서 옮긴 실제 도시 6개·상품 10개·FAQ 16개가 있습니다. 실제 상품 가격은 공식 출처의 수집 성공 기록이 있는 경우에만 표시합니다.

## 데이터 갱신

1. 탭 하나의 XLSX 원본에서 `row_type=city|product|faq` 행을 관리합니다. 컬럼은 `data/citybus.csv` 헤더와 일치시킵니다.
2. UTF-8 CSV로 내보내 `data/citybus.csv`를 덮어씁니다. 도시별 파일로 나누지 않습니다.
3. `city_slug`를 확정합니다. 기존 도시의 슬러그를 바꾸면 URL도 바뀝니다.
4. 이미지 원본을 `public/images/source/`에 넣고 CSV 파일명과 맞춥니다. `hero_image_alt`와 `image_alt`를 입력합니다.
5. `npm run validate`를 실행합니다. 오류는 CSV 행 번호와 함께 출력되고 빌드를 중단합니다. `verified_at`이 30일을 넘으면 경고, 90일 이상이면 강화된 경고가 나옵니다.
6. `npm run images`로 이미지 원본을 WebP로 변환합니다. 출력은 `public/images/optimized/`입니다.
7. `npm run dev`로 로컬 화면을 보고 `npm run build`로 `dist/` 정적 파일을 만듭니다. 빌드는 검증과 이미지 처리를 먼저 실행합니다.

`booking_link`에는 기존 비교 화면의 제휴 URL을 원문 그대로 저장하고 예약 버튼에 씁니다. `source`와 `official_site`에는 공식 정보 출처를 분리해 둡니다. 모든 예약 버튼에는 `rel="sponsored nofollow noopener"`를 적용합니다. 제휴 파라미터를 재작성하지 않습니다. 가격, 노선, 정류장, 운행시간의 빈 값은 채우지 않습니다. 비교표에서는 빈 값 대신 `확인 필요`를 보여줍니다.

## 환경변수

`.env.example`을 참고하세요. `SITE_URL`은 실제 공개 도메인으로 지정합니다. 하위 경로에 배포할 때만 `BASE_PATH`를 설정합니다. 검색엔진 인증값은 `PUBLIC_NAVER_SITE_VERIFICATION`, `PUBLIC_GOOGLE_SITE_VERIFICATION`에 넣습니다. `SITE_URL`이 틀리면 canonical, sitemap, RSS의 URL도 틀리므로 배포 전에 확인하세요.

## Cloudflare Pages 배포

Git 저장소를 Pages에 연결하고 빌드 명령을 `npm run build`, 출력 디렉터리를 `dist`, Node 버전을 22 이상으로 지정합니다. 환경변수에 실제 `SITE_URL`과 검색엔진 인증값을 추가합니다. 사용자 도메인을 Pages 프로젝트에 연결한 뒤 `sitemap-index.xml`, `robots.txt`, 도시 URL을 확인합니다. 기존 운영 사이트는 현재 Vercel에 배포되어 있습니다. Cloudflare Pages로 도메인을 이전할 경우 기존 비교 화면과 경로 확인 기능을 함께 이전한 뒤 DNS를 전환하세요.

## 매일 재빌드

Cloudflare Pages 프로젝트의 Settings → Builds에서 Deploy Hook을 만들고 안전하게 보관합니다. Cloudflare Worker 또는 신뢰할 수 있는 스케줄러에 하루 1회 CRON을 설정하여 훅 URL로 POST를 보냅니다. 훅 URL은 비밀값으로 저장하고 코드나 CSV에 넣지 않습니다. 재빌드는 CSV를 자동 갱신하지 않으며 저장소의 현재 데이터를 다시 빌드합니다.

## 검색엔진 등록

배포 후 네이버 서치어드바이저와 Google Search Console에 사이트를 등록합니다. 각 서비스에서 받은 인증값을 Pages 환경변수에 저장하고 재배포합니다. 인증이 확인되면 `https://도메인/sitemap-index.xml`을 제출합니다. `robots.txt`가 같은 사이트맵을 가리키는지 확인하세요. 검색 노출과 색인은 검색엔진이 결정하므로 배포 자체가 노출을 보장하지 않습니다.

## 가이드

`src/content/guide/*.md`를 추가하면 가이드 목록, 상세 페이지, RSS, sitemap에 포함됩니다. 실제 근거 없는 상품 추천이나 운영 정보는 넣지 마세요.

## 검증

`npm run check:output`은 빌드 결과의 도시 URL, canonical, sitemap, JSON-LD FAQ, H1, 이미지 속성, 예약 링크 속성 등을 확인합니다. 공개 검색엔진이 사이트맵을 읽는지 확인하려면 실제 배포 후 각 서치 도구에서 확인해야 합니다.

## 실데이터 범위와 기존 사이트

현재 도시 상세 페이지는 파리, 런던, 로마, 바르셀로나, 뉴욕, 도쿄 6개입니다. 기존 운영 저장소의 다른 도시와 기능은 삭제하지 않았습니다. 기존 가격 수집 파일에서 성공 기록이 없는 상품은 가격과 검증일을 비워 둡니다. 도쿄의 예약 버튼은 기존 GetYourGuide 제휴 카테고리 목록으로 연결하며 특정 하토버스 상품을 보증하지 않습니다.
