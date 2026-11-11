# 🎉 우리들의 디지털 롤링페이퍼 (Digital Rolling Paper)

누구나 자유롭게 접속하여 축하와 응원의 메시지를 남길 수 있는 공개 디지털 롤링페이퍼 웹 서비스입니다.  
**HTML, CSS, JavaScript**와 **Supabase(DB)**, **GitHub(저장소)**, **Vercel(배포 호스팅)**을 활용하여 제작되었습니다.

---

## 🌟 주요 기능
1. **자유로운 메모 작성**: 닉네임, 감성 이모지 스티커, 파스텔톤 포스트잇 색상 선택 기능
2. **실시간 반영 (Supabase Realtime)**: 누군가 메모를 쓰면 새로고침 없이 다른 사람들의 화면에 즉시 등록
3. **따뜻한 공감 하트(좋아요)**: 메모마다 응원 하트를 눌러 공감 표시
4. **검색 및 정렬**: 작성자 및 메시지 본문 실시간 검색, 최신순/인기순 정렬
5. **감성적인 인터페이스**: 실제 칠판/게시판에 포스트잇을 붙인 듯한 마스킹 테이프 & 손글씨 디자인
6. **폭죽 축하 효과**: 메모 등록 시 화려한 폭죽 애니메이션(Canvas Confetti) 발사!

---

## 📁 파일 구조
- `index.html`: 메인 웹 페이지 마크업 및 모달 창
- `style.css`: 감성적인 포스트잇 디자인 및 반응형 스타일
- `app.js`: 데이터베이스 통신, 실시간 구독, UI 인터랙션 로직
- `config.js`: Supabase 프로젝트 URL 및 Anon Key 설정 파일
- `schema.sql`: Supabase 데이터베이스 테이블 및 권한 생성 SQL 스크립트

---

## 🚀 빠른 시작 가이드 (초보자용 3분 요약)
1. **Supabase 프로젝트 생성**: `schema.sql` 내용을 복사하여 Supabase의 **SQL Editor**에 붙여넣고 **Run** 실행
2. **키 설정**: Supabase **Project Settings > API**의 URL과 anon key를 `config.js`에 입력
3. **GitHub 업로드**: GitHub에 새 레포지토리를 만들고 소스코드 업로드
4. **Vercel 배포**: Vercel에서 방금 올린 GitHub 레포지토리를 불러와 클릭 한 번으로 배포 완료!

