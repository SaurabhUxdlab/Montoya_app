import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { Eye, EyeOff, Lock, Mail, User, ArrowLeft } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { moderateScale, moderateFont } from '../utils/responsive';
import { useAppDispatch } from '../hooks/redux';
import { setUser } from '../store/slices/authSlice';
import { PrimaryButton } from '../components/PrimaryButton';
import { registerCoach } from '../services/authService';

interface SignupScreenProps {
  onBackToLogin: () => void;
}

export const SignupScreen: React.FC<SignupScreenProps> = ({ onBackToLogin }) => {
  const dispatch = useAppDispatch();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async () => {
    const cleanName = fullName.trim();
    const cleanEmail = email.trim();

    if (!cleanName || !cleanEmail || !password) {
      Alert.alert('Validation Error', 'Please fill in your name, email, and password.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password Error', 'Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const coachProfile = await registerCoach({
        fullName: cleanName,
        email: cleanEmail,
        password,
      });

      dispatch(setUser(coachProfile));
      Alert.alert(
        'Account Created',
        `Welcome to Montoya Tennis Academy, Coach ${cleanName}!`
      );
    } catch (error: any) {
      console.error('Coach Signup Error:', error);
      Alert.alert('Registration Failed', error?.message || 'Could not complete registration.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <TouchableOpacity style={styles.backBtn} onPress={onBackToLogin}>
        <ArrowLeft size={20} color={COLORS.primary} />
        <Text style={styles.backBtnText}>Back to Login</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <View style={styles.logoWrapper}>
          <Image
            source={require('../../assets/montoyalogo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.title}>Create Coach Account</Text>
        <Text style={styles.subtitle}>Join Montoya Tennis Academy coaching staff</Text>

        {/* Full Name */}
        <Text style={styles.label}>FULL NAME</Text>
        <View style={styles.inputWrapper}>
          <User size={16} color={COLORS.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder="Coach Elena Montoya"
            placeholderTextColor={COLORS.textSecondary}
            value={fullName}
            onChangeText={setFullName}
          />
        </View>

        {/* Email Address */}
        <Text style={styles.label}>EMAIL ADDRESS</Text>
        <View style={styles.inputWrapper}>
          <Mail size={16} color={COLORS.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder="elena@montoyatennis.com"
            placeholderTextColor={COLORS.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Password */}
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

        {/* Confirm Password */}
        <Text style={styles.label}>CONFIRM PASSWORD</Text>
        <View style={styles.inputWrapper}>
          <Lock size={16} color={COLORS.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={COLORS.textSecondary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
          />
        </View>

        {/* Sign Up CTA */}
        <PrimaryButton
          title="CREATE ACCOUNT & JOIN"
          onPress={handleSignup}
          loading={isLoading}
          style={styles.signupBtn}
        />

        {/* Existing User Login Link */}
        <TouchableOpacity style={styles.loginRow} onPress={onBackToLogin}>
          <Text style={styles.loginPrompt}>Already have an account? </Text>
          <Text style={styles.loginLink}>Log In</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingTop: moderateScale(40),
    paddingBottom: moderateScale(40),
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.lg,
  },
  backBtnText: {
    fontSize: moderateFont(13),
    fontWeight: '700',
    color: COLORS.primary,
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
    marginBottom: moderateScale(4),
  },
  logoImage: {
    width: moderateScale(190),
    height: moderateScale(65),
  },
  title: {
    fontSize: moderateFont(18),
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  subtitle: {
    fontSize: moderateFont(12),
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    marginTop: 2,
  },
  label: {
    fontSize: moderateFont(10),
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
    marginBottom: SPACING.md,
    gap: 8,
  },
  input: {
    flex: 1,
    paddingVertical: moderateScale(11),
    fontSize: moderateFont(13),
    color: COLORS.textPrimary,
  },
  signupBtn: {
    marginTop: SPACING.md,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  loginPrompt: {
    fontSize: moderateFont(12),
    color: COLORS.textSecondary,
  },
  loginLink: {
    fontSize: moderateFont(12),
    fontWeight: '700',
    color: COLORS.primary,
  },
});
