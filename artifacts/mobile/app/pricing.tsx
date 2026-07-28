import { useColors } from '@/hooks/useColors';
import { subscriptionApi, type SubscriptionPlan } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PricingScreen() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const colors = useColors();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    subscriptionApi.getPlans()
      .then(setPlans)
      .catch((e) => setError(e.message || 'Failed to load plans'))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectPlan = (planId: string | number) => {
    router.push({ pathname: '/register', params: { planId } });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
      <LinearGradient
        colors={['#3730A3', '#4F46E5', '#7C3AED']}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.title}>Choose a Plan</Text>
        <Text style={styles.subtitle}>Unlock unlimited learning potential</Text>
      </LinearGradient>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 40 }} />
        ) : error ? (
          <Text style={[styles.error, { color: '#EF4444' }]}>{error}</Text>
        ) : plans.length === 0 ? (
          <Text style={[styles.error, { color: colors.text }]}>No plans available.</Text>
        ) : (
          plans.map(plan => (
            <View key={plan.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.planName, { color: colors.text }]}>{plan.name}</Text>
              <Text style={[styles.planPrice, { color: '#4F46E5' }]}>
                ₹{plan.price}
              </Text>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={[styles.featureText, { color: colors.text }]}>
                  {plan.questionLimit === -1 ? 'Unlimited Questions' : `${plan.questionLimit} Questions`}
                </Text>
              </View>
              <Pressable
                style={styles.selectButton}
                onPress={() => handleSelectPlan(plan.id)}
              >
                <LinearGradient
                  colors={['#4F46E5', '#7C3AED']}
                  style={styles.selectButtonGrad}
                >
                  <Text style={styles.selectButtonText}>Select Plan</Text>
                </LinearGradient>
              </Pressable>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: {
    marginBottom: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  content: {
    padding: 20,
    gap: 16,
    marginTop: -20,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  planName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  featureText: {
    fontSize: 16,
  },
  selectButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  selectButtonGrad: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  error: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  }
});
