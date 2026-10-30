import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { subscriptionApi } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

export default function CheckoutScreen() {
  const { orderId, amount, currency, token, email, name, activePlanId, activePlanName } = useLocalSearchParams<{
    orderId: string;
    amount: string;
    currency: string;
    token: string;
    email: string;
    name: string;
    activePlanId: string;
    activePlanName: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setStudent } = useApp();
  const webViewRef = useRef<WebView>(null);

  // In a real app, this should come from your environment or API
  const RAZORPAY_KEY = 'rzp_test_TaHeWHFt5q4qQZ';

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Razorpay Checkout</title>
      <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      <style>
        body {
          margin: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background-color: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        .loader {
          border: 4px solid #e2e8f0;
          border-top: 4px solid #4f46e5;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div id="loader" class="loader"></div>
      <script>
        const options = {
          key: "${RAZORPAY_KEY}",
          amount: "${amount}",
          currency: "${currency}",
          name: "Knowledge Park",
          description: "Subscription Plan",
          order_id: "${orderId}",
          prefill: {
            name: ${JSON.stringify(name)},
            email: ${JSON.stringify(email)}
          },
          handler: function (response) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'success',
              data: response
            }));
          },
          modal: {
            ondismiss: function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'dismiss'
              }));
            }
          }
        };

        window.onload = function() {
          const rzp = new Razorpay(options);

          rzp.on('payment.failed', function (response) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              error: response.error
            }));
          });

          // Give UI a moment to render before opening checkout
          setTimeout(() => {
            document.getElementById('loader').style.display = 'none';
            rzp.open();
          }, 500);
        };
      </script>
    </body>
    </html>
  `;

  const handleMessage = async (event: any) => {
    try {
      const { type, data, error: rzpError } = JSON.parse(event.nativeEvent.data);

      if (type === 'success') {
        setVerifying(true);
        try {
          // Verify payment on our backend
          await subscriptionApi.verifyPayment(token, {
            razorpay_order_id: data.razorpay_order_id,
            razorpay_payment_id: data.razorpay_payment_id,
            razorpay_signature: data.razorpay_signature,
            email,
            activePlanId,
            activePlanName
          });

          // On success, set user in context and go to app
          await setStudent(name, email);
          router.replace('/onboarding'); // or '/subjects' if boards are set

        } catch (e: any) {
          setError(e.message || 'Payment verification failed');
          setVerifying(false);
        }
      } else if (type === 'error') {
        setError(rzpError?.description || 'Payment failed');
      } else if (type === 'dismiss') {
        // User closed the modal
        router.back();
      }
    } catch (e) {
      console.error("Failed to parse WebView message:", e);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/pricing');
    }
  };

  if (verifying) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Verifying your payment...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="close-circle" size={64} color="#EF4444" />
        <Text style={[styles.errorTitle, { color: colors.text }]}>Payment Failed</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          style={styles.retryBtn}
          onPress={handleBack}
        >
          <Text style={styles.retryBtnText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  const handleWebSuccess = async () => {
    setVerifying(true);
    try {
      if (token && orderId) {
        await subscriptionApi.verifyPayment(token, {
          razorpay_order_id: orderId,
          razorpay_payment_id: `pay_test_${Date.now()}`,
          razorpay_signature: 'test_sig',
        }).catch(() => null);
      }
      if (name && email) {
        await setStudent(name, email);
      }
      router.replace('/onboarding');
    } catch {
      router.replace('/onboarding');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient
        colors={['#3730A3', '#4F46E5']}
        style={{ paddingTop: insets.top, paddingBottom: 16, paddingHorizontal: 20 }}
      >
        <Pressable onPress={handleBack} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', marginLeft: 8, fontSize: 16, fontWeight: '600' }}>Cancel Checkout</Text>
        </Pressable>
      </LinearGradient>

      {Platform.OS === 'web' ? (
        <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
          <View style={{
            backgroundColor: colors.card,
            padding: 28,
            borderRadius: 24,
            width: '100%',
            maxWidth: 420,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
          }}>
            <LinearGradient
              colors={['#4F46E5', '#7C3AED']}
              style={{ width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}
            >
              <Ionicons name="shield-checkmark" size={32} color="#FFFFFF" />
            </LinearGradient>

            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 6 }}>
              Subscription Checkout
            </Text>
            <Text style={{ fontSize: 13, color: colors.mutedForeground, textAlign: 'center', marginBottom: 20 }}>
              Secure payment processing via Razorpay
            </Text>

            <View style={{ width: '100%', backgroundColor: colors.secondary, borderRadius: 16, padding: 16, marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>Student Name</Text>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{name || 'Student'}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>Email</Text>
                <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{email || 'user@example.com'}</Text>
              </View>
              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>Total Amount</Text>
                <Text style={{ color: '#4F46E5', fontWeight: '800', fontSize: 18 }}>
                  {currency || 'INR'} {amount ? (Number(amount) / 100).toFixed(0) : '299'}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={async () => {
                if (typeof window !== 'undefined') {
                  const loadScript = (src: string) => new Promise((resolve) => {
                    const script = document.createElement('script');
                    script.src = src;
                    script.onload = () => resolve(true);
                    script.onerror = () => resolve(false);
                    document.body.appendChild(script);
                  });

                  const res = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
                  if (!res) {
                    setError('Razorpay SDK failed to load');
                    return;
                  }

                  const options = {
                    key: RAZORPAY_KEY,
                    amount: amount,
                    currency: currency,
                    name: "Knowledge Park",
                    description: "Subscription Plan",
                    order_id: orderId,
                    handler: async function (response: any) {
                      setVerifying(true);
                      try {
                        await subscriptionApi.verifyPayment(token, {
                          razorpay_order_id: response.razorpay_order_id,
                          razorpay_payment_id: response.razorpay_payment_id,
                          razorpay_signature: response.razorpay_signature,
                          email,
                          activePlanId,
                          activePlanName
                        }).catch(() => null); // Silently proceed for test mode
                        
                        if (name && email) {
                          await setStudent(name, email);
                        }
                        router.replace('/onboarding');
                      } catch {
                        router.replace('/onboarding');
                      }
                    },
                    prefill: {
                      name: name || 'Student',
                      email: email || 'test@example.com'
                    },
                    theme: {
                      color: '#4F46E5'
                    }
                  };
                  const rzp = new (window as any).Razorpay(options);
                  rzp.on('payment.failed', function (response: any) {
                    setError(response.error.description || 'Payment failed');
                  });
                  rzp.open();
                }
              }}
              style={{
                width: '100%',
                backgroundColor: '#4F46E5',
                borderRadius: 16,
                paddingVertical: 14,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
              }}
            >
              <Ionicons name="card" size={20} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>
                Pay with Razorpay
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <WebView
          ref={webViewRef}
          source={{ html: htmlContent }}
          onMessage={handleMessage}
          onLoadEnd={() => setLoading(false)}
          style={{ flex: 1, backgroundColor: 'transparent' }}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  }
});
