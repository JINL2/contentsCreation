// Supabase 설정
const SUPABASE_CONFIG = {
    url: 'https://yenfccoefczqxckbizqa.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllbmZjY29lZmN6cXhja2JpenFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NDkyNzksImV4cCI6MjA2MTUyNTI3OX0.U1iQUOaNPSrEHf1w_ePqgYzJiRO6Bi48E2Np2hY0nCQ'
};

// 디버그 로그 추가
console.log('config.js loaded successfully');
console.log('SUPABASE_CONFIG:', SUPABASE_CONFIG);

// 게임화 설정은 이제 Supabase에서 동적으로 로드됩니다.
// points_system 테이블: 각 활동별 점수
// level_system 테이블: 레벨별 요구 점수
// achievement_system 테이블: 업적 시스템

// 카테고리 이모지 매핑
const CATEGORY_EMOJI = {
    "Hàng ngày": "☀️",
    "Ẩm thực": "🍽️",
    "Du lịch": "✈️",
    "Thời trang": "👗",
    "Làm đẹp": "💄",
    "Thể thao": "💪",
    "Giáo dục": "📚",
    "Công nghệ": "💻",
    "Giải trí": "🎭",
    "Khác": "✨",
    "일상": "☀️",
    "음식": "🍽️",
    "여행": "✈️",
    "패션": "👗",
    "뷰티": "💄",
    "운동": "💪",
    "교육": "📚",
    "기술": "💻",
    "엔터테인먼트": "🎭",
    "기타": "✨"
};

// 감정 이모지 매핑
const EMOTION_EMOJI = {
    "Vui vẻ": "😄",
    "Cảm động": "🥺",
    "Hào hứng": "🎉",
    "Thoải mái": "😌",
    "Bổ ích": "🧠",
    "Dễ thương": "🥰",
    "Ngầu": "😎",
    "Ngạc nhiên": "😮",
    "재미있는": "😄",
    "감동적인": "🥺",
    "신나는": "🎉",
    "편안한": "😌",
    "유익한": "🧠",
    "귀여운": "🥰",
    "멋진": "😎",
    "놀라운": "😮"
};