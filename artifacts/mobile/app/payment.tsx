import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useColors } from '@/hooks/useColors';
import { eduApi, subscriptionApi, type Subject } from '@/services/api';

export interface PlanItem {
  id: number | string;
  name: string;
  price: number;
  questionLimit?: number;
  accessScope?: string;
  durationDays?: number | null;
  subjectId?: number | string | null;
  description?: string;
  isActive?: boolean;
  discountPercent?: number;
  promoCode?: string;
}

export default function PaymentScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 860;

  const params = useLocalSearchParams<{ subjectId?: string }>();
  const {
    studentName,
    studentEmail,
    boardId,
    standardId,
    boardName,
    standardName,
    isSubjectUnlocked,
    unlockSubject,
    refreshSubscription,
  } = useApp();

  const { razorpayKey } = useAppSettings();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | number | null>(
    params.subjectId || null
  );
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | number | null>(null);

  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [promoMessage, setPromoMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [paymentSuccess, setPaymentSuccess] = useState<{
    subjectName: string;
    planName: string;
    amount: number;
  } | null>(null);

  // 1. Fetch subjects
  useEffect(() => {
    if (!boardId || !standardId) {
      setLoadingSubjects(false);
      return;
    }
    eduApi
      .getSubjects(boardId, standardId)
      .then((data) => {
        setSubjects(data);
        if (!selectedSubjectId && data.length > 0) {
          setSelectedSubjectId(data[0].id || (data[0] as any)._id);
        }
        setLoadingSubjects(false);
      })
      .catch((err) => {
        console.error('Failed to load subjects', err);
        setLoadingSubjects(false);
      });
  }, [boardId, standardId]);

  // 2. Fetch real plans directly from admin backend
  useEffect(() => {
    if (!selectedSubjectId) return;
    setLoadingPlans(true);

    const sId = encodeURIComponent(String(selectedSubjectId));
    fetch(`https://kpark-edu.web.app/api/plans?subjectId=${sId}`)
      .then((res) => res.json())
      .then((json) => {
        const rawPlans: PlanItem[] = json?.data || (Array.isArray(json) ? json : []);
        if (rawPlans && rawPlans.length > 0) {
          setPlans(rawPlans);
          setSelectedPlanId(rawPlans[0].id);
        }
        setLoadingPlans(false);
      })
      .catch((err) => {
        console.warn('Failed to load real plans from API, falling back', err);
        subscriptionApi
          .getPlans()
          .then((raw: any) => {
            const arr = Array.isArray(raw) ? raw : raw?.data ?? [];
            if (arr.length > 0) {
              setPlans(arr);
              setSelectedPlanId(arr[0].id);
            }
            setLoadingPlans(false);
          })
          .catch(() => setLoadingPlans(false));
      });
  }, [selectedSubjectId, subjects]);

  const selectedSubject = subjects.find(
    (s) => String(s.id || (s as any)._id) === String(selectedSubjectId)
  );
  const selectedPlan = plans.find((p) => String(p.id) === String(selectedPlanId));
  const isUnlocked = selectedSubjectId ? isSubjectUnlocked(selectedSubjectId) : false;

  const basePrice = selectedPlan?.price || 0;
  const discountAmount = discountPercent > 0 ? Math.round((basePrice * discountPercent) / 100) : 0;
  const finalPrice = Math.max(1, basePrice - discountAmount);

  const handleApplyPromo = () => {
    setPromoMessage(null);
    const code = promoCode.trim().toUpperCase();
    if (!code) return;

    if (selectedPlan?.promoCode && selectedPlan.promoCode.toUpperCase() === code) {
      setAppliedPromo(code);
      setDiscountPercent(selectedPlan.discountPercent || 15);
      setPromoMessage({ type: 'success', text: `Coupon ${code} applied! ${selectedPlan.discountPercent || 15}% OFF` });
    } else if (code === 'STUDENT10' || code === 'KPARK10') {
      setAppliedPromo(code);
      setDiscountPercent(10);
      setPromoMessage({ type: 'success', text: `Coupon ${code} applied! 10% discount added.` });
    } else if (code === 'EXAMPRO' || code === 'SUPER20') {
      setAppliedPromo(code);
      setDiscountPercent(20);
      setPromoMessage({ type: 'success', text: `Coupon ${code} applied! 20% discount added.` });
    } else {
      setPromoMessage({ type: 'error', text: 'Invalid coupon code.' });
    }
  };

  const handleCheckout = async () => {
    if (!selectedPlan) {
      Alert.alert('Selection Required', 'Please select a plan to proceed.');
      return;
    }
    if (!studentEmail) {
      router.push('/login');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Create order on backend
      let orderId = `order_${Date.now()}`;
      try {
        const orderRes = await subscriptionApi.createOrder({
          planId: selectedPlan.id,
          promoCode: appliedPromo || undefined,
        });
        if (orderRes?.orderId) {
          orderId = orderRes.orderId;
        }
      } catch (e) {
        console.warn('Backend order call failed, using client order id', e);
      }

      const activeRazorpayKey = razorpayKey || 'rzp_live_TaEcWWlM0Ib5Ac';

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const loadScript = (src: string) =>
          new Promise<boolean>((resolve) => {
            if ((window as any).Razorpay) return resolve(true);
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
          });

        const loaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
        if (!loaded) {
          Alert.alert('Payment Error', 'Failed to load Razorpay checkout script. Please check your internet connection.');
          setIsProcessing(false);
          return;
        }

        const options = {
          key: activeRazorpayKey,
          amount: Math.round(finalPrice * 100),
          currency: 'INR',
          name: 'Knowledge Park',
          description: `Unlock ${selectedSubject?.name || 'Subject'}: ${selectedPlan.name}`,
          image: '/favicon.svg',
          order_id: orderId.startsWith('order_') ? undefined : orderId,
          prefill: {
            name: studentName || 'Student',
            email: studentEmail || 'student@kpark.com',
          },
          theme: {
            color: '#C85C3E',
          },
          handler: async (response: any) => {
            try {
              if (selectedSubjectId) {
                await unlockSubject(selectedSubjectId);
              }
              await refreshSubscription();
              setPaymentSuccess({
                subjectName: selectedSubject?.name || 'Subject',
                planName: selectedPlan.name,
                amount: finalPrice,
              });
            } catch (err) {
              console.error('Error activating plan', err);
            } finally {
              setIsProcessing(false);
            }
          },
          modal: {
            ondismiss: () => {
              setIsProcessing(false);
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', (resp: any) => {
          Alert.alert('Payment Failed', resp?.error?.description || 'Payment was not completed.');
          setIsProcessing(false);
        });
        rzp.open();
      } else {
        // Native fallback: navigate to WebView checkout or simulate
        router.push({
          pathname: '/checkout',
          params: {
            orderId,
            amount: String(Math.round(finalPrice * 100)),
            currency: 'INR',
            token: '',
            email: studentEmail,
            name: studentName || 'Student',
            activePlanId: String(selectedPlan.id),
            activePlanName: selectedPlan.name,
          },
        });
        setIsProcessing(false);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to initialize payment');
      setIsProcessing(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: '#FDFBF7' }]}>
      {/* Header */}
      <LinearGradient
        colors={['#C85C3E', '#9E3F2B']}
        style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 16 : 8) }]}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/subjects'))}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Subject Access & Plans</Text>
            <Text style={styles.headerSubtitle}>
              {boardName || 'Curriculum'} • {standardName || 'Standard'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[
          styles.scrollBody,
          isDesktop && styles.desktopScrollBody,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Payment Success View */}
        {paymentSuccess ? (
          <View style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>Subject Unlocked!</Text>
            <Text style={styles.successDesc}>
              Congratulations! Full access to <Text style={{ fontWeight: '800' }}>{paymentSuccess.subjectName}</Text> has been successfully activated.
            </Text>
            <View style={styles.successReceipt}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Plan</Text>
                <Text style={styles.receiptValue}>{paymentSuccess.planName}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Amount Paid</Text>
                <Text style={[styles.receiptValue, { color: '#C85C3E', fontWeight: '800' }]}>
                  ₹{paymentSuccess.amount}
                </Text>
              </View>
            </View>
            <Pressable
              style={styles.actionBtn}
              onPress={() =>
                router.replace({
                  pathname: '/chapters',
                  params: {
                    subjectId: String(selectedSubjectId),
                    subjectName: selectedSubject?.name || 'Subject',
                    mode: 'explanation',
                  },
                })
              }
            >
              <Text style={styles.actionBtnText}>Start Learning Now</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </Pressable>
          </View>
        ) : (
          <View style={[styles.container, isDesktop && styles.desktopRow]}>
            {/* Left Column: Subject Selector */}
            <View style={[styles.colLeft, isDesktop && styles.desktopColLeft]}>
              <Text style={styles.sectionHeading}>1. Select Subject</Text>
              <Text style={styles.sectionSub}>Choose which subject you want to unlock access for</Text>

              {loadingSubjects ? (
                <ActivityIndicator size="small" color="#C85C3E" style={{ marginVertical: 20 }} />
              ) : (
                <View style={styles.subjectList}>
                  {subjects.map((sub) => {
                    const sId = sub.id || (sub as any)._id;
                    const isSel = String(sId) === String(selectedSubjectId);
                    const subUnlocked = isSubjectUnlocked(sId);

                    return (
                      <Pressable
                        key={String(sId)}
                        onPress={() => setSelectedSubjectId(sId)}
                        style={[
                          styles.subjectCard,
                          isSel && styles.subjectCardSelected,
                        ]}
                      >
                        <View style={styles.subjectInfo}>
                          <View
                            style={[
                              styles.subjectIconBg,
                              subUnlocked
                                ? { backgroundColor: '#ECFDF5' }
                                : { backgroundColor: '#FEE2E2' },
                            ]}
                          >
                            <Ionicons
                              name={subUnlocked ? 'book' : 'lock-closed'}
                              size={18}
                              color={subUnlocked ? '#10B981' : '#DC2626'}
                            />
                          </View>
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text
                              style={[
                                styles.subjectName,
                                isSel && { color: '#9E3F2B', fontWeight: '800' },
                              ]}
                            >
                              {sub.name}
                            </Text>
                            <Text style={styles.subjectCode}>
                              Code: {sub.code || 'N/A'}
                            </Text>
                          </View>
                        </View>

                        <View
                          style={[
                            styles.statusBadge,
                            subUnlocked
                              ? { backgroundColor: '#D1FAE5', borderColor: '#A7F3D0' }
                              : { backgroundColor: '#FEE2E2', borderColor: '#FECACA' },
                          ]}
                        >
                          <Ionicons
                            name={subUnlocked ? 'lock-open-outline' : 'lock-closed-outline'}
                            size={12}
                            color={subUnlocked ? '#065F46' : '#991B1B'}
                          />
                          <Text
                            style={[
                              styles.statusBadgeText,
                              subUnlocked ? { color: '#065F46' } : { color: '#991B1B' },
                            ]}
                          >
                            {subUnlocked ? 'Unlocked' : 'Locked'}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Right Column: Plans & Razorpay Checkout */}
            <View style={[styles.colRight, isDesktop && styles.desktopColRight]}>
              <Text style={styles.sectionHeading}>
                2. Choose Access Plan for {selectedSubject?.name || 'Subject'}
              </Text>
              <Text style={styles.sectionSub}>Select the duration and features that fit your goals</Text>

              {isUnlocked && (
                <View style={styles.alreadyUnlockedBanner}>
                  <Ionicons name="checkmark-circle" size={20} color="#059669" />
                  <Text style={styles.alreadyUnlockedText}>
                    You already have active access to this subject! You can still extend your plan or add booster packs.
                  </Text>
                </View>
              )}

              {loadingPlans ? (
                <ActivityIndicator size="small" color="#C85C3E" style={{ marginVertical: 30 }} />
              ) : (
                <View style={styles.plansContainer}>
                  {plans.map((p) => {
                    const isPlanSel = String(p.id) === String(selectedPlanId);
                    return (
                      <Pressable
                        key={String(p.id)}
                        onPress={() => setSelectedPlanId(p.id)}
                        style={[styles.planCard, isPlanSel && styles.planCardSelected]}
                      >
                        <View style={styles.planHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.planName}>{p.name}</Text>
                            {p.description && (
                              <Text style={styles.planDesc}>{p.description}</Text>
                            )}
                          </View>
                          <View style={styles.planPriceWrap}>
                            <Text style={styles.planCurrency}>₹</Text>
                            <Text style={styles.planPrice}>{p.price}</Text>
                          </View>
                        </View>

                        <View style={styles.planFeatures}>
                          <View style={styles.featureItem}>
                            <Ionicons name="checkmark-circle-outline" size={15} color="#10B981" />
                            <Text style={styles.featureText}>
                              {p.questionLimit ? `${p.questionLimit} Practice Questions` : 'Unlimited Practice Questions'}
                            </Text>
                          </View>
                          <View style={styles.featureItem}>
                            <Ionicons name="checkmark-circle-outline" size={15} color="#10B981" />
                            <Text style={styles.featureText}>
                              {p.durationDays ? `${p.durationDays} Days Full Validity` : 'Full Year Validity'}
                            </Text>
                          </View>
                          <View style={styles.featureItem}>
                            <Ionicons name="checkmark-circle-outline" size={15} color="#10B981" />
                            <Text style={styles.featureText}>Full Syllabus Chapter Quizzes & AI Solutions</Text>
                          </View>
                        </View>

                        <View style={styles.selectRadioRow}>
                          <View
                            style={[
                              styles.radioCircle,
                              isPlanSel && styles.radioCircleSelected,
                            ]}
                          >
                            {isPlanSel && <View style={styles.radioInner} />}
                          </View>
                          <Text style={[styles.selectRadioText, isPlanSel && { fontWeight: '700', color: '#9E3F2B' }]}>
                            {isPlanSel ? 'Selected Plan' : 'Select Plan'}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {/* Coupon Code Section */}
              <View style={styles.couponCard}>
                <Text style={styles.couponLabel}>Have a Promo or Coupon Code?</Text>
                <View style={styles.couponInputRow}>
                  <TextInput
                    style={styles.couponInput}
                    placeholder="e.g. STUDENT10, EXAMPRO"
                    value={promoCode}
                    onChangeText={setPromoCode}
                    autoCapitalize="characters"
                  />
                  <Pressable style={styles.couponBtn} onPress={handleApplyPromo}>
                    <Text style={styles.couponBtnText}>Apply</Text>
                  </Pressable>
                </View>
                {promoMessage && (
                  <Text
                    style={[
                      styles.promoMessage,
                      promoMessage.type === 'success' ? { color: '#059669' } : { color: '#DC2626' },
                    ]}
                  >
                    {promoMessage.text}
                  </Text>
                )}
              </View>

              {/* Order Summary & Pay Button */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Plan Base Price</Text>
                  <Text style={styles.summaryVal}>₹{basePrice}</Text>
                </View>
                {discountAmount > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: '#059669' }]}>
                      Coupon Discount ({discountPercent}%)
                    </Text>
                    <Text style={[styles.summaryVal, { color: '#059669' }]}>-₹{discountAmount}</Text>
                  </View>
                )}
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.totalLabel}>Total Payable</Text>
                  <Text style={styles.totalAmount}>₹{finalPrice}</Text>
                </View>

                <Pressable
                  style={[styles.checkoutBtn, isProcessing && { opacity: 0.7 }]}
                  onPress={handleCheckout}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="card-outline" size={20} color="#FFF" />
                      <Text style={styles.checkoutBtnText}>
                        Pay ₹{finalPrice} with Razorpay
                      </Text>
                    </>
                  )}
                </Pressable>
                <Text style={styles.securityNote}>
                  <Ionicons name="shield-checkmark" size={12} color="#8B786B" /> 100% Secure 256-Bit SSL Encrypted Checkout via Razorpay
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  headerSubtitle: { color: '#FED7AA', fontSize: 12, marginTop: 2, fontWeight: '500' },
  scrollBody: { padding: 16 },
  desktopScrollBody: { maxWidth: 1100, alignSelf: 'center', width: '100%', padding: 28 },
  container: { gap: 20 },
  desktopRow: { flexDirection: 'row', alignItems: 'flex-start' },
  colLeft: { flex: 1 },
  desktopColLeft: { flex: 0.9, marginRight: 20 },
  colRight: { flex: 1.1 },
  desktopColRight: { flex: 1.1 },
  sectionHeading: { fontSize: 17, fontWeight: '800', color: '#3D2D27', marginBottom: 4 },
  sectionSub: { fontSize: 13, color: '#76645B', marginBottom: 14 },
  subjectList: { gap: 10 },
  subjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#E6DCD2',
  },
  subjectCardSelected: {
    borderColor: '#C85C3E',
    backgroundColor: '#FFF8F4',
  },
  subjectInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  subjectIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectName: { fontSize: 14, fontWeight: '700', color: '#3D2D27' },
  subjectCode: { fontSize: 11, color: '#8B786B', marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  alreadyUnlockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  alreadyUnlockedText: { color: '#065F46', fontSize: 12, flex: 1, fontWeight: '600', lineHeight: 17 },
  plansContainer: { gap: 12, marginBottom: 16 },
  planCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E6DCD2',
  },
  planCardSelected: {
    borderColor: '#C85C3E',
    backgroundColor: '#FFF9F5',
  },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  planName: { fontSize: 15, fontWeight: '800', color: '#3D2D27' },
  planDesc: { fontSize: 12, color: '#76645B', marginTop: 4, lineHeight: 16 },
  planPriceWrap: { flexDirection: 'row', alignItems: 'flex-start', marginLeft: 10 },
  planCurrency: { fontSize: 14, fontWeight: '700', color: '#C85C3E', marginTop: 2 },
  planPrice: { fontSize: 24, fontWeight: '900', color: '#C85C3E' },
  planFeatures: { gap: 6, marginVertical: 10, borderTopWidth: 1, borderTopColor: '#F2ECE4', paddingTop: 10 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featureText: { fontSize: 12, color: '#4B3F39', fontWeight: '500' },
  selectRadioRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D4C5B9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: { borderColor: '#C85C3E' },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#C85C3E' },
  selectRadioText: { fontSize: 12, color: '#8B786B' },
  couponCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6DCD2',
    marginBottom: 16,
  },
  couponLabel: { fontSize: 13, fontWeight: '700', color: '#3D2D27', marginBottom: 8 },
  couponInputRow: { flexDirection: 'row', gap: 8 },
  couponInput: {
    flex: 1,
    backgroundColor: '#FAF7F2',
    borderWidth: 1,
    borderColor: '#E6DCD2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#3D2D27',
  },
  couponBtn: {
    backgroundColor: '#3D2D27',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  couponBtnText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  promoMessage: { fontSize: 11, fontWeight: '700', marginTop: 6 },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E6DCD2',
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 13, color: '#76645B' },
  summaryVal: { fontSize: 14, fontWeight: '700', color: '#3D2D27' },
  summaryDivider: { height: 1, backgroundColor: '#E6DCD2', marginVertical: 8 },
  totalLabel: { fontSize: 15, fontWeight: '800', color: '#3D2D27' },
  totalAmount: { fontSize: 20, fontWeight: '900', color: '#C85C3E' },
  checkoutBtn: {
    backgroundColor: '#C85C3E',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  checkoutBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  securityNote: { fontSize: 10, color: '#8B786B', textAlign: 'center', marginTop: 10 },
  successCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#E6DCD2',
  },
  successIconWrap: { marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: '900', color: '#10B981', marginBottom: 8 },
  successDesc: { fontSize: 14, color: '#4B3F39', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  successReceipt: { width: '100%', backgroundColor: '#F8F4EE', padding: 16, borderRadius: 12, marginBottom: 20 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  receiptLabel: { fontSize: 13, color: '#76645B' },
  receiptValue: { fontSize: 13, fontWeight: '700', color: '#3D2D27' },
  actionBtn: {
    width: '100%',
    backgroundColor: '#C85C3E',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});

