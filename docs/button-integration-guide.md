# Contents Helper Button Integration Guide

## 🎮 앱에서 Contents Helper 버튼 통합 가이드

### 1. API Endpoint (버튼 상태 가져오기)

#### Endpoint
```
GET /api/contents-helper/button-state?user_id={user_id}
```

#### Response
```json
{
  "success": true,
  "data": {
    "user_stats": {
      "total_points": 150,
      "current_level": 2,
      "level_name": "Nhà sáng tạo junior",
      "level_icon": "🌿",
      "streak_days": 3,
      "total_uploads": 2,
      "level_progress": 50,        // 현재 레벨 진행률 %
      "next_level_points": 350     // 다음 레벨까지 필요한 포인트
    },
    "daily_status": {
      "has_bonus": true,           // 오늘 보너스 받을 수 있음
      "bonus_points": 30,          // 보너스 포인트
      "last_activity": "2025-06-28"
    },
    "content_status": {
      "new_ideas_count": 5,        // 새로운 아이디어 개수
      "choosen_ideas": 1,          // 선택했지만 미완성 아이디어
      "trending_categories": ["Giải trí", "Ẩm thực"]
    }
  }
}
```

### 2. Contents Helper URL 구성

```javascript
// 기본 URL
const BASE_URL = "https://yourapp.com/contents-helper/";

// 파라미터 구성
const params = new URLSearchParams({
    user_id: userData.id,
    user_name: userData.name,
    company_id: userData.company_id,
    store_id: userData.store_id
});

// 최종 URL
const contentsHelperUrl = `${BASE_URL}?${params.toString()}`;
```

### 3. React Native 버튼 컴포넌트

```jsx
import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Animated,
  Linking
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const ContentsHelperButton = ({ userId, onPress }) => {
  const [buttonState, setButtonState] = useState(null);
  const [pulseAnim] = useState(new Animated.Value(1));
  
  useEffect(() => {
    // 버튼 상태 가져오기
    fetchButtonState();
    
    // 5분마다 상태 업데이트
    const interval = setInterval(fetchButtonState, 300000);
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    // 보너스가 있으면 펄스 애니메이션
    if (buttonState?.daily_status?.has_bonus) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true
          })
        ])
      ).start();
    }
  }, [buttonState]);
  
  const fetchButtonState = async () => {
    try {
      const response = await fetch(`/api/contents-helper/button-state?user_id=${userId}`);
      const data = await response.json();
      setButtonState(data.data);
    } catch (error) {
      console.error('Failed to fetch button state:', error);
    }
  };
  
  const handlePress = () => {
    // 통계 기록
    trackEvent('contents_helper_button_clicked', {
      has_bonus: buttonState?.daily_status?.has_bonus,
      user_level: buttonState?.user_stats?.current_level
    });
    
    // Contents Helper 열기
    onPress();
  };
  
  if (!buttonState) return null;
  
  const { user_stats, daily_status, content_status } = buttonState;
  
  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
        <LinearGradient
          colors={['#FF6B35', '#FF8A65']}
          style={styles.container}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* 일일 보너스 배지 */}
          {daily_status.has_bonus && (
            <View style={styles.bonusBadge}>
              <Text style={styles.bonusText}>+{daily_status.bonus_points} 🎁</Text>
            </View>
          )}
          
          {/* 메인 콘텐츠 */}
          <View style={styles.mainContent}>
            <Text style={styles.icon}>🎬</Text>
            <View style={styles.textContent}>
              <Text style={styles.title}>Tạo Contents</Text>
              <Text style={styles.subtitle}>
                {content_status.new_ideas_count} ý tưởng mới đang chờ bạn!
              </Text>
            </View>
          </View>
          
          {/* 레벨 진행 상황 */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${user_stats.level_progress}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {user_stats.level_icon} Còn {user_stats.next_level_points} điểm nữa lên cấp!
            </Text>
          </View>
          
          {/* 연속 일수 배지 */}
          {user_stats.streak_days > 0 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>🔥 {user_stats.streak_days}</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  bonusBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bonusText: {
    color: '#FF6B35',
    fontWeight: 'bold',
    fontSize: 14,
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  icon: {
    fontSize: 48,
    marginRight: 15,
  },
  textContent: {
    flex: 1,
  },
  title: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginTop: 4,
  },
  progressContainer: {
    marginTop: 10,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFF',
    borderRadius: 3,
  },
  progressText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 8,
  },
  streakBadge: {
    position: 'absolute',
    bottom: 10,
    right: 20,
  },
  streakText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ContentsHelperButton;
```

### 4. Flutter 버튼 위젯

```dart
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class ContentsHelperButton extends StatefulWidget {
  final String userId;
  final VoidCallback onTap;
  
  const ContentsHelperButton({
    Key? key,
    required this.userId,
    required this.onTap,
  }) : super(key: key);
  
  @override
  _ContentsHelperButtonState createState() => _ContentsHelperButtonState();
}

class _ContentsHelperButtonState extends State<ContentsHelperButton>
    with SingleTickerProviderStateMixin {
  Map<String, dynamic>? buttonState;
  late AnimationController _animationController;
  late Animation<double> _scaleAnimation;
  
  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(
      begin: 1.0,
      end: 1.1,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    ));
    
    fetchButtonState();
  }
  
  Future<void> fetchButtonState() async {
    try {
      final response = await http.get(
        Uri.parse('/api/contents-helper/button-state?user_id=${widget.userId}'),
      );
      if (response.statusCode == 200) {
        setState(() {
          buttonState = json.decode(response.body)['data'];
        });
        
        // 보너스가 있으면 애니메이션 시작
        if (buttonState?['daily_status']?['has_bonus'] == true) {
          _animationController.repeat(reverse: true);
        }
      }
    } catch (e) {
      print('Failed to fetch button state: $e');
    }
  }
  
  @override
  Widget build(BuildContext context) {
    if (buttonState == null) return const SizedBox.shrink();
    
    final userStats = buttonState!['user_stats'];
    final dailyStatus = buttonState!['daily_status'];
    final contentStatus = buttonState!['content_status'];
    
    return ScaleTransition(
      scale: _scaleAnimation,
      child: GestureDetector(
        onTap: widget.onTap,
        child: Container(
          margin: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFFFF6B35), Color(0xFFFF8A65)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.2),
                blurRadius: 8,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Stack(
            children: [
              // 일일 보너스 배지
              if (dailyStatus['has_bonus'])
                Positioned(
                  top: -10,
                  right: 20,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.1),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Text(
                      '+${dailyStatus['bonus_points']} 🎁',
                      style: const TextStyle(
                        color: Color(0xFFFF6B35),
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                  ),
                ),
              
              Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 메인 콘텐츠
                    Row(
                      children: [
                        const Text(
                          '🎬',
                          style: TextStyle(fontSize: 48),
                        ),
                        const SizedBox(width: 15),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Tạo Contents',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${contentStatus['new_ideas_count']} ý tưởng mới đang chờ bạn!',
                                style: TextStyle(
                                  color: Colors.white.withOpacity(0.9),
                                  fontSize: 14,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    
                    const SizedBox(height: 15),
                    
                    // 프로그레스 바
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          height: 6,
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.3),
                            borderRadius: BorderRadius.circular(3),
                          ),
                          child: FractionallySizedBox(
                            widthFactor: userStats['level_progress'] / 100,
                            child: Container(
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(3),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '${userStats['level_icon']} Còn ${userStats['next_level_points']} điểm nữa lên cấp!',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.9),
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              
              // 연속 일수 배지
              if (userStats['streak_days'] > 0)
                Positioned(
                  bottom: 10,
                  right: 20,
                  child: Text(
                    '🔥 ${userStats['streak_days']}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
  
  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }
}
```

### 5. Supabase에서 버튼 상태 API 구현

```sql
-- Function to get button state for user
CREATE OR REPLACE FUNCTION get_contents_helper_button_state(p_user_id TEXT)
RETURNS JSON AS $$
DECLARE
    v_user_stats JSON;
    v_daily_status JSON;
    v_content_status JSON;
    v_today DATE := CURRENT_DATE;
    v_last_activity DATE;
BEGIN
    -- Get user stats
    SELECT json_build_object(
        'total_points', up.total_points,
        'current_level', up.current_level,
        'level_name', ls.level_name,
        'level_icon', ls.icon,
        'streak_days', up.streak_days,
        'total_uploads', up.total_uploads,
        'level_progress', 
            CASE 
                WHEN ls_next.required_points IS NULL THEN 100
                ELSE ROUND(((up.total_points - ls.required_points)::NUMERIC / 
                           (ls_next.required_points - ls.required_points)::NUMERIC) * 100)
            END,
        'next_level_points', COALESCE(ls_next.required_points - up.total_points, 0)
    ) INTO v_user_stats
    FROM user_progress up
    LEFT JOIN level_system ls ON ls.level_number = up.current_level
    LEFT JOIN level_system ls_next ON ls_next.level_number = up.current_level + 1
    WHERE up.user_id = p_user_id;
    
    -- Get daily status
    SELECT up.last_activity_date INTO v_last_activity
    FROM user_progress up
    WHERE up.user_id = p_user_id;
    
    SELECT json_build_object(
        'has_bonus', v_last_activity IS NULL OR v_last_activity < v_today,
        'bonus_points', 30,
        'last_activity', v_last_activity
    ) INTO v_daily_status;
    
    -- Get content status
    SELECT json_build_object(
        'new_ideas_count', COUNT(*) FILTER (WHERE is_upload = false AND is_choosen = false),
        'choosen_ideas', COUNT(*) FILTER (WHERE is_choosen = true AND is_upload = false),
        'trending_categories', ARRAY(
            SELECT DISTINCT category 
            FROM contents_idea 
            WHERE is_upload = false 
            ORDER BY RANDOM() 
            LIMIT 2
        )
    ) INTO v_content_status
    FROM contents_idea;
    
    -- Return combined result
    RETURN json_build_object(
        'user_stats', COALESCE(v_user_stats, '{}'::JSON),
        'daily_status', v_daily_status,
        'content_status', v_content_status
    );
END;
$$ LANGUAGE plpgsql;

-- Example API endpoint (using PostgREST)
-- GET /rpc/get_contents_helper_button_state?p_user_id=USER_ID
```

### 6. 푸시 알림 스케줄

```javascript
// Node.js 푸시 알림 스케줄러 예시
const schedule = require('node-schedule');
const pushNotification = require('./pushService');

// 매일 오전 9시 - 일일 보너스 알림
schedule.scheduleJob('0 9 * * *', async () => {
  const users = await getUsersWithoutTodayActivity();
  
  for (const user of users) {
    await pushNotification.send({
      userId: user.id,
      title: '🎁 Điểm thưởng hàng ngày!',
      body: '+30 điểm đang chờ bạn. Tạo content ngay!',
      data: {
        type: 'daily_bonus',
        points: 30
      }
    });
  }
});

// 매일 오후 8시 - 연속 일수 위험 알림
schedule.scheduleJob('0 20 * * *', async () => {
  const users = await getUsersWithStreakAtRisk();
  
  for (const user of users) {
    await pushNotification.send({
      userId: user.id,
      title: `🔥 Chuỗi ${user.streak_days} ngày sắp mất!`,
      body: 'Tạo content ngay để duy trì chuỗi của bạn',
      data: {
        type: 'streak_warning',
        streak_days: user.streak_days
      }
    });
  }
});

// 레벨업 임박 알림 (실시간)
async function checkNearLevelUp(userId, currentPoints) {
  const nextLevel = await getNextLevelInfo(userId);
  const pointsNeeded = nextLevel.required_points - currentPoints;
  
  if (pointsNeeded <= 50) {
    await pushNotification.send({
      userId: userId,
      title: '🏆 Sắp lên cấp!',
      body: `Chỉ còn ${pointsNeeded} điểm nữa là đạt ${nextLevel.level_name}!`,
      data: {
        type: 'near_level_up',
        points_needed: pointsNeeded,
        next_level: nextLevel.level_name
      }
    });
  }
}
```

### 7. 앱 내 버튼 배치 추천

1. **홈 화면 상단**: 가장 눈에 띄는 위치
2. **하단 탭바**: 빠른 접근성
3. **플로팅 액션 버튼**: 항상 보이는 위치
4. **사이드 메뉴**: 추가 기능으로

### 8. A/B 테스트 제안

```javascript
// 버튼 변형 테스트
const buttonVariants = {
  A: {
    title: "Tạo Contents",
    subtitle: "{count} ý tưởng mới"
  },
  B: {
    title: "🎬 Quay Video Viral",
    subtitle: "Nhận {points} điểm ngay!"
  },
  C: {
    title: "Contents Helper",
    subtitle: "🔥 Chuỗi {streak} ngày"
  }
};

// 측정 지표
const metrics = {
  click_rate: 'Button click rate',
  completion_rate: 'Content completion rate',
  return_rate: 'Daily return rate',
  avg_session_time: 'Average session time'
};
```

## 🎯 성공 지표

1. **일일 활성 사용자 (DAU)**: 30% 증가 목표
2. **콘텐츠 완성률**: 70% 이상 유지
3. **평균 연속 일수**: 7일 이상
4. **버튼 클릭률**: 15% 이상

## 📱 모바일 딥링크

```javascript
// iOS
contentshelper://open?user_id=123&bonus=true

// Android
intent://contentshelper/open?user_id=123&bonus=true#Intent;scheme=contentshelper;package=com.yourapp;end

// 웹 폴백
https://yourapp.com/contents-helper?user_id=123&from=app
```
