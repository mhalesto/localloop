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

const categories = [
  'All',
  'Essentials',
  'Home & DIY',
  'Services',
  'Events',
  'Free Finds',
  'Neighbors'
];

const listings = [
  {
    id: '1',
    title: 'Community Garden Veg Boxes',
    price: 'R120',
    category: 'Essentials',
    distance: '1.2 km • Woodstock',
    badge: 'Fresh Today',
    icon: 'leaf-outline',
    color: '#3ab370'
  },
  {
    id: '2',
    title: 'Neighborhood Tool Library',
    price: 'R40/day',
    category: 'Home & DIY',
    distance: '2.4 km • Observatory',
    badge: 'Reserve',
    icon: 'construct-outline',
    color: '#7b46ff'
  },
  {
    id: '3',
    title: 'Weekend Babysitting Collective',
    price: 'From R90',
    category: 'Services',
    distance: '0.9 km • Salt River',
    badge: 'Trusted',
    icon: 'people-outline',
    color: '#ff8a5c'
  },
  {
    id: '4',
    title: 'Street Swap Pop-up',
    price: 'Free entry',
    category: 'Events',
    distance: '3.1 km • Gardens',
    badge: 'Saturday',
    icon: 'swap-horizontal-outline',
    color: '#2f80ed'
  },
  {
    id: '5',
    title: 'LocalLoop Micro Grants',
    price: 'Apply now',
    category: 'Neighbors',
    distance: 'City-wide • Cape Town',
    badge: 'New',
    icon: 'sparkles-outline',
    color: '#f2c94c'
  },
  {
    id: '6',
    title: 'Community Cleanup Gear',
    price: 'Free borrow',
    category: 'Free Finds',
    distance: '1.5 km • Vredehoek',
    badge: 'Pick up',
    icon: 'trash-outline',
    color: '#56ccf2'
  }
];

const servicePrompts = [
  {
    id: 'offer',
    title: 'List something to share or sell',
    icon: 'add-circle-outline',
    description: 'Got a side hustle, spare veggies, or skills to share? Publish a post in seconds.',
    cta: 'Create listing'
  },
  {
    id: 'request',
    title: 'Ask the Loop for what you need',
    icon: 'chatbubbles-outline',
    description: 'Need help moving, lending a ladder, or planning an event? Let neighbors jump in.',
    cta: 'Post a request'
  }
];

export default function LocalLoopMarketsScreen({ navigation }) {
  const { themeColors, isDarkMode, accentPreset } = useSettings();
  const styles = useMemo(
    () => createStyles(themeColors, { isDarkMode }),
    [themeColors, isDarkMode]
  );
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchValue, setSearchValue] = useState('');

  const filteredListings = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    return listings.filter((listing) => {
      const matchesCategory =
        selectedCategory === 'All' || listing.category === selectedCategory;
      const matchesQuery =
        !query ||
        listing.title.toLowerCase().includes(query) ||
        listing.distance.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [selectedCategory, searchValue]);

  const handleListingPress = (item) => {
    Alert.alert(
      item.title,
      'Marketplace chats and payments are coming soon. For now, DM this neighbor in the room to coordinate.'
    );
  };

  const handleCreateListing = () => {
    navigation.navigate('PostComposer', {
      mode: 'market',
      presetTitle: '',
      presetMessage:
        'Listing name:\nWhat you are offering or looking for:\nPick-up / delivery:\nPrice or barter details:\nBest way to reach you:'
    });
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
      <View style={[styles.listingIconWrapper, { backgroundColor: item.color }]}>
        <Ionicons name={item.icon} size={28} color="#0f172a" />
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
    </TouchableOpacity>
  );

  const renderPromptCard = (prompt) => (
    <TouchableOpacity
      key={prompt.id}
      style={styles.promptCard}
      onPress={prompt.id === 'offer' ? handleCreateListing : () => navigation.navigate('PostComposer')}
      activeOpacity={0.85}
    >
      <View style={[styles.promptIcon, { backgroundColor: accentPreset?.iconTint ?? themeColors.primary }]}>
        <Ionicons name={prompt.icon} size={22} color="#fff" />
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
      elevation: 5
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
    }
  });
