import React from 'react';
import { Text } from 'react-native';

// Small helper to explicitly opt-in to selectable text where needed.
export default function SelectableText({ children, style, numberOfLines, onLongPress, ...props }) {
  return (
    <Text
      selectable={true}
      onLongPress={onLongPress}
      numberOfLines={numberOfLines}
      style={style}
      {...props}
    >
      {children}
    </Text>
  );
}
