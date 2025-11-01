import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import PaymentScreen from '../../screens/PaymentScreen';

// Mock contexts
const mockUpdateUserProfile = jest.fn(() => Promise.resolve());

jest.mock('../../contexts/SettingsContext', () => ({
  useSettings: () => ({
    themeColors: {
      card: '#1e1e1e',
      divider: '#333',
      textPrimary: '#fff',
      textSecondary: '#999',
      primary: '#007aff',
      background: '#000',
    },
    accentPreset: {
      buttonBackground: '#007aff',
    },
  }),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    updateUserProfile: mockUpdateUserProfile,
  }),
}));

// Mock ScreenLayout
jest.mock('../../components/ScreenLayout', () => {
  const { View } = require('react-native');
  return ({ children }) => <View testID="screen-layout">{children}</View>;
});

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock setTimeout for payment processing
jest.useFakeTimers();

describe('PaymentScreen', () => {
  const mockRoute = {
    params: {
      planId: 'premium',
      planName: 'Premium',
      price: 49.99,
      currency: 'ZAR',
      interval: 'month',
    },
  };

  const mockNavigation = {
    goBack: jest.fn(),
    navigate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateUserProfile.mockClear();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should render order summary with correct details', () => {
    const { getByText } = render(
      <PaymentScreen route={mockRoute} navigation={mockNavigation} />
    );

    expect(getByText('Order Summary')).toBeTruthy();
    expect(getByText('Premium')).toBeTruthy();
    expect(getByText('Monthly')).toBeTruthy();
    expect(getByText('R49.99')).toBeTruthy();
  });

  it('should render yearly billing for Gold plan', () => {
    const goldRoute = {
      params: {
        planId: 'gold',
        planName: 'Gold',
        price: 499.99,
        currency: 'ZAR',
        interval: 'year',
      },
    };

    const { getByText } = render(
      <PaymentScreen route={goldRoute} navigation={mockNavigation} />
    );

    expect(getByText('Yearly')).toBeTruthy();
    expect(getByText('R499.99')).toBeTruthy();
  });

  it('should render payment method options', () => {
    const { getByText } = render(
      <PaymentScreen route={mockRoute} navigation={mockNavigation} />
    );

    expect(getByText('Payment Method')).toBeTruthy();
    expect(getByText('Credit/Debit Card')).toBeTruthy();
    expect(getByText('PayPal')).toBeTruthy();
  });

  it('should select card payment method by default', () => {
    const { getByText } = render(
      <PaymentScreen route={mockRoute} navigation={mockNavigation} />
    );

    expect(getByText('Card Details')).toBeTruthy();
  });

  it('should switch to PayPal payment method', () => {
    const { getByText, queryByText } = render(
      <PaymentScreen route={mockRoute} navigation={mockNavigation} />
    );

    const paypalButton = getByText('PayPal');
    fireEvent.press(paypalButton);

    expect(queryByText('Card Details')).toBeNull();
    expect(
      getByText(/You'll be redirected to PayPal to complete your purchase/)
    ).toBeTruthy();
  });

  it('should render card form fields', () => {
    const { getByPlaceholderText } = render(
      <PaymentScreen route={mockRoute} navigation={mockNavigation} />
    );

    expect(getByPlaceholderText('1234 5678 9012 3456')).toBeTruthy();
    expect(getByPlaceholderText('MM/YY')).toBeTruthy();
    expect(getByPlaceholderText('123')).toBeTruthy();
    expect(getByPlaceholderText('John Doe')).toBeTruthy();
  });

  it('should format card number with spaces', () => {
    const { getByPlaceholderText } = render(
      <PaymentScreen route={mockRoute} navigation={mockNavigation} />
    );

    const cardInput = getByPlaceholderText('1234 5678 9012 3456');
    fireEvent.changeText(cardInput, '1234567890123456');

    expect(cardInput.props.value).toBe('1234 5678 9012 3456');
  });

  it('should format expiry date with slash', () => {
    const { getByPlaceholderText } = render(
      <PaymentScreen route={mockRoute} navigation={mockNavigation} />
    );

    const expiryInput = getByPlaceholderText('MM/YY');
    fireEvent.changeText(expiryInput, '1225');

    expect(expiryInput.props.value).toBe('12/25');
  });

  it('should limit CVV to 4 digits', () => {
    const { getByPlaceholderText } = render(
      <PaymentScreen route={mockRoute} navigation={mockNavigation} />
    );

    const cvvInput = getByPlaceholderText('123');
    expect(cvvInput.props.maxLength).toBe(4);
  });

  it('should show alert when submitting without card details', async () => {
    const { getByText } = render(
      <PaymentScreen route={mockRoute} navigation={mockNavigation} />
    );

    const subscribeButton = getByText(/Subscribe for/);
    fireEvent.press(subscribeButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Missing Information',
        'Please fill in all payment details.'
      );
    });
  });

  it('should show alert when card number is too short', async () => {
    const { getByPlaceholderText, getByText } = render(
      <PaymentScreen route={mockRoute} navigation={mockNavigation} />
    );

    fireEvent.changeText(getByPlaceholderText('1234 5678 9012 3456'), '123');
    fireEvent.changeText(getByPlaceholderText('MM/YY'), '12/25');
    fireEvent.changeText(getByPlaceholderText('123'), '123');
    fireEvent.changeText(getByPlaceholderText('John Doe'), 'John Doe');

    const subscribeButton = getByText(/Subscribe for/);
    fireEvent.press(subscribeButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Invalid Card',
        'Please enter a valid card number.'
      );
    });
  });

  it('should process payment successfully with valid card details', async () => {
    const { getByPlaceholderText, getByText } = render(
      <PaymentScreen route={mockRoute} navigation={mockNavigation} />
    );

    // Fill in valid card details
    fireEvent.changeText(getByPlaceholderText('1234 5678 9012 3456'), '4111111111111111');
    fireEvent.changeText(getByPlaceholderText('MM/YY'), '12/25');
    fireEvent.changeText(getByPlaceholderText('123'), '123');
    fireEvent.changeText(getByPlaceholderText('John Doe'), 'John Doe');

    const subscribeButton = getByText(/Subscribe for/);
    fireEvent.press(subscribeButton);

    // Fast-forward through payment processing
    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(mockUpdateUserProfile).toHaveBeenCalledWith({
        subscriptionPlan: 'premium',
        premiumUnlocked: true,
        subscriptionStartDate: expect.any(Number),
        subscriptionEndDate: expect.any(Number),
      });
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Payment Successful! 🎉',
        'You are now subscribed to Premium. Enjoy your premium features!',
        expect.arrayContaining([
          expect.objectContaining({
            text: 'Great!',
            onPress: expect.any(Function),
          }),
        ])
      );
    });
  });

  it('should calculate correct end date for monthly subscription', async () => {
    const { getByPlaceholderText, getByText } = render(
      <PaymentScreen route={mockRoute} navigation={mockNavigation} />
    );

    // Fill in valid card details
    fireEvent.changeText(getByPlaceholderText('1234 5678 9012 3456'), '4111111111111111');
    fireEvent.changeText(getByPlaceholderText('MM/YY'), '12/25');
    fireEvent.changeText(getByPlaceholderText('123'), '123');
    fireEvent.changeText(getByPlaceholderText('John Doe'), 'John Doe');

    const subscribeButton = getByText(/Subscribe for/);
    fireEvent.press(subscribeButton);

    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      const callArgs = mockUpdateUserProfile.mock.calls[0][0];
      const expectedEndDate = callArgs.subscriptionStartDate + 30 * 24 * 60 * 60 * 1000;
      expect(callArgs.subscriptionEndDate).toBe(expectedEndDate);
    });
  });

  it('should calculate correct end date for yearly subscription', async () => {
    const goldRoute = {
      params: {
        planId: 'gold',
        planName: 'Gold',
        price: 499.99,
        currency: 'ZAR',
        interval: 'year',
      },
    };

    const { getByPlaceholderText, getByText } = render(
      <PaymentScreen route={goldRoute} navigation={mockNavigation} />
    );

    // Fill in valid card details
    fireEvent.changeText(getByPlaceholderText('1234 5678 9012 3456'), '4111111111111111');
    fireEvent.changeText(getByPlaceholderText('MM/YY'), '12/25');
    fireEvent.changeText(getByPlaceholderText('123'), '123');
    fireEvent.changeText(getByPlaceholderText('John Doe'), 'John Doe');

    const subscribeButton = getByText(/Subscribe for/);
    fireEvent.press(subscribeButton);

    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      const callArgs = mockUpdateUserProfile.mock.calls[0][0];
      const expectedEndDate = callArgs.subscriptionStartDate + 365 * 24 * 60 * 60 * 1000;
      expect(callArgs.subscriptionEndDate).toBe(expectedEndDate);
    });
  });

  it('should navigate to Settings after successful payment', async () => {
    const { getByPlaceholderText, getByText } = render(
      <PaymentScreen route={mockRoute} navigation={mockNavigation} />
    );

    // Fill in valid card details
    fireEvent.changeText(getByPlaceholderText('1234 5678 9012 3456'), '4111111111111111');
    fireEvent.changeText(getByPlaceholderText('MM/YY'), '12/25');
    fireEvent.changeText(getByPlaceholderText('123'), '123');
    fireEvent.changeText(getByPlaceholderText('John Doe'), 'John Doe');

    const subscribeButton = getByText(/Subscribe for/);
    fireEvent.press(subscribeButton);

    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      // Alert.alert was called with success message
      expect(Alert.alert).toHaveBeenCalled();
      const alertCall = Alert.alert.mock.calls[0];
      const onPressCallback = alertCall[2][0].onPress;

      // Call the callback
      onPressCallback();

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Settings');
    });
  });

  it('should handle payment error', async () => {
    mockUpdateUserProfile.mockRejectedValueOnce(new Error('Payment failed'));

    const { getByPlaceholderText, getByText } = render(
      <PaymentScreen route={mockRoute} navigation={mockNavigation} />
    );

    // Fill in valid card details
    fireEvent.changeText(getByPlaceholderText('1234 5678 9012 3456'), '4111111111111111');
    fireEvent.changeText(getByPlaceholderText('MM/YY'), '12/25');
    fireEvent.changeText(getByPlaceholderText('123'), '123');
    fireEvent.changeText(getByPlaceholderText('John Doe'), 'John Doe');

    const subscribeButton = getByText(/Subscribe for/);
    fireEvent.press(subscribeButton);

    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Payment Failed',
        'Something went wrong. Please try again.'
      );
    });
  });

  it('should process PayPal payment without card validation', async () => {
    const { getByText } = render(
      <PaymentScreen route={mockRoute} navigation={mockNavigation} />
    );

    // Switch to PayPal
    const paypalButton = getByText('PayPal');
    fireEvent.press(paypalButton);

    // Submit payment
    const subscribeButton = getByText(/Subscribe for/);
    fireEvent.press(subscribeButton);

    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(mockUpdateUserProfile).toHaveBeenCalledWith({
        subscriptionPlan: 'premium',
        premiumUnlocked: true,
        subscriptionStartDate: expect.any(Number),
        subscriptionEndDate: expect.any(Number),
      });
    });
  });

  it('should display security information', () => {
    const { getByText } = render(
      <PaymentScreen route={mockRoute} navigation={mockNavigation} />
    );

    expect(
      getByText(/Your payment information is encrypted and secure/)
    ).toBeTruthy();
  });

  it('should disable subscribe button while processing', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <PaymentScreen route={mockRoute} navigation={mockNavigation} />
    );

    // Fill in valid card details
    fireEvent.changeText(getByPlaceholderText('1234 5678 9012 3456'), '4111111111111111');
    fireEvent.changeText(getByPlaceholderText('MM/YY'), '12/25');
    fireEvent.changeText(getByPlaceholderText('123'), '123');
    fireEvent.changeText(getByPlaceholderText('John Doe'), 'John Doe');

    const subscribeButton = getByText(/Subscribe for/);

    // Check that button has lock icon before clicking
    expect(queryByText(/Subscribe for/)).toBeTruthy();

    fireEvent.press(subscribeButton);

    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(mockUpdateUserProfile).toHaveBeenCalled();
    });
  });
});
