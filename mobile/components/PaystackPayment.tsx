import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';

export interface PaystackPaymentProps {
  visible: boolean;
  amount: number;
  email: string;
  reference: string;
  publicKey: string;
  metadata?: Record<string, any>;
  onSuccess: (response: any) => void;
  onCancel: () => void;
  onError?: (error: string) => void;
}

export function PaystackPayment({
  visible,
  amount,
  email,
  reference,
  publicKey,
  metadata = {},
  onSuccess,
  onCancel,
  onError,
}: PaystackPaymentProps) {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);

  const handleWebViewMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'success') {
        onSuccess(data.payload);
        handleClose();
      } else if (data.type === 'close') {
        handleClose();
      } else if (data.type === 'error') {
        onError?.(data.payload?.message || 'Payment error occurred');
        handleClose();
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
      onError?.('Failed to process payment response');
    }
  };

  const handleClose = () => {
    setLoading(true);
    onCancel();
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://js.paystack.co/v1/inline.js"></script>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background-color: #f9fafb;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 16px;
        }
        .container {
          background: white;
          border-radius: 12px;
          padding: 32px;
          max-width: 400px;
          width: 100%;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 32px;
        }
        .amount {
          font-size: 32px;
          font-weight: 700;
          color: #00a86b;
          margin-bottom: 8px;
        }
        .label {
          font-size: 14px;
          color: #6b7280;
        }
        .button {
          width: 100%;
          padding: 14px 24px;
          background-color: #00a86b;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
          margin-top: 16px;
        }
        .button:hover {
          background-color: #008a5a;
        }
        .button:active {
          opacity: 0.9;
        }
        .button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .loading {
          text-align: center;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="amount">N${amount.toLocaleString()}</div>
          <div class="label">Complete your payment</div>
        </div>
        <button id="payButton" class="button">Pay with Paystack</button>
      </div>

      <script>
        const paymentHandler = PaystackPop.setup({
          key: '${publicKey}',
          email: '${email}',
          amount: ${amount * 100},
          ref: '${reference}',
          ${metadata ? `metadata: ${JSON.stringify(metadata)},` : ''}
          onClose: function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'close'
            }));
          },
          onSuccess: function(transaction) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'success',
              payload: {
                reference: transaction.reference,
                status: transaction.status,
                message: transaction.message
              }
            }));
          }
        });

        document.getElementById('payButton').addEventListener('click', function() {
          paymentHandler.openIframe();
        });

        // Auto-open on load
        window.addEventListener('load', function() {
          setTimeout(() => {
            paymentHandler.openIframe();
          }, 500);
        });
      </script>
    </body>
    </html>
  `;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#111827" />
          </TouchableOpacity>
          <Text variant="h3" style={styles.title}>Payment</Text>
          <View style={{ width: 40 }} />
        </View>

        {visible && (
          <WebView
            ref={webViewRef}
            source={{ html: htmlContent }}
            onMessage={handleWebViewMessage}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            startInLoadingState
            scalesPageToFit
            javaScriptEnabled
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#00A86B" />
                <Text variant="body" style={styles.loadingText}>
                  Loading payment...
                </Text>
              </View>
            )}
            style={styles.webview}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  webview: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    color: '#6B7280',
    marginTop: 12,
  },
});
