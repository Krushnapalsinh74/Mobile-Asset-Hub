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
  const { orderId, amount, currency, token, email, name } = useLocalSearchParams<{
    orderId: string;
    amount: string;
    currency: string;
    token: string;
    email: string;
    name: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setStudent } = useApp();
  const webViewRef = useRef<WebView>(null);

  // In a real app, this should come from your environment or API
  const RAZORPAY_KEY = 'rzp_test_YourKeyIdHere';

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
            razorpay_signature: data.razorpay_signature
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
          onPress={() => router.back()}
        >
          <Text style={styles.retryBtnText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient
        colors={['#3730A3', '#4F46E5']}
        style={{ paddingTop: insets.top, paddingBottom: 16, paddingHorizontal: 20 }}
      >
        <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', marginLeft: 8, fontSize: 16, fontWeight: '600' }}>Cancel Checkout</Text>
        </Pressable>
      </LinearGradient>

      {Platform.OS === 'web' ? (
        <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
           <Text style={{ color: colors.text }}>WebView is not fully supported on Web. Open on iOS/Android.</Text>
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
