import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import SubscriptionScreen from '../../screens/SubscriptionScreen';
import { SUBSCRIPTION_PLANS } from '../../config/subscriptionPlans';

// Mock contexts
jest.mock('../../contexts/SettingsContext', () => ({
  useSettings: () => ({
    themeColors: {
      card: '#1e1e1e',
      divider: '#333',
      textPrimary: '#fff',
      textSecondary: '#999',
      primary: '#007aff',
    },
    accentPreset: {
      buttonBackground: '#007aff',
    },
  }),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    userProfile: {
      subscriptionPlan: 'basic',
      premiumUnlocked: false,
    },
    updateUserProfile: jest.fn(() => Promise.resolve()),
  }),
}));

// Mock ScreenLayout
jest.mock('../../components/ScreenLayout', () => {
  const { View } = require('react-native');
  return ({ children }) => <View testID="screen-layout">{children}</View>;
});

describe('SubscriptionScreen', () => {
  const mockNavigation = {
    goBack: jest.fn(),
    navigate: jest.fn(),
  };

  let alertSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert');
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('should render all three subscription plans', () => {
    const { getByText } = render(<SubscriptionScreen navigation={mockNavigation} />);

    expect(getByText('Basic')).toBeTruthy();
    expect(getByText('Premium')).toBeTruthy();
    expect(getByText('Gold')).toBeTruthy();
  });

  it('should display plan descriptions', () => {
    const { getByText } = render(<SubscriptionScreen navigation={mockNavigation} />);

    expect(getByText(SUBSCRIPTION_PLANS.BASIC.description)).toBeTruthy();
    expect(getByText(SUBSCRIPTION_PLANS.PREMIUM.description)).toBeTruthy();
    expect(getByText(SUBSCRIPTION_PLANS.GOLD.description)).toBeTruthy();
  });

  it('should display plan prices', () => {
    const { getByText } = render(<SubscriptionScreen navigation={mockNavigation} />);

    expect(getByText('Free')).toBeTruthy();
    expect(getByText('R49.99/month')).toBeTruthy();
    expect(getByText('R499.99/year')).toBeTruthy();
  });

  it('should display plan features', () => {
    const { getByText } = render(<SubscriptionScreen navigation={mockNavigation} />);

    // Check some features from each plan
    expect(getByText('5 posts per day')).toBeTruthy();
    expect(getByText('Unlimited posts')).toBeTruthy();
    expect(getByText('AI-powered features')).toBeTruthy();
  });

  it('should mark Premium as MOST POPULAR', () => {
    const { getByText } = render(<SubscriptionScreen navigation={mockNavigation} />);

    expect(getByText('MOST POPULAR')).toBeTruthy();
  });

  it('should display savings badge for Gold plan', () => {
    const { getByText } = render(<SubscriptionScreen navigation={mockNavigation} />);

    expect(getByText('Save R100/year')).toBeTruthy();
  });

  it('should mark Basic as Current plan', () => {
    const { getByText } = render(<SubscriptionScreen navigation={mockNavigation} />);

    expect(getByText('Current')).toBeTruthy();
  });

  it('should display footer information', () => {
    const { getByText } = render(<SubscriptionScreen navigation={mockNavigation} />);

    expect(
      getByText(/You can upgrade, downgrade, or cancel your subscription/)
    ).toBeTruthy();
  });

  it('should not show select button for current plan', () => {
    const { queryAllByText } = render(<SubscriptionScreen navigation={mockNavigation} />);

    // Basic is the current plan, so it should have 2 Subscribe Now buttons (for Premium and Gold)
    const subscribeButtons = queryAllByText('Subscribe Now');

    // Should have exactly 2 Subscribe buttons (Premium and Gold, but not for Basic)
    expect(subscribeButtons).toHaveLength(2);
  });

  it('should show alert when selecting current plan', async () => {
    const { getByText } = render(<SubscriptionScreen navigation={mockNavigation} />);

    // Find and press the Basic plan card (current plan)
    const basicCard = getByText('Basic').parent.parent;
    fireEvent.press(basicCard);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Already Subscribed',
        'You are already on this plan.'
      );
    });
  });

  it('should navigate to Payment screen when selecting Premium plan', async () => {
    const { getAllByText } = render(<SubscriptionScreen navigation={mockNavigation} />);

    // Find the Subscribe Now button for Premium plan
    const subscribeButtons = getAllByText('Subscribe Now');
    fireEvent.press(subscribeButtons[0]);

    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Payment', {
        planId: 'premium',
        planName: 'Premium',
        price: 49.99,
        currency: 'ZAR',
        interval: 'month',
      });
    });
  });

  it('should navigate to Payment screen when selecting Gold plan', async () => {
    const { getAllByText } = render(<SubscriptionScreen navigation={mockNavigation} />);

    // Find the Subscribe Now button for Gold plan
    const subscribeButtons = getAllByText('Subscribe Now');
    fireEvent.press(subscribeButtons[1]);

    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Payment', {
        planId: 'gold',
        planName: 'Gold',
        price: 499.99,
        currency: 'ZAR',
        interval: 'year',
      });
    });
  });
});

describe('SubscriptionScreen - Premium User', () => {
  const mockNavigation = {
    goBack: jest.fn(),
    navigate: jest.fn(),
  };

  let alertSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert');

    // Mock as Premium user
    jest.spyOn(require('../../contexts/AuthContext'), 'useAuth').mockReturnValue({
      userProfile: {
        subscriptionPlan: 'premium',
        premiumUnlocked: true,
      },
      updateUserProfile: jest.fn(() => Promise.resolve()),
    });
  });

  afterEach(() => {
    alertSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('should mark Premium as Current plan for premium user', () => {
    const { getAllByText } = render(<SubscriptionScreen navigation={mockNavigation} />);

    // Should find "Current" badge
    expect(getAllByText('Current')).toBeTruthy();
  });

  it('should allow downgrade to Basic plan', async () => {
    const updateUserProfile = jest.fn(() => Promise.resolve());
    jest.spyOn(require('../../contexts/AuthContext'), 'useAuth').mockReturnValue({
      userProfile: {
        subscriptionPlan: 'premium',
        premiumUnlocked: true,
      },
      updateUserProfile,
    });

    const { getByText } = render(<SubscriptionScreen navigation={mockNavigation} />);

    // Find and press the Select Plan button for Basic
    const selectButton = getByText('Select Plan');
    fireEvent.press(selectButton);

    await waitFor(() => {
      expect(updateUserProfile).toHaveBeenCalledWith({
        subscriptionPlan: 'basic',
        premiumUnlocked: false,
      });
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'You are now on the Basic plan.'
      );
    });

    await waitFor(() => {
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });
});
