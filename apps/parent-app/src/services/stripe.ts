/**
 * Stripe Payment Service
 *
 * Provides payment functionality with fallback demo mode for Expo Go.
 * When @stripe/stripe-react-native is installed and available,
 * uses the native SDK. Otherwise, provides simulated functionality.
 *
 * Features:
 * - Payment intent creation
 * - Payment confirmation
 * - Payment method management
 * - Stripe Connect onboarding
 */

// Check if Stripe native module is available
let StripeModule: any = null;
let isStripeAvailable = false;

try {
  // Try to import Stripe native module
  // This will fail gracefully in Expo Go
  StripeModule = require("@stripe/stripe-react-native");
  isStripeAvailable = true;
} catch (e) {
  console.log("[Stripe] Native module not available, using demo mode");
  isStripeAvailable = false;
}

// Types
export interface PaymentIntent {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: "requires_payment_method" | "requires_confirmation" | "succeeded" | "canceled";
}

export interface PaymentMethod {
  id: string;
  type: "card" | "bank_account";
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  bank_account?: {
    bank_name: string;
    last4: string;
    routing_number: string;
  };
}

export interface StripeConnectAccount {
  id: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  requirements?: {
    currently_due: string[];
    eventually_due: string[];
  };
}

export interface CreatePaymentIntentParams {
  amount: number; // in cents
  currency?: string;
  payment_method_id?: string;
  metadata?: Record<string, string>;
}

export interface ConfirmPaymentParams {
  client_secret: string;
  payment_method_id?: string;
}

class StripeService {
  private publishableKey: string | null = null;
  private isInitialized = false;
  private demoMode = !isStripeAvailable;

  /**
   * Initialize Stripe SDK
   */
  async initialize(publishableKey: string): Promise<void> {
    this.publishableKey = publishableKey;

    if (isStripeAvailable && StripeModule?.initStripe) {
      try {
        await StripeModule.initStripe({
          publishableKey,
          merchantIdentifier: "merchant.com.commonground",
          urlScheme: "commonground",
        });
        this.isInitialized = true;
        this.demoMode = false;
        console.log("[Stripe] Native SDK initialized");
      } catch (error) {
        console.error("[Stripe] Failed to initialize native SDK:", error);
        this.demoMode = true;
      }
    } else {
      this.demoMode = true;
      this.isInitialized = true;
      console.log("[Stripe] Running in demo mode");
    }
  }

  /**
   * Check if running in demo mode
   */
  isDemoMode(): boolean {
    return this.demoMode;
  }

  /**
   * Check if SDK is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Create a payment intent (via your backend)
   * In production, this calls your API which calls Stripe
   */
  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntent> {
    if (this.demoMode) {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      return {
        id: `pi_demo_${Date.now()}`,
        client_secret: `pi_demo_${Date.now()}_secret_${Math.random().toString(36).substring(7)}`,
        amount: params.amount,
        currency: params.currency || "usd",
        status: "requires_payment_method",
      };
    }

    // In production, call your backend API
    // const response = await fetch('/api/payments/create-intent', {
    //   method: 'POST',
    //   body: JSON.stringify(params),
    // });
    // return response.json();

    throw new Error("Production payment intent creation not implemented");
  }

  /**
   * Confirm a payment
   */
  async confirmPayment(params: ConfirmPaymentParams): Promise<{
    paymentIntent?: PaymentIntent;
    error?: string;
  }> {
    if (this.demoMode) {
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 90% success rate in demo mode
      if (Math.random() > 0.1) {
        return {
          paymentIntent: {
            id: params.client_secret.split("_secret_")[0],
            client_secret: params.client_secret,
            amount: 0, // Not available in this context
            currency: "usd",
            status: "succeeded",
          },
        };
      } else {
        return {
          error: "Card declined. Please try a different payment method.",
        };
      }
    }

    if (isStripeAvailable && StripeModule?.confirmPayment) {
      try {
        const { paymentIntent, error } = await StripeModule.confirmPayment(
          params.client_secret,
          {
            paymentMethodType: "Card",
          }
        );

        if (error) {
          return { error: error.message };
        }

        return {
          paymentIntent: {
            id: paymentIntent.id,
            client_secret: params.client_secret,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
          },
        };
      } catch (e: any) {
        return { error: e.message || "Payment failed" };
      }
    }

    throw new Error("Stripe SDK not available");
  }

  /**
   * Get saved payment methods
   */
  async getPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    if (this.demoMode) {
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Return demo payment methods
      return [
        {
          id: "pm_demo_visa",
          type: "card",
          card: {
            brand: "Visa",
            last4: "4242",
            exp_month: 12,
            exp_year: 2027,
          },
        },
      ];
    }

    // In production, call your backend API
    throw new Error("Production payment method retrieval not implemented");
  }

  /**
   * Create a setup intent for saving a new payment method
   */
  async createSetupIntent(customerId: string): Promise<{
    clientSecret: string;
  }> {
    if (this.demoMode) {
      await new Promise((resolve) => setTimeout(resolve, 300));

      return {
        clientSecret: `seti_demo_${Date.now()}_secret_${Math.random().toString(36).substring(7)}`,
      };
    }

    // In production, call your backend API
    throw new Error("Production setup intent creation not implemented");
  }

  /**
   * Show the card input sheet (native only)
   */
  async presentPaymentSheet(): Promise<{
    error?: string;
  }> {
    if (this.demoMode) {
      // In demo mode, the UI handles card input
      return {};
    }

    if (isStripeAvailable && StripeModule?.presentPaymentSheet) {
      try {
        const { error } = await StripeModule.presentPaymentSheet();
        return { error: error?.message };
      } catch (e: any) {
        return { error: e.message };
      }
    }

    throw new Error("Stripe SDK not available");
  }

  /**
   * Initialize payment sheet (native only)
   */
  async initPaymentSheet(params: {
    paymentIntentClientSecret: string;
    customerId?: string;
    customerEphemeralKeySecret?: string;
    merchantDisplayName?: string;
  }): Promise<{
    error?: string;
  }> {
    if (this.demoMode) {
      return {};
    }

    if (isStripeAvailable && StripeModule?.initPaymentSheet) {
      try {
        const { error } = await StripeModule.initPaymentSheet({
          paymentIntentClientSecret: params.paymentIntentClientSecret,
          customerId: params.customerId,
          customerEphemeralKeySecret: params.customerEphemeralKeySecret,
          merchantDisplayName: params.merchantDisplayName || "CommonGround",
          allowsDelayedPaymentMethods: false,
          style: "automatic",
        });
        return { error: error?.message };
      } catch (e: any) {
        return { error: e.message };
      }
    }

    throw new Error("Stripe SDK not available");
  }

  /**
   * Start Stripe Connect onboarding
   */
  async createConnectOnboardingLink(accountId: string): Promise<{
    url: string;
    expiresAt: number;
  }> {
    if (this.demoMode) {
      await new Promise((resolve) => setTimeout(resolve, 500));

      // In demo mode, return a simulated URL
      return {
        url: "https://connect.stripe.com/demo-onboarding",
        expiresAt: Date.now() + 3600000, // 1 hour from now
      };
    }

    // In production, call your backend API
    throw new Error("Production Connect onboarding not implemented");
  }

  /**
   * Get Connect account status
   */
  async getConnectAccountStatus(accountId: string): Promise<StripeConnectAccount> {
    if (this.demoMode) {
      await new Promise((resolve) => setTimeout(resolve, 300));

      return {
        id: accountId,
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
        requirements: {
          currently_due: [],
          eventually_due: [],
        },
      };
    }

    // In production, call your backend API
    throw new Error("Production Connect status check not implemented");
  }
}

// Export singleton instance
export const stripeService = new StripeService();

// Export for testing
export { StripeService };
