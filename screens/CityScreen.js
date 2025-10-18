import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator
} from 'react-native';
import ScreenLayout from '../components/ScreenLayout';
import { colors } from '../constants/colors';
import { fetchCities } from '../services/locationService';

const INITIAL_VISIBLE = 50;
const PAGE_SIZE = 30;

export default function CityScreen({ navigation, route }) {
  const { country, province } = route.params;
  const [query, setQuery] = useState('');

  const [cities, setCities] = useState([]);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const items = await fetchCities(country, province);
        if (!mounted) return;
        const unique = Array.from(new Set(items)).map((name) => ({ name }));
        setCities(unique);
        setError('');
        setVisibleCount(INITIAL_VISIBLE);
      } catch (err) {
        if (!mounted) return;
        setError('Unable to load cities right now.');
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
  }, [country, province]);

  const filtered = useMemo(() => {
    if (!query.trim()) return cities;
    const lower = query.trim().toLowerCase();
    return cities.filter((city) => city.name.toLowerCase().includes(lower));
  }, [cities, query]);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [query]);

  const paginated = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  );

  const handleLoadMore = useCallback(() => {
    if (visibleCount >= filtered.length) return;
    setVisibleCount((prev) => Math.min(filtered.length, prev + PAGE_SIZE));
  }, [filtered.length, visibleCount]);

  return (
    <ScreenLayout
      title={province}
      subtitle="Pick a city room"
      showSearch
      searchPlaceholder="Search cities"
      searchValue={query}
      onSearchChange={setQuery}
      onBack={() => navigation.goBack()}
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
        <FlatList
          data={paginated}
          keyExtractor={(item) => item.name}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Room', { city: item.name })}
            >
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardAction}>Open room →</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyState}>
              No cities match your search yet.
            </Text>
          }
          contentContainerStyle={[
            styles.listContent,
            filtered.length === 0 && styles.listContentEmpty
          ]}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
        />
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 80
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center'
  },
  emptyState: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 15
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
    elevation: 3
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4
  },
  cardAction: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryDark
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
