import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/ScreenLayout';
import { useSettings } from '../contexts/SettingsContext';
import { usePosts } from '../contexts/PostsContext';
import { useAuth } from '../contexts/AuthContext';

const categories = [
  'All',
  'Essentials',
  'Home & DIY',
  'Services',
  'Events',
  'Free Finds',
  'Neighbors'
];

const categoryVisuals = {
  Essentials: { icon: 'leaf-outline', color: '#3ab370' },
  'Home & DIY': { icon: 'construct-outline', color: '#7b46ff' },
  Services: { icon: 'people-outline', color: '#ff8a5c' },
  Events: { icon: 'sparkles-outline', color: '#2f80ed' },
  'Free Finds': { icon: 'gift-outline', color: '#56ccf2' },
  Neighbors: { icon: 'hand-left-outline', color: '#f59e0b' }
};

const servicePrompts = [
  {
    id: 'offer',
    title: 'List something to share or sell',
    icon: 'cart-outline',
    iconColor: '#f59e0b',
    iconBackground: 'rgba(245, 158, 11, 0.22)',
    description: 'Got a side hustle, spare veggies, or skills to share? Publish a post in seconds.',
    cta: 'Create listing',
    intent: 'offer'
  },
  {
    id: 'request',
    title: 'Ask the Loop for what you need',
    icon: 'people-circle-outline',
    iconColor: '#38bdf8',
    iconBackground: 'rgba(56, 189, 248, 0.2)',
    description: 'Need help moving, lending a ladder, or planning an event? Let neighbors jump in.',
    cta: 'Post a request',
    intent: 'request'
  }
];

export default function LocalLoopMarketsScreen({ navigation }) {
  const { themeColors, isDarkMode, accentPreset, userProfile } = useSettings();
  const { getPostsForCity, boostMarketListing } = usePosts();
  const { user } = useAuth();
  const styles = useMemo(
    () => createStyles(themeColors, { isDarkMode }),
    [themeColors, isDarkMode]
  );
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchValue, setSearchValue] = useState('');

  const cityPosts = userProfile?.city ? getPostsForCity(userProfile.city) ?? [] : [];

  const listings = useMemo(() => {
    if (!cityPosts?.length) return [];
    const now = Date.now();
    return cityPosts
      .filter((post) => post.isMarketListing)
      .map((post) => {
        const meta = post.marketListing || {};
        const visuals = categoryVisuals[meta.category] || { icon: 'storefront-outline', color: '#6366f1' };
        const boostedUntil = Number(meta.boostedUntil ?? 0);
        const isBoosted = boostedUntil > now;
        const badge = isBoosted
          ? 'Boosted'
          : meta.intent === 'request'
          ? 'Request'
          : 'Offer';

        return {
          id: post.id,
          post,
          title: post.title,
          price: meta.price || 'Negotiable',
          category: meta.category || 'Neighbors',
          distance: meta.location || post.city,
          badge,
          icon: visuals.icon,
          color: visuals.color,
          isBoosted,
          boostedUntil,
          isOwner: post.author?.uid === user?.uid || post.authorId === user?.uid,
          createdAt: post.createdAt ?? 0,
          boostCount: meta.boostCount ?? 0,
          city: post.city,
        };
      })
      .sort((a, b) => {
        if (a.isBoosted !== b.isBoosted) {
          return a.isBoosted ? -1 : 1;
        }
        if ((b.boostedUntil ?? 0) !== (a.boostedUntil ?? 0)) {
          return (b.boostedUntil ?? 0) - (a.boostedUntil ?? 0);
        }
        return (b.createdAt ?? 0) - (a.createdAt ?? 0);
      });
  }, [cityPosts, user?.uid]);

  const filteredListings = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    return listings.filter((listing) => {
      const matchesCategory =
        selectedCategory === 'All' || listing.category === selectedCategory;
      const matchesQuery =
        !query ||
        listing.title.toLowerCase().includes(query) ||
        (listing.distance || '').toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [listings, selectedCategory, searchValue]);

  const handleListingPress = (listing) => {
    Alert.alert(
      listing.title,
      listing.post?.message ||
        'Marketplace chats and payments are coming soon. For now, DM this neighbor in the room to coordinate.'
    );
  };

  const handleBoostPress = (listing) => {
    if (!listing.isOwner) {
      return;
    }
    if (listing.isBoosted) {
      const expires = new Date(listing.boostedUntil).toLocaleString();
      Alert.alert('Already boosted', `This listing is boosted until ${expires}.`);
      return;
    }
    Alert.alert(
      'Boost listing',
      'Give this listing priority placement for the next 12 hours so more neighbors in your city see it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Boost now',
          style: 'default',
          onPress: () => {
            const ok = boostMarketListing(listing.city, listing.id, 12);
            if (!ok) {
              Alert.alert('Unable to boost', 'We could not boost this listing right now. Try again soon.');
            } else {
              Alert.alert('Boost activated', 'Your listing will be highlighted to neighbors for the next 12 hours.');
            }
          }
        }
      ]
    );
  };

  const handleCreateListing = (intent = 'offer') => {
    navigation.navigate('CreateMarketListing', { intent });
  };

  const renderCategory = ({ item }) => {
    const isActive = selectedCategory === item;
    return (
      <TouchableOpacity
        onPress={() => setSelectedCategory(item)}
        style={[
          styles.categoryChip,
          {
            backgroundColor: isActive
              ? accentPreset?.iconTint ?? themeColors.primary
              : themeColors.card
          }
        ]}
      >
        <Text
          style={[
            styles.categoryLabel,
            { color: isActive ? '#ffffff' : themeColors.textSecondary }
          ]}
        >
          {item}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderListing = ({ item }) => (
    <TouchableOpacity
      style={styles.listingCard}
      activeOpacity={0.9}
      onPress={() => handleListingPress(item)}
    >
      <View style={[styles.listingIconWrapper, { backgroundColor: `${item.color}33` }]}>
        <Ionicons name={item.icon} size={28} color={item.color} />
      </View>
      <View style={styles.listingMeta}>
        <Text style={styles.listingTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.listingPrice}>{item.price}</Text>
        <Text style={styles.listingDistance}>{item.distance}</Text>
      </View>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{item.badge}</Text>
      </View>
      {item.isOwner ? (
        <TouchableOpacity style={styles.boostButton} onPress={() => handleBoostPress(item)}>
          <Ionicons
            name={item.isBoosted ? 'rocket-outline' : 'flash-outline'}
            size={18}
            color={item.isBoosted ? '#facc15' : themeColors.textSecondary}
          />
          <Text
            style={[
              styles.boostButtonText,
              { color: item.isBoosted ? '#facc15' : themeColors.textSecondary }
            ]}
          >
            {item.isBoosted ? 'Boosted' : 'Boost listing'}
          </Text>
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );

  const renderPromptCard = (prompt) => (
    <TouchableOpacity
      key={prompt.id}
      style={styles.promptCard}
      onPress={() => handleCreateListing(prompt.intent)}
      activeOpacity={0.85}
    >
      <View
        style={[
          styles.promptIcon,
          { backgroundColor: prompt.iconBackground || accentPreset?.iconTint || themeColors.primary }
        ]}
      >
        <Ionicons
          name={prompt.icon}
          size={22}
          color={prompt.iconColor || '#0f172a'}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.promptTitle}>{prompt.title}</Text>
        <Text style={styles.promptDescription}>{prompt.description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={themeColors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <ScreenLayout
      navigation={navigation}
      title="LocalLoop Markets"
      subtitle="Discover neighbor-to-neighbor offers, requests, and pop-up events."
      showSearch
      searchPlaceholder="Search offers, people, or neighborhoods"
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      contentStyle={styles.content}
      headerBackgroundStyle={styles.headerBackground}
      activeTab="markets"
      showFooter={false}
    >
      {!userProfile?.city ? (
        <View style={[styles.emptyState, { paddingHorizontal: 24 }] }>
          <Ionicons name="navigate-outline" size={64} color={themeColors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>Add your neighborhood</Text>
          <Text style={[styles.emptyDescription, { color: themeColors.textSecondary }]}>
            Set your city in Settings so we can surface listings from neighbors nearby.
          </Text>
          <TouchableOpacity
            style={[styles.discoverButton, { backgroundColor: accentPreset?.iconTint || themeColors.primary }]}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.85}
          >
            <Ionicons name="settings-outline" size={18} color="#fff" />
            <Text style={styles.discoverButtonText}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Browse by vibe</Text>
          </View>
          <FlatList
            data={categories}
            renderItem={renderCategory}
            keyExtractor={(item) => item}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesList}
            contentContainerStyle={styles.categoriesContent}
          />

          <View style={styles.promptsSection}>
            {servicePrompts.map(renderPromptCard)}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Neighbor highlights</Text>
            <Text style={styles.sectionSubtitle}>
              {selectedCategory === 'All' ? 'Curated for your Loop' : selectedCategory}
            </Text>
          </View>

          <FlatList
            data={filteredListings}
            renderItem={renderListing}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={{ gap: 16 }}
            contentContainerStyle={styles.listingsContent}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="planet-outline" size={44} color={themeColors.textSecondary} />
                <Text style={styles.emptyTitle}>Nothing here yet</Text>
                <Text style={styles.emptyDescription}>
                  Be the first to create a listing or ask for what you need in your neighborhood.
                </Text>
              </View>
            }
          />
        </ScrollView>
      )}
    </ScreenLayout>
  );
}

const createStyles = (palette, { isDarkMode }) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: 0,
      paddingTop: 0
    },
    headerBackground: {
      borderBottomLeftRadius: 32,
      borderBottomRightRadius: 32
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingBottom: 120
    },
    categoriesList: {
      marginHorizontal: -24,
      paddingHorizontal: 24
    },
    categoriesContent: {
      gap: 12,
      paddingBottom: 6
    },
    categoryChip: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.08)'
    },
    categoryLabel: {
      fontSize: 14,
      fontWeight: '600'
    },
    sectionHeader: {
      marginTop: 24,
      marginBottom: 16
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: palette.textPrimary
    },
    sectionSubtitle: {
      fontSize: 14,
      color: palette.textSecondary,
      marginTop: 4
    },
    promptsSection: {
      gap: 12,
      marginTop: 8
    },
    promptCard: {
      borderRadius: 22,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
      borderWidth: isDarkMode ? 0 : 1,
      borderColor: 'rgba(15,23,42,0.06)',
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.35 : 0.1,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6
    },
    promptIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16
    },
    promptTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: palette.textPrimary,
      marginBottom: 6
    },
    promptDescription: {
      fontSize: 13,
      color: palette.textSecondary,
      lineHeight: 18
    },
    listingsContent: {
      paddingBottom: 12,
      gap: 16
    },
    listingCard: {
      flex: 1,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
      borderRadius: 26,
      padding: 18,
      justifyContent: 'space-between',
      position: 'relative',
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.35 : 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 12 },
      elevation: 5,
      paddingBottom: 62
    },
    listingIconWrapper: {
      width: 52,
      height: 52,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.primary,
      marginBottom: 18
    },
    listingMeta: {
      gap: 6
    },
    listingTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: palette.textPrimary
    },
    listingPrice: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.primary
    },
    listingDistance: {
      fontSize: 12,
      color: palette.textSecondary
    },
    badge: {
      position: 'absolute',
      top: 14,
      right: 14,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.14)' : 'rgba(47,128,237,0.12)'
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: isDarkMode ? '#fff' : palette.primary
    },
    boostButton: {
      position: 'absolute',
      bottom: 16,
      right: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 18,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'
    },
    boostButtonText: {
      fontSize: 12,
      fontWeight: '600'
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 36,
      gap: 12
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: palette.textPrimary
    },
    emptyDescription: {
      textAlign: 'center',
      fontSize: 14,
      color: palette.textSecondary,
      paddingHorizontal: 24
    },
    discoverButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 999,
      marginTop: 12
    },
    discoverButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600'
    }
  });
