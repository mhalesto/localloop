import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  View,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import ScreenLayout from '../components/ScreenLayout';
import NeighborhoodExplorer from '../components/NeighborhoodExplorer';
import StatusStoryCard from '../components/StatusStoryCard';
import Skeleton from '../components/Skeleton';
import ExploreFilterModal from '../components/ExploreFilterModal';
import FilteredPostCard from '../components/FilteredPostCard';
import FilteredUserCard from '../components/FilteredUserCard';
import ArtworkMasonryGrid from '../components/ArtworkMasonryGrid';
import SponsoredAdCard from '../components/SponsoredAdCard';
import ArtworkSkeletonLoader from '../components/ArtworkSkeletonLoader';
import AdSkeletonLoader from '../components/AdSkeletonLoader';
import HorizontalListSkeletonLoader from '../components/HorizontalListSkeletonLoader';
import CartoonStyleModal from '../components/CartoonStyleModal';
import CartoonGenerationProgress from '../components/CartoonGenerationProgress';
import EmailVerificationBanner from '../components/EmailVerificationBanner';
import useHaptics from '../hooks/useHaptics';
import { useSettings } from '../contexts/SettingsContext';
import { usePosts } from '../contexts/PostsContext';
import { useStatuses } from '../contexts/StatusesContext';
import { useSensors } from '../contexts/SensorsContext';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { fetchCountries, fetchCities } from '../services/locationService';
import { getPostsFromCity, getAIArtworkFromCity, getLocalUsers } from '../services/exploreContentService';
import { generateCartoonProfile } from '../services/openai/profileCartoonService';
import { scheduleCartoonReadyNotification } from '../services/notificationService';
import {
  getCartoonProfileData,
  checkAndResetMonthlyUsage,
  uploadCartoonToStorage,
  recordCartoonGeneration,
  uploadTemporaryCustomImage,
  deleteTemporaryCustomImage,
} from '../services/cartoonProfileService';

const INITIAL_VISIBLE = 40;
const PAGE_SIZE = 30;
const TOP_TRENDING_TO_SHOW = 6;
const CHIP_ROW_MAX = 4;
const FALLBACK_COUNTRY_CODES = ['US', 'CN', 'IN', 'ID', 'BR', 'PK', 'NG', 'BD', 'RU', 'MX'];
const COUNTRIES_CACHE_KEY = '@localloop.countriesCache';
const COUNTRIES_CACHE_TTL = 1000 * 60 * 60 * 24; // 24h
const EXPLORE_FILTERS_KEY = '@localloop.exploreFilters';
const EXPLORE_CONTENT_CACHE_KEY = '@localloop.exploreContentCache';
const EXPLORE_CONTENT_CACHE_TTL = 1000 * 60 * 5; // 5 minutes
const DEFAULT_FILTERS = {
  showNearbyCities: true,
  showPostsFromCurrentCity: true,
  showPostBackgrounds: true,
  showAIArtGallery: true,
  showLocalUsers: true,
  showTrendingCities: true,
};
const FALLBACK_COUNTRIES = [
  { name: 'United States', iso2: 'US', iso3: 'USA' },
  { name: 'China', iso2: 'CN', iso3: 'CHN' },
  { name: 'India', iso2: 'IN', iso3: 'IND' },
  { name: 'Indonesia', iso2: 'ID', iso3: 'IDN' },
  { name: 'Brazil', iso2: 'BR', iso3: 'BRA' },
  { name: 'Pakistan', iso2: 'PK', iso3: 'PAK' },
  { name: 'Nigeria', iso2: 'NG', iso3: 'NGA' },
  { name: 'Bangladesh', iso2: 'BD', iso3: 'BGD' },
  { name: 'Russia', iso2: 'RU', iso3: 'RUS' },
  { name: 'Mexico', iso2: 'MX', iso3: 'MEX' }
];

export default function CountryScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const { showAddShortcut, showDiscoveryOnExplore, userProfile, themeColors, isDarkMode } = useSettings();
  const { getRecentCityActivity, refreshPosts, addFetchedPost } = usePosts();
  const { currentUser, user, isAdmin } = useAuth();
  const { showAlert } = useAlert();
  const haptics = useHaptics();
  const {
    statuses,
    isLoading: statusesLoading,
    statusesError,
  } = useStatuses();
  const {
    stepCounterEnabled,
    motionDetectionEnabled,
    barometerEnabled,
    compassEnabled,
    ambientLightEnabled,
  } = useSensors();
  const discoveryEnabled =
    stepCounterEnabled ||
    motionDetectionEnabled ||
    barometerEnabled ||
    compassEnabled ||
    ambientLightEnabled;
  const showDiscoveryCard = showDiscoveryOnExplore && discoveryEnabled;

  const [countries, setCountries] = useState([]);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [personalCities, setPersonalCities] = useState([]);
  const [personalLoading, setPersonalLoading] = useState(false);
  const [personalError, setPersonalError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [cartoonModalVisible, setCartoonModalVisible] = useState(false);
  const [exploreFilters, setExploreFilters] = useState(DEFAULT_FILTERS);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [filteredArtwork, setFilteredArtwork] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loadingFilteredContent, setLoadingFilteredContent] = useState(false);

  // Cartoon generation state
  const [cartoonUsageData, setCartoonUsageData] = useState(null);
  const [isGeneratingCartoon, setIsGeneratingCartoon] = useState(false);
  const [showGenerationProgress, setShowGenerationProgress] = useState(false);
  const [currentGenerationStyle, setCurrentGenerationStyle] = useState('AI Avatar');
  const [currentGenerationNotify, setCurrentGenerationNotify] = useState(false);
  const [aiAvatarBannerDismissed, setAiAvatarBannerDismissed] = useState(false);

  const isMounted = useRef(true);
  const countriesRef = useRef(0);

  useEffect(() => {
    countriesRef.current = countries.length;
  }, [countries]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadCountriesFromCache = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(COUNTRIES_CACHE_KEY);
      if (!cached) {
        return { hasData: false, isFresh: false };
      }

      const parsed = JSON.parse(cached);
      if (!parsed || !Array.isArray(parsed.items)) {
        return { hasData: false, isFresh: false };
      }

      const isStale = parsed.savedAt && Date.now() - parsed.savedAt > COUNTRIES_CACHE_TTL;
      const fromFallback = parsed.fallback === true;
      const sorted = [...parsed.items].sort((a, b) => (a?.name ?? '').localeCompare(b?.name ?? ''));
      setCountries(sorted);
      if (fromFallback) {
        setError('Unable to load the full list. Showing popular countries for now.');
      } else {
        setError('');
      }
      return { hasData: true, isFresh: !isStale, isFallback: fromFallback };
    } catch (err) {
      console.warn('[CountryScreen] load countries cache failed', err);
      return { hasData: false, isFresh: false };
    }
  }, []);

  const loadCountries = useCallback(async () => {
    try {
      const data = await fetchCountries();
      if (!isMounted.current) {
        return;
      }
      const normalized = Array.isArray(data) ? data : [];
      const sorted = [...normalized].sort((a, b) => (a?.name ?? '').localeCompare(b?.name ?? ''));
      setCountries(sorted);
      setError('');

      AsyncStorage.setItem(
        COUNTRIES_CACHE_KEY,
        JSON.stringify({ savedAt: Date.now(), items: sorted, fallback: false })
      ).catch((err) => console.warn('[CountryScreen] persist countries cache failed', err));
    } catch (err) {
      if (!isMounted.current) {
        return;
      }
      if (countriesRef.current === 0) {
        const fallback = [...FALLBACK_COUNTRIES];
        setCountries(fallback);
        setError('Unable to load the full list. Showing popular countries for now.');
        AsyncStorage.setItem(
          COUNTRIES_CACHE_KEY,
          JSON.stringify({ savedAt: Date.now(), items: fallback, fallback: true })
        ).catch((storageErr) => console.warn('[CountryScreen] persist fallback cache failed', storageErr));
      } else {
        setError('Unable to refresh countries. Pull to refresh or try again later.');
      }
    }
  }, []);

  const loadPersonalCities = useCallback(async () => {
    if (!userProfile?.country || !userProfile?.province) {
      if (!isMounted.current) {
        return;
      }
      setPersonalCities([]);
      setPersonalError('');
      setPersonalLoading(false);
      return;
    }
    setPersonalLoading(true);
    try {
      const results = await fetchCities(userProfile.country, userProfile.province);
      if (!isMounted.current) {
        return;
      }
      const unique = Array.from(
        new Set((results ?? []).filter((name) => typeof name === 'string' && name.trim().length > 0))
      ).sort((a, b) => a.localeCompare(b));
      setPersonalCities(unique);
      setPersonalError('');
    } catch (err) {
      if (!isMounted.current) {
        return;
      }
      setPersonalError('Unable to load your province right now.');
      setPersonalCities([]);
    } finally {
      if (isMounted.current) {
        setPersonalLoading(false);
      }
    }
  }, [userProfile?.country, userProfile?.province]);

  const loadExploreFilters = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(EXPLORE_FILTERS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setExploreFilters({ ...DEFAULT_FILTERS, ...parsed });
      }
    } catch (err) {
      console.warn('[CountryScreen] Failed to load explore filters', err);
    }
  }, []);

  const handleSaveFilters = useCallback(async (newFilters) => {
    try {
      await AsyncStorage.setItem(EXPLORE_FILTERS_KEY, JSON.stringify(newFilters));
      setExploreFilters(newFilters);
      haptics.light();
    } catch (err) {
      console.warn('[CountryScreen] Failed to save explore filters', err);
    }
  }, [haptics]);

  const handleOpenFilterModal = useCallback(() => {
    haptics.light();
    setFilterModalVisible(true);
  }, [haptics]);

  const loadFilteredContent = useCallback(async () => {
    if (!userProfile?.city) return;

    const cacheKey = `${EXPLORE_CONTENT_CACHE_KEY}_${userProfile.city}`;
    let hasValidCache = false;

    // Try to load from cache first
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;

        // If cache is still valid, use it immediately (no loading state)
        if (age < EXPLORE_CONTENT_CACHE_TTL) {
          if (isMounted.current) {
            if (data.posts) setFilteredPosts(data.posts);
            if (data.artwork) setFilteredArtwork(data.artwork);
            if (data.users) setFilteredUsers(data.users);
            hasValidCache = true;
          }
          // Skip loading state if we have valid cache
          // But still fetch fresh data in background
        }
      }
    } catch (err) {
      console.error('[CountryScreen] Error loading cached content:', err);
    }

    // Only show loading state if we don't have cached data
    if (!hasValidCache) {
      setLoadingFilteredContent(true);
    }
    try {
      const promises = [];
      const freshData = { posts: [], artwork: [], users: [] };

      // Load posts if filter is enabled
      if (exploreFilters.showPostsFromCurrentCity) {
        promises.push(
          getPostsFromCity(userProfile.city, 10).then((posts) => {
            freshData.posts = posts;
            if (isMounted.current) setFilteredPosts(posts);
          })
        );
      } else {
        setFilteredPosts([]);
      }

      // Load AI artwork if filter is enabled
      if (exploreFilters.showAIArtGallery) {
        promises.push(
          getAIArtworkFromCity(userProfile.city, 20).then((artworks) => {
            freshData.artwork = artworks;
            if (isMounted.current) setFilteredArtwork(artworks);
          })
        );
      } else {
        setFilteredArtwork([]);
      }

      // Load users if filter is enabled
      if (exploreFilters.showLocalUsers) {
        promises.push(
          getLocalUsers(userProfile.city, currentUser?.uid, 20).then((users) => {
            freshData.users = users;
            if (isMounted.current) {
              setFilteredUsers(users);
            }
          })
        );
      } else {
        setFilteredUsers([]);
      }

      await Promise.all(promises);

      // Save fresh data to cache
      try {
        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({
            data: freshData,
            timestamp: Date.now(),
          })
        );
      } catch (err) {
        console.error('[CountryScreen] Error saving cache:', err);
      }
    } catch (err) {
      console.error('[CountryScreen] Error loading filtered content:', err);
    } finally {
      if (isMounted.current) {
        setLoadingFilteredContent(false);
      }
    }
  }, [userProfile?.city, exploreFilters, currentUser?.uid]);

  const handleRefresh = useCallback(async () => {
    haptics.light();
    setRefreshing(true);
    try {
      const postsRefreshPromise = refreshPosts ? refreshPosts() : Promise.resolve();
      await Promise.all([loadCountries(), loadPersonalCities(), postsRefreshPromise]);
    } finally {
      if (isMounted.current) {
        setRefreshing(false);
      }
    }
  }, [loadCountries, loadPersonalCities, refreshPosts, haptics]);

  // Load cartoon usage data
  const loadCartoonData = useCallback(async () => {
    if (!user?.uid) return;

    try {
      await checkAndResetMonthlyUsage(user.uid);
      const data = await getCartoonProfileData(user.uid);
      setCartoonUsageData(data);
    } catch (error) {
      console.error('[CountryScreen] Error loading cartoon data:', error);
    }
  }, [user?.uid]);

  // Handle cartoon generation
  const handleGenerateCartoon = async (styleId, customPrompt = null, generationOptions = {}) => {
    const { customImage, ignoreProfilePicture } = generationOptions;
    const needsProfilePhoto = !customImage && !ignoreProfilePicture;

    if (!user?.uid || (needsProfilePhoto && !userProfile?.profilePhoto)) {
      showAlert('Error', 'Please set a profile photo, upload a custom image, or enable "Generate without profile picture" before generating.', [], { type: 'warning' });
      return;
    }

    if (styleId === 'custom' && userProfile?.subscriptionPlan !== 'gold' && !isAdmin) {
      showAlert('Premium Feature', 'Custom prompts and custom images are exclusive to Gold members. Upgrade to Gold to unlock unlimited creative generation!', [], { type: 'warning' });
      return;
    }

    // Close modal and show progress
    setCartoonModalVisible(false);
    setIsGeneratingCartoon(true);

    const { notifyWhenDone = false } = generationOptions;
    const styleName = styleId === 'custom' ? 'Custom Avatar' : (styleId.charAt(0).toUpperCase() + styleId.slice(1));
    setCurrentGenerationStyle(styleName);
    setCurrentGenerationNotify(notifyWhenDone);
    setShowGenerationProgress(true);

    let tempImageData = null;

    try {
      const { model = 'gpt-3.5-turbo' } = generationOptions;
      const userPlan = userProfile?.subscriptionPlan || 'basic';

      let imageUrlToUse = null;
      if (customImage) {
        tempImageData = await uploadTemporaryCustomImage(user.uid, customImage);
        imageUrlToUse = tempImageData.url;
      } else if (!ignoreProfilePicture && userProfile.profilePhoto) {
        imageUrlToUse = userProfile.profilePhoto;
      }

      const result = await generateCartoonProfile(
        imageUrlToUse,
        styleId,
        userProfile.gender || 'neutral',
        customPrompt,
        userPlan,
        model,
        cartoonUsageData?.gpt4VisionUsage || 0
      );

      const storageUrl = await uploadCartoonToStorage(user.uid, result.imageUrl, styleId);

      await recordCartoonGeneration(
        user.uid,
        storageUrl,
        styleId === 'custom' ? 'custom' : styleId,
        isAdmin,
        userPlan,
        result.usedGpt4,
        customPrompt || null
      );

      if (tempImageData) {
        await deleteTemporaryCustomImage(tempImageData.storagePath);
        tempImageData = null;
      }

      await loadCartoonData();

      // Reload artwork gallery to show the new cartoon
      if (exploreFilters.showAIArtGallery) {
        try {
          const artworks = await getAIArtworkFromCity(userProfile.city, 20);
          setFilteredArtwork(artworks);
        } catch (artworkError) {
          console.warn('[CountryScreen] Failed to reload artwork:', artworkError);
        }
      }

      setShowGenerationProgress(false);
      setIsGeneratingCartoon(false);

      await new Promise(resolve => setTimeout(resolve, 300));

      if (notifyWhenDone) {
        const notifyStyleName = styleId === 'custom' ? 'custom' : styleId;
        await scheduleCartoonReadyNotification(notifyStyleName);
      }

      showAlert('Success', 'Your AI avatar has been generated! Check your profile to view it.', [], { type: 'success' });
    } catch (error) {
      console.error('[CountryScreen] Error generating cartoon:', error);

      if (tempImageData) {
        await deleteTemporaryCustomImage(tempImageData.storagePath);
      }

      setShowGenerationProgress(false);
      setIsGeneratingCartoon(false);

      await new Promise(resolve => setTimeout(resolve, 300));

      showAlert('Error', error.message || 'Failed to generate cartoon. Please try again.', [], { type: 'error' });
    }
  };

  // Clear cartoon data when user logs out
  useEffect(() => {
    if (!user?.uid) {
      setCartoonUsageData(null);
    }
  }, [user?.uid]);

  // Load cartoon data on mount and when subscription changes
  useEffect(() => {
    if (user?.uid) {
      loadCartoonData();
    }
  }, [user?.uid, userProfile?.subscriptionPlan, loadCartoonData]);

  // Reload cartoon data when screen comes into focus (to sync with Settings screen)
  useFocusEffect(
    useCallback(() => {
      if (user?.uid) {
        loadCartoonData();
      }
    }, [user?.uid, loadCartoonData])
  );

  const statusList = useMemo(
    () =>
      [...statuses]
        .filter(Boolean)
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
    [statuses]
  );

  const statusCarouselItems = useMemo(
    () => statusList.slice(0, 8),
    [statusList]
  );
  const carouselData = useMemo(() => {
    const items = statusCarouselItems.map((item, index) => ({
      key: item.id,
      type: 'status',
      status: item,
      index,
    }));
    items.push({ key: 'cta', type: 'cta' });
    return items;
  }, [statusCarouselItems]);

  const handleAddStatusPress = useCallback(() => {
    haptics.light();
    navigation.navigate('StatusComposer');
  }, [navigation, haptics]);

  const handleOpenStatus = useCallback(
    (status, index = 0) => {
      if (!status) return;
      haptics.light();
      const ids = statusCarouselItems.map((item) => item.id);
      navigation.navigate('StatusStoryViewer', {
        statusIds: ids,
        initialStatusId: status.id,
        initialIndex: index,
      });
    },
    [navigation, statusCarouselItems, haptics]
  );

  const handleSeeAllStatuses = useCallback(() => {
    haptics.light();
    navigation.navigate('TopStatuses');
  }, [navigation, haptics]);

  const styles = useMemo(() => createStyles(themeColors, { isDarkMode }), [themeColors, isDarkMode]);

  const renderCarouselItem = useCallback(
    ({ item }) => {
      if (item.type === 'cta') {
        return (
          <TouchableOpacity
            style={styles.carouselCtaCard}
            activeOpacity={0.9}
            onPress={handleAddStatusPress}
          >
            <View style={styles.carouselCtaIcon}>
              <Ionicons name="add" size={18} color="#fff" />
            </View>
            <Text style={styles.carouselCtaTitle}>New status</Text>
            <Text style={styles.carouselCtaSubtitle}>Share a quick update with neighbours</Text>
          </TouchableOpacity>
        );
      }
      return (
        <StatusStoryCard
          status={item.status}
          onPress={() => handleOpenStatus(item.status, item.index)}
        />
      );
    },
    [handleAddStatusPress, handleOpenStatus, styles]
  );

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!mounted) return;

      const cacheStatus = await loadCountriesFromCache();

      if (!mounted) return;

      if (!cacheStatus.hasData) {
        setLoading(true);
      }

      try {
        await loadCountries();
      } finally {
        if (mounted && isMounted.current) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [loadCountries, loadCountriesFromCache]);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [countries]);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [query]);

  const filtered = useMemo(() => {
    if (!query.trim()) {
      return countries;
    }
    const lower = query.trim().toLowerCase();
    return countries.filter(
      (country) =>
        country.name.toLowerCase().includes(lower) ||
        country.iso2?.toLowerCase().includes(lower) ||
        country.iso3?.toLowerCase().includes(lower)
    );
  }, [countries, query]);

  const topCountries = useMemo(() => {
    if (!countries.length) return [];
    const matched = FALLBACK_COUNTRY_CODES.map((code) =>
      countries.find((country) => country.iso2 === code)
    ).filter(Boolean);
    if (matched.length >= TOP_TRENDING_TO_SHOW) return matched.slice(0, TOP_TRENDING_TO_SHOW);
    const fallback = countries.filter(
      (country) => !matched.some((item) => item.iso2 === country.iso2)
    );
    return [...matched, ...fallback].slice(0, TOP_TRENDING_TO_SHOW);
  }, [countries]);

  const trendingCities = useMemo(() => {
    if (!getRecentCityActivity) return [];
    return getRecentCityActivity({
      limit: TOP_TRENDING_TO_SHOW,
      province: userProfile?.province,
      country: userProfile?.country
    });
  }, [getRecentCityActivity, userProfile?.province, userProfile?.country]);
  const hasLocalActivity = trendingCities.length > 0 && Boolean(userProfile?.country || userProfile?.province);
  const topChipItems = useMemo(() => {
    // Only show trending cities if the filter is enabled
    if (hasLocalActivity && exploreFilters.showTrendingCities) {
      return trendingCities.map((item) => ({
        type: 'city',
        city: item.city,
        province: item.province,
        country: item.country
      }));
    }
    return topCountries.map((item) => ({ type: 'country', country: item }));
  }, [hasLocalActivity, topCountries, trendingCities, exploreFilters.showTrendingCities]);

  const paginated = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  );

  const handleLoadMore = useCallback(() => {
    if (visibleCount >= filtered.length) return;
    setVisibleCount((prev) => Math.min(filtered.length, prev + PAGE_SIZE));
  }, [filtered.length, visibleCount]);

  const chipItemsToShow = topChipItems.slice(0, CHIP_ROW_MAX);

  useEffect(() => {
    loadPersonalCities();
  }, [loadPersonalCities]);

  useEffect(() => {
    loadExploreFilters();
  }, [loadExploreFilters]);

  useEffect(() => {
    loadFilteredContent();
  }, [loadFilteredContent]);

  const personalFiltered = useMemo(() => {
    if (!query.trim()) return personalCities;
    const lower = query.trim().toLowerCase();
    return personalCities.filter((cityName) => cityName.toLowerCase().includes(lower));
  }, [personalCities, query]);

  // Apply search query to filtered posts
  const searchFilteredPosts = useMemo(() => {
    if (!query.trim()) return filteredPosts;
    const lower = query.trim().toLowerCase();
    return filteredPosts.filter((post) => {
      return (
        post.title?.toLowerCase().includes(lower) ||
        post.description?.toLowerCase().includes(lower) ||
        post.username?.toLowerCase().includes(lower) ||
        post.displayName?.toLowerCase().includes(lower)
      );
    });
  }, [filteredPosts, query]);

  // Apply search query to filtered artwork
  const searchFilteredArtwork = useMemo(() => {
    if (!query.trim()) return filteredArtwork;
    const lower = query.trim().toLowerCase();
    return filteredArtwork.filter((artwork) => {
      return (
        artwork.style?.toLowerCase().includes(lower) ||
        artwork.prompt?.toLowerCase().includes(lower) ||
        artwork.username?.toLowerCase().includes(lower) ||
        artwork.displayName?.toLowerCase().includes(lower)
      );
    });
  }, [filteredArtwork, query]);

  // Apply search query to filtered users
  const searchFilteredUsers = useMemo(() => {
    if (!query.trim()) return filteredUsers;
    const lower = query.trim().toLowerCase();
    return filteredUsers.filter((user) => {
      return (
        user.username?.toLowerCase().includes(lower) ||
        user.displayName?.toLowerCase().includes(lower) ||
        user.bio?.toLowerCase().includes(lower)
      );
    });
  }, [filteredUsers, query]);

  // Create mixed feed with artworks, posts, users, and ads
  const mixedFeed = useMemo(() => {
    if (!exploreFilters.showAIArtGallery || !searchFilteredArtwork.length) {
      return [];
    }

    const feed = [];
    const ARTWORKS_PER_CHUNK = 6;
    const artworkChunks = [];

    // Split artworks into chunks of 6
    for (let i = 0; i < searchFilteredArtwork.length; i += ARTWORKS_PER_CHUNK) {
      artworkChunks.push(searchFilteredArtwork.slice(i, i + ARTWORKS_PER_CHUNK));
    }

    // Build the feed
    artworkChunks.forEach((chunk, index) => {
      // Add artwork chunk
      feed.push({
        type: 'artworkChunk',
        key: `artwork-chunk-${index}`,
        data: chunk,
      });

      // After each chunk, add a section (alternating between posts and users)
      if (index < artworkChunks.length - 1 || (index === artworkChunks.length - 1 && chunk.length === ARTWORKS_PER_CHUNK)) {
        const sections = [];

        if (exploreFilters.showPostsFromCurrentCity && searchFilteredPosts.length > 0) {
          sections.push('posts');
        }
        if (exploreFilters.showLocalUsers && searchFilteredUsers.length > 0) {
          sections.push('users');
        }

        if (sections.length > 0) {
          const sectionType = sections[index % sections.length];
          feed.push({
            type: sectionType,
            key: `${sectionType}-${index}`,
          });
        }

        // Randomly add an ad card (30% chance after each section)
        if (Math.random() < 0.3) {
          feed.push({
            type: 'ad',
            key: `ad-${index}-${Date.now()}`,
            adIndex: index % 5, // Cycle through 5 ad templates
          });
        }
      }
    });

    return feed;
  }, [searchFilteredArtwork, searchFilteredPosts, searchFilteredUsers, exploreFilters]);

  const showingPersonalized = userProfile?.country && userProfile?.province && personalCities.length > 0 && exploreFilters.showNearbyCities;
  const listData = showingPersonalized ? personalFiltered : paginated;
  const listIsEmpty = listData.length === 0;

  // Count active filters for badge
  const activeFiltersCount = useMemo(() => {
    return Object.values(exploreFilters).filter(Boolean).length;
  }, [exploreFilters]);

  // Check if any content filter is active (posts, artwork, users)
  const hasActiveContentFilter = useMemo(() => {
    return (
      exploreFilters.showPostsFromCurrentCity ||
      exploreFilters.showAIArtGallery ||
      exploreFilters.showLocalUsers
    );
  }, [exploreFilters]);

  // Get active filter names for subtitle
  const activeFilterNames = useMemo(() => {
    const names = [];
    if (exploreFilters.showNearbyCities) names.push('Nearby');
    if (exploreFilters.showPostsFromCurrentCity) names.push('Posts');
    if (exploreFilters.showAIArtGallery) names.push('AI Art');
    if (exploreFilters.showLocalUsers) names.push('Users');
    if (exploreFilters.showTrendingCities) names.push('Trending');
    return names;
  }, [exploreFilters]);

  return (
    <ScreenLayout
      title="Explore"
      subtitle="Choose your country"
      showSearch
      searchPlaceholder="Search countries"
      searchValue={query}
      onSearchChange={setQuery}
      navigation={navigation}
      activeTab="home"
      rightIcon="options"
      onRightPress={handleOpenFilterModal}
    >
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={themeColors.primaryDark} />
        </View>
      ) : (
        <FlatList
          data={hasActiveContentFilter ? [] : listData}
          keyExtractor={(item) =>
            showingPersonalized ? item : item.iso2 ?? item.name
          }
          renderItem={({ item }) =>
            showingPersonalized ? (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Room', { city: item })}
              >
                <Text style={styles.cardTitle}>{item}</Text>
                <Text style={styles.cardSubtitle}>
                  {[userProfile?.province, userProfile?.country].filter(Boolean).join(', ') || 'Jump into this city'}
                </Text>
                <Text style={styles.cardAction}>Enter room →</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate('Province', { country: item.name })
                }
              >
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSubtitle}>
                  {item.iso3 ? `ISO: ${item.iso3}` : 'Explore provinces and cities'}
                </Text>
                <Text style={styles.cardAction}>Select →</Text>
              </TouchableOpacity>
            )
          }
          ListHeaderComponent={
            <View>
              <EmailVerificationBanner />
              {showDiscoveryCard ? (
                <View style={styles.discoverySection}>
                  <NeighborhoodExplorer />
                  <View style={styles.discoveryFooter}>
                    <Text style={styles.discoveryHintText}>
                      Sensors personalize your discovery radius in real time.
                    </Text>
                    <TouchableOpacity
                      style={styles.discoveryLinkButton}
                      onPress={() => navigation.navigate('NeighborhoodExplorer')}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.discoveryLinkText}>Open full explorer</Text>
                      <Ionicons name="chevron-forward" size={16} color={themeColors.primaryDark} />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}
              <View style={styles.carouselSection}>
                <View style={styles.carouselHeader}>
                  <View>
                    <Text style={styles.carouselTitle}>Status spotlight</Text>
                    <Text style={styles.carouselSubtitle}>
                      {statusCarouselItems.length
                        ? 'Quick updates from neighbours near you'
                        : 'Share something happening around you'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.carouselLinkButton}
                    onPress={handleSeeAllStatuses}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.carouselLinkText}>See all</Text>
                    <Ionicons name="chevron-forward" size={16} color={themeColors.primaryDark} />
                  </TouchableOpacity>
                </View>
                {statusesLoading ? (
                  <View style={styles.skeletonContainer}>
                    {[0, 1, 2].map((index) => (
                      <View key={index} style={styles.skeletonCard}>
                        <Skeleton variant="circle" size={38} />
                        <Skeleton variant="rounded" width="100%" height={16} borderRadius={8} />
                        <Skeleton variant="rounded" width="70%" height={14} borderRadius={7} />
                      </View>
                    ))}
                  </View>
                ) : (
                  <FlatList
                    data={carouselData}
                    horizontal
                    keyExtractor={(item) => item.key}
                    renderItem={renderCarouselItem}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.carouselListContent}
                  />
                )}
                {statusesError && !statusesLoading ? (
                  <Text style={styles.carouselError}>{statusesError}</Text>
                ) : null}
              </View>

              {error && !listIsEmpty ? <Text style={styles.errorText}>{error}</Text> : null}

              {/* AI Avatar Generator Button */}
              {exploreFilters.showAIArtGallery && userProfile?.city && !aiAvatarBannerDismissed && (
                <TouchableOpacity
                  style={styles.aiAvatarButton}
                  onPress={() => {
                    haptics.light();
                    setCartoonModalVisible(true);
                  }}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#6C4DF4', '#8B5CF6', '#A78BFA']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.aiAvatarGradient}
                  >
                    <View style={styles.aiAvatarContent}>
                      <View style={styles.aiAvatarTextContainer}>
                        <Text style={styles.aiAvatarTitle}>✨ Generate Your AI Avatar</Text>
                        <Text style={styles.aiAvatarSubtitle}>Create cartoon avatars & AI art instantly</Text>
                      </View>
                      <View style={styles.aiAvatarIconContainer}>
                        <Ionicons name="sparkles" size={24} color="#fff" />
                      </View>
                    </View>

                    {/* Close Button */}
                    <TouchableOpacity
                      style={styles.aiAvatarCloseButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        haptics.light();
                        setAiAvatarBannerDismissed(true);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.aiAvatarCloseCircle}>
                        <Ionicons name="close" size={16} color="#fff" />
                      </View>
                    </TouchableOpacity>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {/* Mixed Feed: Artworks, Posts, Users, and Ads */}
              {exploreFilters.showAIArtGallery && userProfile?.city && (
                <View style={styles.mixedFeedContainer}>
                  {loadingFilteredContent ? (
                    <>
                      {/* Artwork skeleton */}
                      <ArtworkSkeletonLoader />

                      {/* Posts skeleton */}
                      {exploreFilters.showPostsFromCurrentCity && (
                        <View style={styles.filteredSection}>
                          <View style={styles.filteredHeader}>
                            <View>
                              <Skeleton variant="rounded" width={180} height={20} borderRadius={10} />
                              <Skeleton variant="rounded" width={220} height={14} borderRadius={7} style={{ marginTop: 6 }} />
                            </View>
                          </View>
                          <HorizontalListSkeletonLoader type="post" />
                        </View>
                      )}

                      {/* Ad skeleton */}
                      <AdSkeletonLoader />

                      {/* Users skeleton */}
                      {exploreFilters.showLocalUsers && (
                        <View style={styles.filteredSection}>
                          <View style={styles.filteredHeader}>
                            <View>
                              <Skeleton variant="rounded" width={200} height={20} borderRadius={10} />
                              <Skeleton variant="rounded" width={180} height={14} borderRadius={7} style={{ marginTop: 6 }} />
                            </View>
                          </View>
                          <HorizontalListSkeletonLoader type="user" />
                        </View>
                      )}
                    </>
                  ) : mixedFeed.length > 0 ? (
                    mixedFeed.map((feedItem) => {
                      if (feedItem.type === 'artworkChunk') {
                        return (
                          <View key={feedItem.key} style={styles.artworkChunkContainer}>
                            <ArtworkMasonryGrid
                              artworks={feedItem.data}
                              onArtworkPress={(artwork) => navigation.navigate('PublicProfile', { userId: artwork.userId })}
                              navigation={navigation}
                            />
                          </View>
                        );
                      }

                      if (feedItem.type === 'posts') {
                        return (
                          <View key={feedItem.key} style={styles.filteredSection}>
                            <View style={styles.filteredHeader}>
                              <View>
                                <Text style={styles.filteredTitle}>Posts from {userProfile.city}</Text>
                                <Text style={styles.filteredSubtitle}>Latest updates in your city</Text>
                              </View>
                              {searchFilteredPosts.length > 0 && (
                                <TouchableOpacity
                                  style={styles.seeAllButton}
                                  onPress={() => navigation.navigate('Room', { city: userProfile.city })}
                                  activeOpacity={0.85}
                                >
                                  <Text style={styles.seeAllText}>See all</Text>
                                  <Ionicons name="chevron-forward" size={16} color={themeColors.primaryDark} />
                                </TouchableOpacity>
                              )}
                            </View>
                            <FlatList
                              data={searchFilteredPosts}
                              horizontal
                              keyExtractor={(item) => item.id}
                              renderItem={({ item }) => (
                                <FilteredPostCard
                                  post={item}
                                  onPress={() => {
                                    const postCity = item.city || userProfile?.city;
                                    addFetchedPost(postCity, item);
                                    navigation.navigate('PostThread', {
                                      postId: item.id,
                                      city: postCity
                                    });
                                  }}
                                  showPostBackground={exploreFilters.showPostBackgrounds}
                                />
                              )}
                              showsHorizontalScrollIndicator={false}
                              contentContainerStyle={styles.horizontalList}
                            />
                          </View>
                        );
                      }

                      if (feedItem.type === 'users') {
                        return (
                          <View key={feedItem.key} style={styles.filteredSection}>
                            <View style={styles.filteredHeader}>
                              <View>
                                <Text style={styles.filteredTitle}>Local users in {userProfile.city}</Text>
                                <Text style={styles.filteredSubtitle}>Connect with people nearby</Text>
                              </View>
                            </View>
                            <FlatList
                              data={searchFilteredUsers}
                              horizontal
                              keyExtractor={(item) => item.uid}
                              renderItem={({ item }) => (
                                <FilteredUserCard
                                  user={item}
                                  onPress={() => navigation.navigate('PublicProfile', { userId: item.uid })}
                                />
                              )}
                              showsHorizontalScrollIndicator={false}
                              contentContainerStyle={styles.horizontalList}
                            />
                          </View>
                        );
                      }

                      if (feedItem.type === 'ad') {
                        return (
                          <SponsoredAdCard
                            key={feedItem.key}
                            adIndex={feedItem.adIndex}
                            onPress={() => {
                              // TODO: Navigate to sponsored content or open external link
                              console.log('Ad clicked:', feedItem.adIndex);
                            }}
                          />
                        );
                      }

                      return null;
                    })
                  ) : null}
                </View>
              )}

              {/* Only show cities section if NO content filters are active */}
              {!hasActiveContentFilter && (
                <>
                  <View style={styles.sectionHeader}>
                    <View>
                      <Text style={styles.sectionTitle}>Top picks</Text>
                      {activeFilterNames.length > 0 && (
                        <Text style={styles.sectionHint}>
                          {activeFilterNames.length === 1
                            ? `${activeFilterNames[0]} content`
                            : `${activeFilterNames.slice(0, 2).join(', ')}${activeFilterNames.length > 2 ? ` +${activeFilterNames.length - 2}` : ''}`}
                        </Text>
                      )}
                    </View>
                    {hasLocalActivity && exploreFilters.showTrendingCities ? (
                      <View style={styles.filterBadge}>
                        <Ionicons name="flame" size={14} color="#ef4444" />
                        <Text style={styles.filterBadgeText}>Trending</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.chipStaticRow}>
                    {chipItemsToShow.map((item, index) => {
                      const backgroundStyle = styles[`chipColor${index % 3}`];
                      const label = item.type === 'city' ? item.city : item.country.name;
                      const isLast = index === chipItemsToShow.length - 1;

                      return (
                        <TouchableOpacity
                          key={`${item.type}-${label}`}
                          style={[styles.chip, backgroundStyle, !isLast && styles.chipSpacing]}
                          activeOpacity={0.85}
                          onPress={() =>
                            item.type === 'city'
                              ? navigation.navigate('Room', { city: item.city })
                              : navigation.navigate('Province', { country: item.country.name })
                          }
                        >
                          {item.type === 'city' && index === 0 ? (
                            <View style={styles.hotBadge}>
                              <Text style={styles.hotBadgeText}>Hot</Text>
                            </View>
                          ) : null}
                          <Text style={styles.chipText} numberOfLines={1} ellipsizeMode="tail">
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={[styles.sectionTitle, styles.secondaryTitle]}>
                    {showingPersonalized
                      ? `${userProfile?.province || 'Your province'} cities`
                      : 'All destinations'}
                  </Text>
                  {showingPersonalized && personalError ? (
                    <Text style={styles.personalError}>{personalError}</Text>
                  ) : null}
                </>
              )}
            </View>
          }
          ListEmptyComponent={
            hasActiveContentFilter ? null : (
              showingPersonalized ? (
                personalLoading ? (
                  <ActivityIndicator size="small" color={themeColors.primaryDark} />
                ) : (
                  <Text style={styles.emptyState}>
                    {personalError || 'No cities match your search yet.'}
                  </Text>
                )
              ) : error ? (
                <Text style={styles.emptyState}>{error}</Text>
              ) : (
                <Text style={styles.emptyState}>No countries match your search yet.</Text>
              )
            )
          }
          ListFooterComponent={<View style={{ height: showAddShortcut ? 160 : 60 }} />}
          contentContainerStyle={[
            styles.listContent,
            listIsEmpty && styles.listContentEmpty
          ]}
          showsVerticalScrollIndicator={false}
          onEndReached={showingPersonalized ? undefined : handleLoadMore}
          onEndReachedThreshold={showingPersonalized ? undefined : 0.3}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}

      {/* Explore Filter Modal */}
      <ExploreFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        filters={exploreFilters}
        onSaveFilters={handleSaveFilters}
        userProfile={userProfile}
        navigation={navigation}
      />

      {/* Cartoon Style Modal */}
      <CartoonStyleModal
        visible={cartoonModalVisible}
        onClose={() => setCartoonModalVisible(false)}
        onStyleSelect={handleGenerateCartoon}
        userProfile={userProfile}
        usageData={cartoonUsageData}
        isGenerating={isGeneratingCartoon}
        isAdmin={isAdmin}
        navigation={navigation}
      />

      {/* Cartoon Generation Progress */}
      <CartoonGenerationProgress
        visible={showGenerationProgress}
        onClose={() => {
          setShowGenerationProgress(false);
          setIsGeneratingCartoon(false);
        }}
        onComplete={() => {
          // Handled in handleGenerateCartoon
        }}
        styleName={currentGenerationStyle}
        notifyWhenDone={currentGenerationNotify}
      />
    </ScreenLayout>
  );
}

const createStyles = (palette, { isDarkMode } = {}) =>
  StyleSheet.create({
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: palette.textPrimary,
      marginBottom: 16
    },
    discoverySection: {
      marginBottom: 28
    },
    discoveryFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
      flexWrap: 'wrap'
    },
    discoveryHintText: {
      flex: 1,
      marginRight: 12,
      marginBottom: 8,
      fontSize: 12,
      color: palette.textSecondary,
      minWidth: 180
    },
    discoveryLinkButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 14,
      backgroundColor: palette.background,
      borderWidth: 1,
      borderColor: palette.divider,
      marginTop: 4
    },
    discoveryLinkText: {
      fontSize: 13,
      fontWeight: '600',
      color: palette.primaryDark,
      marginRight: 4
    },
    carouselSection: {
      marginBottom: 24
    },
    carouselHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16
    },
    carouselTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: palette.textPrimary
    },
    carouselSubtitle: {
      marginTop: 4,
      fontSize: 12,
      color: palette.textSecondary
    },
    carouselLinkButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 14,
      backgroundColor: palette.background,
      borderWidth: 1,
      borderColor: palette.divider
    },
    carouselLinkText: {
      fontSize: 13,
      fontWeight: '600',
      color: palette.primaryDark,
      marginRight: 4
    },
    skeletonContainer: {
      flexDirection: 'row',
      gap: 16,
      paddingLeft: 4
    },
    skeletonCard: {
      width: 140,
      height: 200,
      borderRadius: 28,
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.divider,
      padding: 18,
      justifyContent: 'space-between',
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.2 : 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3
    },
    carouselListContent: {
      paddingBottom: 4,
      paddingRight: 12,
      paddingLeft: 4
    },
    carouselError: {
      marginTop: 10,
      fontSize: 12,
      color: '#ef4444'
    },
    carouselCtaCard: {
      width: 140,
      height: 200,
      borderRadius: 28,
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.divider,
      padding: 18,
      marginRight: 16,
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.2 : 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3
    },
    carouselCtaIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: palette.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12
    },
    carouselCtaTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: palette.textPrimary
    },
    carouselCtaSubtitle: {
      marginTop: 8,
      fontSize: 12,
      color: palette.textSecondary,
      lineHeight: 18
    },
    personalError: {
      marginTop: 6,
      fontSize: 12,
      color: '#ef4444'
    },
    sectionHint: {
      fontSize: 12,
      color: palette.textSecondary
    },
    secondaryTitle: {
      marginTop: 12
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4
    },
    filterBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#fef2f2',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#fee2e2'
    },
    filterBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#ef4444'
    },
    chipStaticRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'nowrap',
      justifyContent: 'space-between',
      marginTop: 12,
      marginBottom: 16
    },
    chip: {
      backgroundColor: palette.card,
      borderRadius: 999,
      paddingHorizontal: 18,
      paddingVertical: 10,
      minWidth: 110,
      flexShrink: 1,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.15 : 0.04,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
      position: 'relative'
    },
    chipSpacing: {
      marginRight: 12
    },
    chipText: {
      fontSize: 14,
      color: palette.textPrimary,
      fontWeight: '600',
      letterSpacing: 0.1,
      textAlign: 'center',
      lineHeight: 18
    },
    chipColor0: {
      backgroundColor: isDarkMode ? '#4230A6' : '#D8CEFF'
    },
    chipColor1: {
      backgroundColor: isDarkMode ? '#1F3F73' : '#CFE1FF'
    },
    chipColor2: {
      backgroundColor: isDarkMode ? '#5A2783' : '#EBD0FF'
    },
    hotBadge: {
      position: 'absolute',
      top: -8,
      right: -8,
      backgroundColor: '#FF4D6D',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10
    },
    hotBadgeText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase'
    },
    listContent: {
      paddingBottom: 80
    },
    listContentEmpty: {
      flexGrow: 1,
      justifyContent: 'center'
    },
    emptyState: {
      textAlign: 'center',
      color: palette.textSecondary,
      fontSize: 15
    },
    card: {
      backgroundColor: palette.card,
      borderRadius: 18,
      padding: 20,
      marginBottom: 14,
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.22 : 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: palette.textPrimary,
      marginBottom: 6
    },
    cardSubtitle: {
      fontSize: 14,
      color: palette.textSecondary,
      marginBottom: 16
    },
    cardAction: {
      fontSize: 13,
      fontWeight: '600',
      color: palette.primaryDark
    },
    loaderContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center'
    },
    errorText: {
      textAlign: 'center',
      color: palette.textSecondary,
      fontSize: 14,
      marginTop: 16,
      marginBottom: 12
    },
    filteredSection: {
      marginBottom: 24
    },
    filteredHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14
    },
    filteredTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: palette.textPrimary
    },
    filteredSubtitle: {
      fontSize: 12,
      color: palette.textSecondary,
      marginTop: 3
    },
    seeAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: palette.background,
      borderWidth: 1,
      borderColor: palette.divider
    },
    seeAllText: {
      fontSize: 13,
      fontWeight: '600',
      color: palette.primaryDark,
      marginRight: 3
    },
    horizontalList: {
      paddingBottom: 4,
      paddingRight: 12,
      paddingLeft: 2
    },
    loader: {
      marginVertical: 16
    },
    emptyFilterText: {
      fontSize: 13,
      textAlign: 'center',
      paddingVertical: 16
    },
    mixedFeedContainer: {
      paddingHorizontal: 4
    },
    artworkChunkContainer: {
      marginBottom: 24
    },
    aiAvatarButton: {
      marginHorizontal: 12,
      marginBottom: 24,
      marginTop: 12,
      borderRadius: 20,
      overflow: 'hidden',
      shadowColor: '#6C4DF4',
      shadowOpacity: 0.3,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    },
    aiAvatarGradient: {
      borderRadius: 20,
      padding: 20,
      position: 'relative',
    },
    aiAvatarContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    aiAvatarTextContainer: {
      flex: 1,
      marginRight: 16,
    },
    aiAvatarTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#FFFFFF',
      marginBottom: 4,
    },
    aiAvatarSubtitle: {
      fontSize: 13,
      color: 'rgba(255, 255, 255, 0.9)',
      fontWeight: '500',
    },
    aiAvatarIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    aiAvatarCloseButton: {
      position: 'absolute',
      top: 8,
      right: 12,
      zIndex: 10,
    },
    aiAvatarCloseCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
  });
