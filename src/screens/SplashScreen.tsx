import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, StatusBar, Image } from 'react-native';
import { COLORS } from '../constants/colors';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 1200);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.centerContent}>
        {/* Brand Logo Image */}
        <Image
          source={require('../../assets/montoyalogo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />

        {/* Subtitle */}
        <Text style={styles.appTitle}>COACH OPERATIONS</Text>

        {/* Red Spinner */}
        <ActivityIndicator
          size="large"
          color={COLORS.primary || '#D60000'}
          style={styles.spinner}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 220,
    height: 90,
    marginBottom: 8,
  },
  appTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.8,
    marginTop: 4,
  },
  spinner: {
    marginTop: 36,
  },
});
