import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { useAppDispatch } from '../hooks/redux';
import { setUser } from '../store/slices/authSlice';
import { PrimaryButton } from '../components/PrimaryButton';
import { loginCoach } from '../services/authService';

interface LoginScreenProps {
  onNavigateForgot: () => void;
  onNavigateSignup?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigateForgot, onNavigateSignup }) => {
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      Alert.alert('Validation Error', 'Please enter email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const coachProfile = await loginCoach(cleanEmail, password);
      dispatch(setUser(coachProfile));
    } catch (error: any) {
      Alert.alert('Login Failed', error?.message || 'Invalid credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.logoWrapper}>
          <Image
            source={require('../../assets/montoyalogo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.subtitle}>Coach Management & Operations</Text>

        {/* Email Input */}
        <Text style={styles.label}>EMAIL ADDRESS</Text>
        <View style={styles.inputWrapper}>
          <Mail size={16} color={COLORS.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder="coach@montoyatennis.com"
            placeholderTextColor={COLORS.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Password Input */}
        <Text style={styles.label}>PASSWORD</Text>
        <View style={styles.inputWrapper}>
          <Lock size={16} color={COLORS.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={COLORS.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            {showPassword ? (
              <EyeOff size={16} color={COLORS.textSecondary} />
            ) : (
              <Eye size={16} color={COLORS.textSecondary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Forgot Password Link */}
        <TouchableOpacity style={styles.forgotRow} onPress={onNavigateForgot}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        {/* Login CTA */}
        <PrimaryButton
          title="LOG IN TO ACADEMY"
          onPress={handleLogin}
          loading={isLoading}
          style={styles.loginBtn}
        />

        {/* Sign Up Link */}
        {onNavigateSignup && (
          <TouchableOpacity style={styles.signupRow} onPress={onNavigateSignup}>
            <Text style={styles.signupPrompt}>Don't have an account? </Text>
            <Text style={styles.signupLink}>Sign Up</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 4,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  logoImage: {
    width: 200,
    height: 70,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    marginTop: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.grayBackground,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    gap: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.xl,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  loginBtn: {
    marginTop: 4,
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  signupPrompt: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  signupLink: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
