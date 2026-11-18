import { COLORS } from './colors';
import { moderateScale, moderateFont } from '../utils/responsive';

export const SPACING = {
  xs: moderateScale(4),
  sm: moderateScale(8),
  md: moderateScale(12),
  lg: moderateScale(16),
  xl: moderateScale(20),
  xxl: moderateScale(24),
};

export const RADIUS = {
  xs: moderateScale(4),
  sm: moderateScale(6),
  md: moderateScale(8),
  lg: moderateScale(12),
  xl: moderateScale(16),
  full: 9999,
};

export const SHADOWS = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  accent: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
};

export const TYPOGRAPHY = {
  titleLarge: {
    fontSize: moderateFont(22),
    fontWeight: '700' as const,
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  titleMedium: {
    fontSize: moderateFont(18),
    fontWeight: '700' as const,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: moderateFont(13),
    color: COLORS.textSecondary,
    fontWeight: '500' as const,
  },
  body: {
    fontSize: moderateFont(14),
    color: COLORS.textPrimary,
  },
  caption: {
    fontSize: moderateFont(12),
    color: COLORS.textSecondary,
  },
  tagLabel: {
    fontSize: moderateFont(11),
    fontWeight: '700' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
};

