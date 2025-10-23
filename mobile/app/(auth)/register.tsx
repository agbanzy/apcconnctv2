import { useState } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { auth } from '@/lib/auth';

export default function RegisterScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    wardId: '',
    referralCode: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    setErrors({ ...errors, [field]: undefined });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.wardId) {
      newErrors.wardId = 'Ward ID is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { confirmPassword, ...registerData } = formData;
      const result = await auth.register(registerData);

      if (result.success) {
        Alert.alert(
          'Success',
          'Account created successfully! Please verify your NIN to activate your account.',
          [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
        );
      } else {
        Alert.alert('Registration Failed', result.error || 'Unable to create account');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="h1" style={styles.title}>
            Join APC Connect
          </Text>
          <Text variant="body" style={styles.subtitle}>
            Create your member account
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="First Name"
            value={formData.firstName}
            onChangeText={(text) => updateField('firstName', text)}
            placeholder="John"
            error={errors.firstName}
          />

          <Input
            label="Last Name"
            value={formData.lastName}
            onChangeText={(text) => updateField('lastName', text)}
            placeholder="Doe"
            error={errors.lastName}
          />

          <Input
            label="Email"
            value={formData.email}
            onChangeText={(text) => updateField('email', text)}
            placeholder="your.email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <Input
            label="Phone (Optional)"
            value={formData.phone}
            onChangeText={(text) => updateField('phone', text)}
            placeholder="+234 XXX XXX XXXX"
            keyboardType="phone-pad"
            error={errors.phone}
          />

          <Input
            label="Ward ID"
            value={formData.wardId}
            onChangeText={(text) => updateField('wardId', text)}
            placeholder="Enter your ward ID"
            error={errors.wardId}
          />

          <Input
            label="Referral Code (Optional)"
            value={formData.referralCode}
            onChangeText={(text) => updateField('referralCode', text)}
            placeholder="Enter referral code if you have one"
            autoCapitalize="characters"
            error={errors.referralCode}
          />

          <Input
            label="Password"
            value={formData.password}
            onChangeText={(text) => updateField('password', text)}
            placeholder="At least 6 characters"
            secureTextEntry
            error={errors.password}
          />

          <Input
            label="Confirm Password"
            value={formData.confirmPassword}
            onChangeText={(text) => updateField('confirmPassword', text)}
            placeholder="Re-enter your password"
            secureTextEntry
            error={errors.confirmPassword}
          />

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            style={styles.button}
          />

          <Button
            title="Already have an account? Sign In"
            onPress={() => router.push('/(auth)/login')}
            variant="outline"
            style={styles.button}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    marginBottom: 8,
    color: '#00A86B',
  },
  subtitle: {
    color: '#6B7280',
  },
  form: {
    width: '100%',
  },
  button: {
    marginTop: 8,
  },
});
