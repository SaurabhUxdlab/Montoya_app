import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';

interface StatusBadgeProps {
  label: string;
  type?: 'action' | 'high' | 'success' | 'warning' | 'info' | 'gray';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, type = 'info' }) => {
  let bgColor = COLORS.grayBackground;
  let textColor = COLORS.textSecondary;

  switch (type) {
    case 'action':
      bgColor = '#FEE2E2'; // Light pink red
      textColor = COLORS.primary;
      break;
    case 'high':
      bgColor = '#0EA5E9'; // Cyan blue
      textColor = COLORS.white;
      break;
    case 'success':
      bgColor = COLORS.successLight;
      textColor = COLORS.success;
      break;
    case 'warning':
      bgColor = COLORS.warningLight;
      textColor = COLORS.warning;
      break;
    case 'info':
      bgColor = '#E0F2FE';
      textColor = '#0369A1';
      break;
    case 'gray':
      bgColor = COLORS.grayBackground;
      textColor = COLORS.textSecondary;
      break;
  }

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
