import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

type SegmentedControlProps = {
  segments: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
};

export default function SegmentedControl({
  segments,
  selectedIndex,
  onChange,
}: SegmentedControlProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {segments.map((segment, index) => (
        <TouchableOpacity
          key={segment}
          style={[
            styles.segment,
            index === selectedIndex && { backgroundColor: colors.background },
          ]}
          onPress={() => onChange(index)}>
          <Text
            style={[
              styles.segmentText,
              { color: index === selectedIndex ? colors.primary : colors.secondary },
            ]}>
            {segment}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    margin: 16,
    borderRadius: 8,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
  },
});