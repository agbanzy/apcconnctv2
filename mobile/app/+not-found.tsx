import { View, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text variant="h1" style={styles.title}>
        404
      </Text>
      <Text variant="h2" style={styles.subtitle}>
        Page Not Found
      </Text>
      <Text variant="body" style={styles.description}>
        The page you're looking for doesn't exist.
      </Text>
      <Link href="/(tabs)" asChild>
        <Button title="Go to Dashboard" />
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 72,
    color: '#00A86B',
    marginBottom: 16,
  },
  subtitle: {
    marginBottom: 12,
  },
  description: {
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: 32,
  },
});
