import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  View,
  ActivityIndicator
} from 'react-native';
import ScreenLayout from '../components/ScreenLayout';
import { colors } from '../constants/colors';
import { useSettings } from '../contexts/SettingsContext';
import { fetchCountries, fetchCities } from '../services/locationService';

const INITIAL_VISIBLE = 40;
const PAGE_SIZE = 30;
const TOP_COUNTRY_CODES = ['US', 'CN', 'IN', 'ID', 'BR', 'PK', 'NG', 'BD', 'RU', 'MX'];

export default function CountryScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const { showAddShortcut, userProfile } = useSettings();

  const [countries, setCountries] = useState([]);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [personalCities, setPersonalCities] = useState([]);
  const [personalLoading, setPersonalLoading] = useState(false);
  const [personalError, setPersonalError] = useState('');
  const [showPersonalized, setShowPersonalized] = useState(false);
  const profileCountry = userProfile?.country ?? '';
  const profileProvince = userProfile?.province ?? '';
  const hasProfileLocation = Boolean(profileCountry && profileProvince);

  const loadPersonalCities = useCallback(async () => {
    if (!profileCountry || !profileProvince) {
      return;
    }
    try {
      setPersonalLoading(true);
      const results = await fetchCities(profileCountry, profileProvince);
      const unique = Array.from(
        new Set((results ?? []).filter((name) => typeof name === 'string' && name.trim().length > 0))
      ).sort((a, b) => a.localeCompare(b));
      setPersonalCities(unique);
      setPersonalError('');
    } catch (err) {
      setPersonalError('Unable to load your province right now.');
    } finally {
      setPersonalLoading(false);
    }
  }, [profileCountry, profileProvince]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const data = await fetchCountries();
        if (!mounted) return;
        const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name));
        setCountries(sorted);
        setError('');
      } catch (err) {
        if (!mounted) return;
        setError('Unable to load countries. Pull to refresh or try again later.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [countries]);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [query]);

  useEffect(() => {
    if (hasProfileLocation) {
      setShowPersonalized(true);
      loadPersonalCities();
    } else {
      setShowPersonalized(false);
      setPersonalCities([]);
      setPersonalError('');
    }
  }, [hasProfileLocation, loadPersonalCities]);

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

  const personalFiltered = useMemo(() => {
    if (!query.trim()) {
      return personalCities;
    }
    const lower = query.trim().toLowerCase();
    return personalCities.filter((cityName) => cityName.toLowerCase().includes(lower));
  }, [personalCities, query]);

  const topCountries = useMemo(() => {
    if (!countries.length) return [];
    const matched = TOP_COUNTRY_CODES.map((code) =>
      countries.find((country) => country.iso2 === code)
    ).filter(Boolean);
    if (matched.length >= 10) return matched;
    const fallback = countries.filter(
      (country) => !matched.some((item) => item.iso2 === country.iso2)
    );
    return [...matched, ...fallback].slice(0, 10);
  }, [TOP_COUNTRY_CODES, countries]);

  const paginated = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  );

  const handleLoadMore = useCallback(() => {
    if (visibleCount >= filtered.length) return;
    setVisibleCount((prev) => Math.min(filtered.length, prev + PAGE_SIZE));
  }, [filtered.length, visibleCount]);

  const showingPersonalized = hasProfileLocation && showPersonalized;
  const listData = showingPersonalized ? personalFiltered : paginated;
  const listIsEmpty = listData.length === 0;
  const searchPlaceholder = showingPersonalized ? 'Search cities' : 'Search countries';
  const subtitleText = showingPersonalized
    ? [profileProvince, profileCountry].filter(Boolean).join(' · ')
    : 'Choose your country';

  return (
    <ScreenLayout
      title="Explore"
      subtitle={subtitleText || 'Choose your country'}
      showSearch
      searchPlaceholder={searchPlaceholder}
      searchValue={query}
      onSearchChange={setQuery}
      navigation={navigation}
      activeTab="home"
    >
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primaryDark} />
        </View>
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top picks</Text>
          </View>
          <View style={styles.chipStaticRow}>
            {topCountries.map((item, index) => (
              <TouchableOpacity
                key={item.iso2 ?? item.name}
                style={[styles.chip, styles[`chipColor${index % 3}`]]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Province', { country: item.name })}
              >
                <Text style={styles.chipText}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, styles.secondaryTitle]}>
              {showingPersonalized
                ? `${profileProvince || 'Your province'} cities`
                : 'All destinations'}
            </Text>
            {hasProfileLocation ? (
              <TouchableOpacity
                onPress={() => setShowPersonalized((prev) => !prev)}
                activeOpacity={0.75}
              >
                <Text style={styles.sectionAction}>
                  {showingPersonalized ? 'Browse countries' : 'Show my cities'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {showingPersonalized && personalError ? (
            <Text style={styles.personalError}>{personalError}</Text>
          ) : null}

          <FlatList
            data={listData}
            keyExtractor={(item) =>
              typeof item === 'string' ? item : item.iso2 ?? item.name
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
                    {[profileProvince, profileCountry].filter(Boolean).join(', ') ||
                      'Jump into this city'}
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
            ListEmptyComponent={
              showingPersonalized ? (
                personalLoading ? (
                  <ActivityIndicator size="small" color={colors.primaryDark} />
                ) : (
                  <Text style={styles.emptyState}>
                    {personalError || 'No cities match your search yet.'}
                  </Text>
                )
              ) : (
                <Text style={styles.emptyState}>No countries match your search yet.</Text>
              )
            }
            ListFooterComponent={
              <View style={{ height: showAddShortcut ? 160 : 60 }} />
            }
            contentContainerStyle={[
              styles.listContent,
              listIsEmpty && styles.listContentEmpty
            ]}
            showsVerticalScrollIndicator={false}
            onEndReached={showingPersonalized ? undefined : handleLoadMore}
            onEndReachedThreshold={showingPersonalized ? undefined : 0.3}
          />
        </>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  secondaryTitle: {
    marginTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionAction: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '600',
  },
  chipStaticRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 16,
  },
  chip: {
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 12,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  chipText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
    letterSpacing: 0.1,
    textAlign: 'center',
    lineHeight: 18,
  },
  chipColor0: {
    backgroundColor: '#D8CEFF', // lilac
  },
  chipColor1: {
    backgroundColor: '#CFE1FF', // light blue
  },
  chipColor2: {
    backgroundColor: '#EBD0FF', // pink-lilac
  },
  listContent: {
    paddingBottom: 80,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 15,
  },
  personalError: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 8
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  cardAction: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  errorText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 40
  }
});
