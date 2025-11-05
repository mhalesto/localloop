import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/ScreenLayout';
import UpgradePromptModal from '../components/UpgradePromptModal';
import { useSettings } from '../contexts/SettingsContext';
import { usePosts } from '../contexts/PostsContext';
import { useAuth } from '../contexts/AuthContext';
import { countUserActiveListings } from '../services/marketplaceService';
import { getPlanLimits } from '../config/subscriptionPlans';

const listingCategories = [
  'Essentials',
  'Home & DIY',
  'Services',
  'Events',
  'Free Finds',
  'Neighbors'
];

const listingConditions = ['New', 'Like new', 'Good', 'Used', 'Needs TLC'];

export default function CreateMarketListingScreen({ navigation, route }) {
  const intent = route?.params?.intent ?? 'offer';
  const { themeColors, isDarkMode, accentPreset, userProfile } = useSettings();
  const { addPost } = usePosts();
  const { user } = useAuth();
  const styles = useMemo(
    () => createStyles(themeColors, { isDarkMode, accent: accentPreset }),
    [themeColors, isDarkMode, accentPreset]
  );

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(listingCategories[0]);
  const [condition, setCondition] = useState(listingConditions[0]);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(
    userProfile?.city ? `${userProfile.city}, ${userProfile.province ?? ''}`.trim() : ''
  );
  const [contact, setContact] = useState(userProfile?.contactMethod ?? '');
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [listingLimitInfo, setListingLimitInfo] = useState({ count: 0, limit: 3 });

  const userPlan = userProfile?.subscriptionPlan || 'basic';

  const handleUpgradeNow = () => {
    setUpgradeModalVisible(false);
    navigation.navigate('Subscription');
  };

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('Add a title', 'Give your listing a clear title so neighbors know what it is.');
      return;
    }

    if (!user?.uid) {
      Alert.alert('Sign in required', 'Sign in to publish listings to your neighborhood.');
      return;
    }

    // Check market listing limit
    const limits = getPlanLimits(userPlan);
    const maxListings = limits.marketListingsActive;

    // Only check limit if not unlimited (-1)
    if (maxListings !== -1) {
      const currentCount = await countUserActiveListings(user.uid);

      if (currentCount >= maxListings) {
        setListingLimitInfo({ count: currentCount, limit: maxListings });
        setUpgradeModalVisible(true);
        return;
      }
    }

    if (!userProfile?.isPublicProfile || !userProfile?.username || !userProfile?.displayName) {
      Alert.alert(
        'Public profile required',
        'LocalLoop Markets uses real neighbor identities. Set up your public profile with a display name and username before listing.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open settings',
            onPress: () => navigation.navigate('Settings')
          }
        ]
      );
      return;
    }

    const summaryLines = [
      `Listing type: ${intent === 'request' ? 'Neighbor request' : 'Offer / for sale'}`,
      `Category: ${category}`,
      `Condition: ${condition}`,
      `Price: ${price ? price : 'Negotiable'}`,
      `Location: ${location || 'Share on chat'}`,
      `Contact: ${contact || 'Reply in comments / DMs'}`,
      '',
      description || 'Describe what you are offering or looking for. Include timing, pick-up details, or how neighbors can help.'
    ];

    const [cityFromInput = ''] = (location || '').split(',').map((part) => part.trim());
    const resolvedCity = cityFromInput || userProfile?.city;

    if (!resolvedCity) {
      Alert.alert(
        'Add your city',
        'Listings need a neighborhood. Update your location in settings first so neighbors see the right posts.'
      );
      return;
    }

    const listingMessage = summaryLines.join('\n');
    const marketMeta = {
      intent,
      category,
      condition: intent === 'request' ? 'n/a' : condition,
      price: price || 'Negotiable',
      location: location || userProfile?.city || '',
      contact: contact || 'Reply in comments / DMs',
      details: description.trim(),
      createdAt: Date.now(),
      boostedUntil: 0,
      boostCount: 0,
      boostWeight: 0
    };

    const created = addPost(
      resolvedCity,
      trimmedTitle,
      listingMessage,
      accentPreset?.key ?? 'sunset',
      userProfile,
      false,
      null,
      null,
      'public',
      userProfile,
      marketMeta
    );

    if (!created) {
      Alert.alert(
        'Unable to list right now',
        'We could not publish your listing. Check your connection and try again.'
      );
      return;
    }

    setTitle('');
    setDescription('');
    setPrice('');
    setCategory(listingCategories[0]);
    setCondition(listingConditions[0]);
    setContact(userProfile?.contactMethod ?? '');

    Alert.alert('Listing published', 'Your neighbors can now see this in LocalLoop Markets.', [
      {
        text: 'Great',
        onPress: () => navigation.navigate('LocalLoopMarkets')
      }
    ]);
  };

  const renderPillRow = (items, value, onChange) => (
    <View style={styles.pillRow}>
      {items.map((item) => {
        const isActive = value === item;
        return (
          <TouchableOpacity
            key={item}
            style={[
              styles.pill,
              {
                backgroundColor: isActive
                  ? accentPreset?.iconTint || themeColors.primary
                  : themeColors.card
              }
            ]}
            onPress={() => onChange(item)}
          >
            <Text style={[styles.pillText, { color: isActive ? '#0f172a' : themeColors.textSecondary }]}>
              {item}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <ScreenLayout
      navigation={navigation}
      title="Create listing"
      subtitle="Share something your neighbors can buy, borrow, or request."
      showFooter={false}
      activeTab="markets"
      contentStyle={styles.content}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.intentBadge}>
          <Ionicons
            name={intent === 'request' ? 'people-outline' : 'pricetag-outline'}
            size={16}
            color={accentPreset?.iconTint || themeColors.primary}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.intentText}>
            {intent === 'request' ? 'Neighbor request' : 'Offer or for sale'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Photos</Text>
          <TouchableOpacity style={styles.photoDrop} activeOpacity={0.85}>
            <Ionicons name="image-outline" size={28} color={accentPreset?.iconTint || themeColors.primary} />
            <Text style={styles.photoText}>Add cover photos • 10 max</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={intent === 'request' ? 'e.g. Need a drill for weekend project' : 'e.g. Handmade planter set'}
            placeholderTextColor={themeColors.textSecondary}
            style={styles.input}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Price</Text>
          <TextInput
            value={price}
            onChangeText={setPrice}
            placeholder="Include currency or write Negotiable"
            placeholderTextColor={themeColors.textSecondary}
            style={styles.input}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Category</Text>
          {renderPillRow(listingCategories, category, setCategory)}
        </View>

        {intent !== 'request' ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Condition</Text>
            {renderPillRow(listingConditions, condition, setCondition)}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Location</Text>
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="Neighborhood, city"
            placeholderTextColor={themeColors.textSecondary}
            style={styles.input}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Contact preference</Text>
          <TextInput
            value={contact}
            onChangeText={setContact}
            placeholder="Phone, email, or say DM me"
            placeholderTextColor={themeColors.textSecondary}
            style={styles.input}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Details</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe pricing, availability, delivery or pickup, and anything neighbors should know."
            placeholderTextColor={themeColors.textSecondary}
            style={[styles.input, styles.multiline]}
            multiline
            numberOfLines={6}
          />
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.9}>
          <Ionicons name="share-social-outline" size={20} color="#0f172a" style={{ marginRight: 8 }} />
          <Text style={styles.submitText}>Share to LocalLoop</Text>
        </TouchableOpacity>

        <Text style={styles.helperText}>
          Listings publish inside your neighborhood room. Add delivery details or availability so neighbors know how to respond.
        </Text>
      </ScrollView>

      <UpgradePromptModal
        visible={upgradeModalVisible}
        onClose={() => setUpgradeModalVisible(false)}
        onUpgrade={handleUpgradeNow}
        featureName={`Market Listing Limit Reached (${listingLimitInfo.count}/${listingLimitInfo.limit})`}
        featureDescription={`You've reached your limit of ${listingLimitInfo.limit} active market listings. Upgrade to Premium for unlimited listings!`}
        requiredPlan="premium"
        icon="pricetag"
      />
    </ScreenLayout>
  );
}

const createStyles = (palette, { isDarkMode, accent }) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: 0
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingBottom: 120,
      gap: 24
    },
    section: {
      gap: 12
    },
    sectionLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: palette.textPrimary
    },
    photoDrop: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.08)',
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
      paddingVertical: 28,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12
    },
    photoText: {
      fontSize: 14,
      color: palette.textSecondary
    },
    input: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.08)',
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#ffffff',
      paddingHorizontal: 18,
      paddingVertical: 14,
      fontSize: 15,
      color: palette.textPrimary
    },
    multiline: {
      minHeight: 140,
      textAlignVertical: 'top'
    },
    pillRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10
    },
    pill: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.08)'
    },
    pillText: {
      fontSize: 13,
      fontWeight: '600'
    },
    submitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 999,
      backgroundColor: accent?.buttonBackground || accent?.iconTint || palette.primary,
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.24 : 0.16,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6
    },
    submitText: {
      fontSize: 16,
      fontWeight: '700',
      color: accent?.buttonForeground || '#0f172a'
    },
    helperText: {
      fontSize: 13,
      color: palette.textSecondary,
      lineHeight: 18
    },
    intentBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 18,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'
    },
    intentText: {
      fontSize: 12,
      fontWeight: '600',
      color: palette.textSecondary,
      letterSpacing: 0.2
    }
  });
