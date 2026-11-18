import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '../constants/colors';
import { RADIUS, SHADOWS, SPACING } from '../constants/theme';

interface SectionCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  highlighted?: boolean;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  children,
  style,
  highlighted = false,
}) => {
  return (
    <View
      style={[
        styles.card,
        highlighted && styles.highlightedCard,
        SHADOWS.card,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  highlightedCard: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
});
