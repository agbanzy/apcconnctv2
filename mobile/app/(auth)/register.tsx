import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Alert, TouchableOpacity, Modal, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { auth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';

interface State {
  id: string;
  name: string;
  code: string;
}

interface LGA {
  id: string;
  name: string;
  code: string;
  stateId: string;
}

interface Ward {
  id: string;
  name: string;
  code: string;
  lgaId: string;
}

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
  const [selectedState, setSelectedState] = useState<State | null>(null);
  const [selectedLga, setSelectedLga] = useState<LGA | null>(null);
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showLgaPicker, setShowLgaPicker] = useState(false);
  const [showWardPicker, setShowWardPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: states } = useQuery({
    queryKey: ['/api/states'],
    queryFn: async () => {
      const response = await api.get('/api/states');
      if (!response.success) throw new Error(response.error || 'Failed to load states');
      return response.data as State[];
    },
  });

  const { data: lgas } = useQuery({
    queryKey: ['/api/lgas', selectedState?.id],
    queryFn: async () => {
      if (!selectedState?.id) return [];
      const response = await api.get(`/api/lgas?stateId=${selectedState.id}`);
      if (!response.success) throw new Error(response.error || 'Failed to load LGAs');
      return response.data as LGA[];
    },
    enabled: !!selectedState?.id,
  });

  const { data: wards } = useQuery({
    queryKey: ['/api/wards', selectedLga?.id],
    queryFn: async () => {
      if (!selectedLga?.id) return [];
      const response = await api.get(`/api/wards?lgaId=${selectedLga.id}`);
      if (!response.success) throw new Error(response.error || 'Failed to load wards');
      return response.data as Ward[];
    },
    enabled: !!selectedLga?.id,
  });

  useEffect(() => {
    if (selectedWard) {
      setFormData({ ...formData, wardId: selectedWard.id });
    }
  }, [selectedWard]);

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    setErrors({ ...errors, [field]: '' });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    
    if (!formData.email.trim()) {
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

    if (!selectedWard) {
      newErrors.ward = 'Please select your ward';
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
          'Welcome to APC Connect!',
          'Your account has been created successfully. Please verify your NIN to activate your account and access all features.',
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

  const filterItems = <T extends { name: string }>(items: T[] | undefined, query: string): T[] => {
    if (!items) return [];
    if (!query.trim()) return items;
    return items.filter(item => 
      item.name.toLowerCase().includes(query.toLowerCase())
    );
  };

  const renderPickerModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    items: any[] | undefined,
    onSelect: (item: any) => void,
    selectedId?: string
  ) => (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text variant="h3">{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <Input
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search..."
            containerStyle={styles.searchInput}
          />
        </View>

        <FlatList
          data={filterItems(items, searchQuery)}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.pickerItem,
                selectedId === item.id && styles.pickerItemSelected,
              ]}
              onPress={() => {
                onSelect(item);
                onClose();
                setSearchQuery('');
              }}
            >
              <Text 
                variant="body" 
                style={[
                  styles.pickerItemText,
                  selectedId === item.id && styles.pickerItemTextSelected,
                ]}
              >
                {item.name}
              </Text>
              {selectedId === item.id && (
                <Ionicons name="checkmark" size={20} color="#00A86B" />
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Text variant="caption" style={styles.emptyText}>
                {items && items.length === 0 ? 'No items available' : 'No results found'}
              </Text>
            </View>
          }
        />
      </View>
    </Modal>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text variant="h1" style={styles.title}>
              Join APC Connect
            </Text>
            <Text variant="body" style={styles.subtitle}>
              Create your member account
            </Text>
          </View>
        </View>

        <View style={styles.form}>
          <View style={styles.row}>
            <Input
              label="First Name"
              value={formData.firstName}
              onChangeText={(text) => updateField('firstName', text)}
              placeholder="John"
              error={errors.firstName}
              containerStyle={styles.halfInput}
            />

            <Input
              label="Last Name"
              value={formData.lastName}
              onChangeText={(text) => updateField('lastName', text)}
              placeholder="Doe"
              error={errors.lastName}
              containerStyle={styles.halfInput}
            />
          </View>

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

          <Text variant="body" style={styles.sectionLabel}>
            Select Your Location
          </Text>

          <TouchableOpacity
            style={[styles.selector, errors.ward && styles.selectorError]}
            onPress={() => setShowStatePicker(true)}
          >
            <View style={styles.selectorContent}>
              <Ionicons name="location-outline" size={20} color="#6B7280" />
              <Text 
                variant="body" 
                style={[
                  styles.selectorText,
                  !selectedState && styles.selectorPlaceholder,
                ]}
              >
                {selectedState?.name || 'Select State'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.selector, !selectedState && styles.selectorDisabled]}
            onPress={() => selectedState && setShowLgaPicker(true)}
            disabled={!selectedState}
          >
            <View style={styles.selectorContent}>
              <Ionicons name="business-outline" size={20} color="#6B7280" />
              <Text 
                variant="body" 
                style={[
                  styles.selectorText,
                  !selectedLga && styles.selectorPlaceholder,
                ]}
              >
                {selectedLga?.name || 'Select LGA'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.selector, !selectedLga && styles.selectorDisabled, errors.ward && styles.selectorError]}
            onPress={() => selectedLga && setShowWardPicker(true)}
            disabled={!selectedLga}
          >
            <View style={styles.selectorContent}>
              <Ionicons name="home-outline" size={20} color="#6B7280" />
              <Text 
                variant="body" 
                style={[
                  styles.selectorText,
                  !selectedWard && styles.selectorPlaceholder,
                ]}
              >
                {selectedWard?.name || 'Select Ward'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>
          {errors.ward && <Text variant="caption" style={styles.errorText}>{errors.ward}</Text>}

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

          <View style={styles.loginContainer}>
            <Text variant="caption" style={styles.loginText}>
              Already have an account?
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text variant="body" style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {renderPickerModal(
        showStatePicker,
        () => { setShowStatePicker(false); setSearchQuery(''); },
        'Select State',
        states,
        (state: State) => {
          setSelectedState(state);
          setSelectedLga(null);
          setSelectedWard(null);
        },
        selectedState?.id
      )}

      {renderPickerModal(
        showLgaPicker,
        () => { setShowLgaPicker(false); setSearchQuery(''); },
        'Select LGA',
        lgas,
        (lga: LGA) => {
          setSelectedLga(lga);
          setSelectedWard(null);
        },
        selectedLga?.id
      )}

      {renderPickerModal(
        showWardPicker,
        () => { setShowWardPicker(false); setSearchQuery(''); },
        'Select Ward',
        wards,
        setSelectedWard,
        selectedWard?.id
      )}
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
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    marginTop: 4,
  },
  titleContainer: {
    flex: 1,
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  sectionLabel: {
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    marginTop: 8,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    minHeight: 48,
  },
  selectorDisabled: {
    backgroundColor: '#F9FAFB',
    opacity: 0.6,
  },
  selectorError: {
    borderColor: '#EF4444',
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  selectorText: {
    color: '#111827',
    flex: 1,
  },
  selectorPlaceholder: {
    color: '#9CA3AF',
  },
  errorText: {
    color: '#EF4444',
    marginTop: -8,
    marginBottom: 12,
  },
  button: {
    marginTop: 16,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 32,
  },
  loginText: {
    color: '#6B7280',
  },
  loginLink: {
    color: '#00A86B',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    marginBottom: 0,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerItemSelected: {
    backgroundColor: '#F0FDF4',
  },
  pickerItemText: {
    color: '#374151',
  },
  pickerItemTextSelected: {
    color: '#00A86B',
    fontWeight: '600',
  },
  emptyList: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9CA3AF',
  },
});
