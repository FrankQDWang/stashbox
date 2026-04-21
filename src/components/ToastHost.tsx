import { useEffect, useRef } from 'react';
import { Animated, Platform, Text } from 'react-native';

import { useAppStore } from '@/store/useAppStore';

export function ToastHost() {
  const toast = useAppStore((state) => state.toast);
  const hideToast = useAppStore((state) => state.hideToast);
  const translateY = useRef(new Animated.Value(24)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) {
      return;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 180,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 24,
          duration: 160,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start(hideToast);
    }, 2200);

    return () => clearTimeout(timeout);
  }, [hideToast, opacity, toast, translateY]);

  if (!toast) {
    return null;
  }

  const backgroundColor =
    toast.kind === 'error' ? '#ef5350' : toast.kind === 'success' ? '#66bb6a' : '#4a3742';

  return (
    <Animated.View
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        left: 24,
        right: 24,
        bottom: 46,
        borderRadius: 18,
        paddingHorizontal: 18,
        paddingVertical: 13,
        backgroundColor,
        opacity,
        transform: [{ translateY }],
      }}
    >
      <Text className="text-center text-sm font-bold text-white">{toast.message}</Text>
    </Animated.View>
  );
}
