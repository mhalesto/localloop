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
import ScreenLayout from '../components/ScreenLayout';
import StatusCard from '../components/StatusCard';
import { useSettings } from '../contexts/SettingsContext';
import { usePosts } from '../contexts/PostsContext';
import { useStatuses } from '../contexts/StatusesContext';
import { fetchCountries, fetchCities } from '../services/locationService';

const INITIAL_VISIBLE = 40;
const PAGE_SIZE = 30;
const TOP_TRENDING_TO_SHOW = 6;
const CHIP_ROW_MAX = 4;
const FALLBACK_COUNTRY_CODES = ['US', 'CN', 'IN', 'ID', 'BR', 'PK', 'NG', 'BD', 'RU', 'MX'];
const COUNTRIES_CACHE_KEY = '@toilet.countriesCache';
const COUNTRIES_CACHE_TTL = 1000 * 60 * 60 * 24; // 24h
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
  const { showAddShortcut, userProfile, themeColors, isDarkMode } = useSettings();
  const { getRecentCityActivity, refreshPosts } = usePosts();
  const {
    statuses,
    isLoading: statusesLoading,
    toggleStatusReaction,
    reportStatus: reportStatusStatus,
    statusesError,
  } = useStatuses();
  const [viewMode, setViewMode] = useState('picks');

  const [countries, setCountries] = useState([]);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [personalCities, setPersonalCities] = useState([]);
  const [personalLoading, setPersonalLoading] = useState(false);
  const [personalError, setPersonalError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

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

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const postsRefreshPromise = refreshPosts ? refreshPosts() : Promise.resolve();
      await Promise.all([loadCountries(), loadPersonalCities(), postsRefreshPromise]);
    } finally {
      if (isMounted.current) {
        setRefreshing(false);
      }
    }
  }, [loadCountries, loadPersonalCities, refreshPosts]);

  const statusList = useMemo(
    () =>
      [...statuses]
        .filter(Boolean)
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
    [statuses]
  );

  const isStatusesView = viewMode === 'statuses';
  const statusesEmpty = statusList.length === 0;

  const handleAddStatusPress = useCallback(() => {
    navigation.navigate('StatusComposer');
  }, [navigation]);

  const handleOpenStatus = useCallback(
    (status) => {
      navigation.navigate('StatusDetail', { statusId: status.id });
    },
    [navigation]
  );

  const handleReactToStatus = useCallback(
    async (status) => {
      await toggleStatusReaction(status.id, 'heart');
    },
    [toggleStatusReaction]
  );

  const handleReportStatus = useCallback(
    async (status) => {
      await reportStatusStatus(status.id, 'inappropriate');
    },
    [reportStatusStatus]
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
    if (hasLocalActivity) {
      return trendingCities.map((item) => ({
        type: 'city',
        city: item.city,
        province: item.province,
        country: item.country
      }));
    }
    return topCountries.map((item) => ({ type: 'country', country: item }));
  }, [hasLocalActivity, topCountries, trendingCities]);

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

  const personalFiltered = useMemo(() => {
    if (!query.trim()) return personalCities;
    const lower = query.trim().toLowerCase();
    return personalCities.filter((cityName) => cityName.toLowerCase().includes(lower));
  }, [personalCities, query]);

  const showingPersonalized = userProfile?.country && userProfile?.province && personalCities.length > 0;
  const listData = showingPersonalized ? personalFiltered : paginated;
  const listIsEmpty = listData.length === 0;

  const styles = useMemo(() => createStyles(themeColors, { isDarkMode }), [themeColors, isDarkMode]);

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
    >
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleButton, !isStatusesView && styles.toggleButtonActive]}
          onPress={() => setViewMode('picks')}
          activeOpacity={0.9}
        >
          <Text style={[styles.toggleLabel, !isStatusesView && styles.toggleLabelActive]}>Top picks</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, isStatusesView && styles.toggleButtonActive]}
          onPress={() => setViewMode('statuses')}
          activeOpacity={0.9}
        >
          <Text style={[styles.toggleLabel, isStatusesView && styles.toggleLabelActive]}>Top statuses</Text>
        </TouchableOpacity>
      </View>

      {isStatusesView ? (
        statusesLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={themeColors.primaryDark} />
          </View>
        ) : (
          <FlatList
            data={statusList}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={
              <View style={styles.statusHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Top statuses</Text>
                  <Text style={styles.sectionHint}>Fresh updates from your area</Text>
                </View>
                <TouchableOpacity
                  style={styles.statusCta}
                  onPress={handleAddStatusPress}
                  activeOpacity={0.85}
                >
                  <Ionicons name="create-outline" size={18} color={themeColors.primaryDark} />
                  <Text style={styles.statusCtaLabel}>New status</Text>
                </TouchableOpacity>
              </View>
            }
            ListEmptyComponent={
              <Text style={styles.emptyState}>
                {statusesError ? statusesError : 'No statuses yet. Be the first to post!'}
              </Text>
            }
            renderItem={({ item }) => (
              <StatusCard
                status={item}
                onPress={handleOpenStatus}
                onReact={handleReactToStatus}
                onReport={handleReportStatus}
              />
            )}
            contentContainerStyle={[
              styles.statusListContent,
              statusesEmpty && styles.listContentEmpty
            ]}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={themeColors.primaryDark} />
        </View>
      ) : (
        <FlatList
          data={listData}
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
              {error && !listIsEmpty ? <Text style={styles.errorText}>{error}</Text> : null}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Top picks</Text>
                {hasLocalActivity ? (
                  <Text style={styles.sectionHint}>Latest activity near you</Text>
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
            </View>
          }
          ListEmptyComponent={
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
    toggleRow: {
      flexDirection: 'row',
      marginBottom: 16,
      gap: 12
    },
    toggleButton: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.divider,
      backgroundColor: palette.background,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center'
    },
    toggleButtonActive: {
      backgroundColor: palette.primary,
      borderColor: palette.primary
    },
    toggleLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.textSecondary
    },
    toggleLabelActive: {
      color: '#fff'
    },
    statusHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16
    },
    statusCta: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: palette.background,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.divider
    },
    statusCtaLabel: {
      marginLeft: 8,
      fontSize: 13,
      fontWeight: '600',
      color: palette.primaryDark
    },
    statusListContent: {
      paddingBottom: 120
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
      alignItems: 'center'
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
    }
  });
