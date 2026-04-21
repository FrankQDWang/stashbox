import { useRef } from 'react';
import {
  Animated,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

interface PressableScaleProps extends PressableProps {
  children: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export function PressableScale({ children, onPressIn, onPressOut, style, ...props }: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      {...props}
      onPressIn={(event) => {
        Animated.spring(scale, {
          toValue: 0.97,
          useNativeDriver: true,
          speed: 30,
          bounciness: 4,
        }).start();
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 30,
          bounciness: 4,
        }).start();
        onPressOut?.(event);
      }}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
