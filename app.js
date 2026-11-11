// ========================================================
// 💌 디지털 롤링페이퍼 메인 스크립트 (app.js)
// ========================================================

// 1. 상태 관리 변수
let supabaseClient = null;
let isDemoMode = false;
let notesData = [];
let currentFilter = {
  keyword: "",
  sort: "newest"
};

// 기본 샘플 데이터 (Supabase 연동 전 데모용)
const DEMO_SEED_NOTES = [
  {
    id: 1,
    nickname: "민지",
    emoji: "🎉",
    bg_color: "#fff9c4",
    content: "축하해! 올 한 해도 정말 수고 많았어. 앞으로도 너의 모든 날들을 힘차게 응원할게! 파이팅 ✨",
    likes: 5,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 2,
    nickname: "개발팀 준호",
    emoji: "☕",
    bg_color: "#bbdefb",
    content: "롤링페이퍼 완성 축하드려요! 버그 없이 배포까지 성공하길 기원합니다. 커피 한잔해요!",
    likes: 8,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString()
  },
  {
    id: 3,
    nickname: "다정한 친구",
    emoji: "💖",
    bg_color: "#ffcdd2",
    content: "언제나 긍정적인 에너지를 줘서 고마워. 너랑 함께하는 시간은 늘 즐거워! 행복하자 🍀",
    likes: 12,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString()
  }
];

// 2. DOM 요소 참조
const setupWarningEl = document.getElementById("setup-warning");
const notesGridEl = document.getElementById("notes-grid");
const loadingStateEl = document.getElementById("loading-state");
const emptyStateEl = document.getElementById("empty-state");
const totalNotesCountEl = document.getElementById("total-notes-count");
const totalLikesCountEl = document.getElementById("total-likes-count");
const searchInputEl = document.getElementById("search-input");
const sortSelectEl = document.getElementById("sort-select");

// 모달 요소
const writeModalEl = document.getElementById("write-modal");
const openWriteBtn = document.getElementById("open-write-btn");
const floatingWriteBtn = document.getElementById("floating-write-btn");
const closeModalBtn = document.getElementById("close-modal-btn");
const cancelBtn = document.getElementById("cancel-btn");
const noteForm = document.getElementById("note-form");
const authorInput = document.getElementById("author-input");
const contentInput = document.getElementById("content-input");
const charCurrent = document.getElementById("char-current");
const submitBtn = document.getElementById("submit-btn");

let selectedEmoji = "🎉";
let selectedColor = "#fff9c4";

// ========================================================
// 3. 초기화 (Supabase 연결 및 모드 판별)
// ========================================================
function initApp() {
  const cfg = window.SUPABASE_CONFIG || {};
  let cleanUrl = (cfg.url || "").trim().replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  let cleanAnonKey = (cfg.anonKey || "").trim();

  const isKeyUnset =
    !cleanUrl ||
    !cleanAnonKey ||
    cleanUrl.includes("YOUR_SUPABASE") ||
    cleanAnonKey.includes("YOUR_SUPABASE");

  if (isKeyUnset) {
    // Supabase 설정이 아직 안 되어 있으면 친절한 데모 모드로 작동!
    isDemoMode = true;
    setupWarningEl.classList.remove("hidden");
    console.info("ℹ️ Supabase 키가 설정되지 않아 로컬 데모 모드로 시작합니다.");
    const saved = localStorage.getItem("demo_rolling_notes");
    notesData = saved ? JSON.parse(saved) : DEMO_SEED_NOTES;
    renderBoard();
  } else {
    // Supabase 정상 연결
    isDemoMode = false;
    setupWarningEl.classList.add("hidden");
    try {
      supabaseClient = window.supabase.createClient(cleanUrl, cleanAnonKey);
      fetchNotesFromSupabase();
      subscribeRealtimeChanges();
    } catch (err) {
      console.error("Supabase 초기화 에러:", err);
      showToast("⚠️ Supabase 연결 실패: URL과 Key를 확인해주세요.");
      isDemoMode = true;
      notesData = DEMO_SEED_NOTES;
      renderBoard();
    }
  }

  setupEventListeners();
}

// ========================================================
// 4. Supabase 데이터베이스 통신 함수들
// ========================================================

// (1) 전체 메모 불러오기
async function fetchNotesFromSupabase() {
  loadingStateEl.classList.remove("hidden");
  emptyStateEl.classList.add("hidden");

  try {
    const { data, error } = await supabaseClient
      .from("rolling_papers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    notesData = data || [];
    renderBoard();
  } catch (err) {
    console.error("메모 조회 실패:", err);
    showToast("메모를 불러오는 중 오류가 발생했습니다.");
    loadingStateEl.classList.add("hidden");
  }
}

// (2) 실시간 (Realtime) 변경 사항 구독
function subscribeRealtimeChanges() {
  if (!supabaseClient) return;

  supabaseClient
    .channel("public:rolling_papers")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "rolling_papers" },
      (payload) => {
        // 새 메모가 등록되거나 좋아요가 변경되었을 때 자동 갱신
        fetchNotesFromSupabase();
      }
    )
    .subscribe();
}

// (3) 새 메모 작성하기
async function createNote(note) {
  if (isDemoMode) {
    const newDemoNote = {
      ...note,
      id: Date.now(),
      likes: 0,
      created_at: new Date().toISOString()
    };
    notesData.unshift(newDemoNote);
    localStorage.setItem("demo_rolling_notes", JSON.stringify(notesData));
    renderBoard();
    triggerCelebration();
    showToast("🎉 데모 모드로 메모가 저장되었습니다!");
    return true;
  }

  try {
    const { error } = await supabaseClient
      .from("rolling_papers")
      .insert([
        {
          nickname: note.nickname,
          content: note.content,
          emoji: note.emoji,
          bg_color: note.bg_color,
          likes: 0
        }
      ]);

    if (error) throw error;

    triggerCelebration();
    showToast("💌 롤링페이퍼에 메모를 붙였습니다!");
    await fetchNotesFromSupabase();
    return true;
  } catch (err) {
    console.error("메모 등록 실패:", err);
    showToast("❌ 등록 실패: " + (err.message || "오류가 발생했습니다."));
    return false;
  }
}

// (4) 좋아요 누르기
async function handleLikeClick(id, currentLikes, e) {
  // 클릭 애니메이션 효과
  const btn = e.currentTarget;
  btn.style.transform = "scale(1.25)";
  setTimeout(() => (btn.style.transform = ""), 200);

  if (isDemoMode) {
    const target = notesData.find((n) => n.id === id);
    if (target) {
      target.likes = (target.likes || 0) + 1;
      localStorage.setItem("demo_rolling_notes", JSON.stringify(notesData));
      renderBoard();
    }
    return;
  }

  // 로컬 낙관적 업데이트
  const target = notesData.find((n) => n.id === id);
  if (target) {
    target.likes = (target.likes || 0) + 1;
    renderBoard();
  }

  try {
    const { error } = await supabaseClient
      .from("rolling_papers")
      .update({ likes: currentLikes + 1 })
      .eq("id", id);

    if (error) throw error;
  } catch (err) {
    console.error("좋아요 업데이트 실패:", err);
    // 실패 시 롤백 재조회
    fetchNotesFromSupabase();
  }
}

// ========================================================
// 5. 화면 렌더링 함수들
// ========================================================

function renderBoard() {
  loadingStateEl.classList.add("hidden");

  // 통계 계산
  const totalNotes = notesData.length;
  const totalLikes = notesData.reduce((acc, cur) => acc + (cur.likes || 0), 0);
  totalNotesCountEl.textContent = totalNotes.toLocaleString();
  totalLikesCountEl.textContent = totalLikes.toLocaleString();

  // 검색 및 정렬 필터 적용
  let filtered = notesData.filter((item) => {
    const kw = currentFilter.keyword.toLowerCase().trim();
    if (!kw) return true;
    return (
      (item.nickname || "").toLowerCase().includes(kw) ||
      (item.content || "").toLowerCase().includes(kw)
    );
  });

  // 정렬 기준
  if (currentFilter.sort === "newest") {
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } else if (currentFilter.sort === "popular") {
    filtered.sort((a, b) => (b.likes || 0) - (a.likes || 0));
  } else if (currentFilter.sort === "oldest") {
    filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }

  // 빈 상태 표시
  if (filtered.length === 0) {
    notesGridEl.innerHTML = "";
    emptyStateEl.classList.remove("hidden");
    return;
  }
  emptyStateEl.classList.add("hidden");

  // 카드 렌더링
  notesGridEl.innerHTML = filtered
    .map((item, idx) => {
      // 살짝 기울어진 랜덤 각도 (-2도 ~ +2도)
      const rotation = ((idx * 7) % 5) - 2;
      const timeStr = formatRelativeTime(item.created_at);

      return `
        <article class="note-card" style="background-color: ${escapeHtml(item.bg_color || "#fff9c4")}; transform: rotate(${rotation}deg);">
          <div class="note-tape"></div>
          
          <div class="card-top">
            <span class="card-emoji">${escapeHtml(item.emoji || "💌")}</span>
            <span class="card-time">${timeStr}</span>
          </div>

          <p class="card-content">${escapeHtml(item.content || "")}</p>

          <div class="card-bottom">
            <span class="card-author">${escapeHtml(item.nickname || "익명")}</span>
            <button class="like-btn" onclick="handleLikeClick(${item.id}, ${item.likes || 0}, event)" title="응원 하트 보내기">
              ❤️ <span>${(item.likes || 0).toLocaleString()}</span>
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

// 시간 포맷팅 (방금 전, N분 전, N시간 전, 날짜)
function formatRelativeTime(dateString) {
  if (!dateString) return "";
  const now = new Date();
  const date = new Date(dateString);
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return "방금 전";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일 전`;

  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

// XSS 보안 방지용 문자열 이스케이프
function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 축하 폭죽 애니메이션
function triggerCelebration() {
  if (typeof confetti === "function") {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  }
}

// 토스트 메시지
let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  toast.style.opacity = "1";
  toast.style.transform = "translateX(-50%) translateY(0)";

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(10px)";
    setTimeout(() => toast.classList.add("hidden"), 300);
  }, 2800);
}

// ========================================================
// 6. 모달 및 이벤트 리스너 설정
// ========================================================
function setupEventListeners() {
  // 모달 열기
  const openModal = () => {
    writeModalEl.classList.remove("hidden");
    authorInput.focus();
  };
  openWriteBtn.addEventListener("click", openModal);
  floatingWriteBtn.addEventListener("click", openModal);

  document.querySelectorAll(".write-trigger-btn").forEach((btn) => {
    btn.addEventListener("click", openModal);
  });

  // 모달 닫기
  const closeModal = () => {
    writeModalEl.classList.add("hidden");
    noteForm.reset();
    charCurrent.textContent = "0";
  };
  closeModalBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);
  writeModalEl.addEventListener("click", (e) => {
    if (e.target === writeModalEl) closeModal();
  });

  // 글자 수 카운터
  contentInput.addEventListener("input", () => {
    charCurrent.textContent = contentInput.value.length;
  });

  // 이모지 선택
  const emojiOpts = document.querySelectorAll(".emoji-opt");
  emojiOpts.forEach((btn) => {
    btn.addEventListener("click", () => {
      emojiOpts.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedEmoji = btn.dataset.emoji;
    });
  });

  // 색상 선택
  const colorOpts = document.querySelectorAll(".color-opt");
  colorOpts.forEach((btn) => {
    btn.addEventListener("click", () => {
      colorOpts.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedColor = btn.dataset.color;
    });
  });

  // 폼 제출
  noteForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nickname = authorInput.value.trim();
    const content = contentInput.value.trim();

    if (!nickname || !content) {
      showToast("작성자와 내용을 모두 입력해주세요!");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = "<span>등록 중... ⏳</span>";

    const success = await createNote({
      nickname,
      content,
      emoji: selectedEmoji,
      bg_color: selectedColor
    });

    submitBtn.disabled = false;
    submitBtn.innerHTML = "<span>롤링페이퍼에 붙이기 📌</span>";

    if (success) {
      closeModal();
    }
  });

  // 검색
  searchInputEl.addEventListener("input", (e) => {
    currentFilter.keyword = e.target.value;
    renderBoard();
  });

  // 정렬
  sortSelectEl.addEventListener("change", (e) => {
    currentFilter.sort = e.target.value;
    renderBoard();
  });
}

// DOM 준비 시 실행
document.addEventListener("DOMContentLoaded", initApp);

