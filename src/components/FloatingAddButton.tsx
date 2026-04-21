import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface FloatingAddButtonProps {
  onPress: () => void;
}

export function FloatingAddButton({ onPress }: FloatingAddButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.05,
          duration: 1200,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [scale]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        right: 22,
        bottom: 98,
        transform: [{ scale }],
        ...(Platform.OS === 'web'
          ? { boxShadow: '0 8px 14px rgba(244, 143, 177, 0.3)' }
          : {
              shadowColor: '#f48fb1',
              shadowOpacity: 0.3,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 8 },
              elevation: 8,
            }),
      }}
    >
      <Pressable
        accessibilityLabel="添加宝贝"
        onPress={onPress}
        style={{ borderRadius: 999, overflow: 'hidden' }}
      >
        <LinearGradient
          colors={['#f48fb1', '#ce93d8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 58,
            height: 58,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 999,
          }}
        >
          <Text className="text-3xl font-black text-white">＋</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}
