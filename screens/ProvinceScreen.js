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
import { fetchStates } from '../services/locationService';

const INITIAL_VISIBLE = 40;
const PAGE_SIZE = 30;

export default function ProvinceScreen({ navigation, route }) {
  const { country } = route.params;
  const [query, setQuery] = useState('');

  const [provinces, setProvinces] = useState([]);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const states = await fetchStates(country);
        if (!mounted) return;
        const items = states.map((name) => ({ name }));
        setProvinces(items);
        setError('');
        setVisibleCount(INITIAL_VISIBLE);
      } catch (err) {
        if (!mounted) return;
        setError('Unable to load provinces right now.');
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
  }, [country]);

  const filtered = useMemo(() => {
    if (!query.trim()) return provinces;
    const lower = query.trim().toLowerCase();
    return provinces.filter((province) => province.name.toLowerCase().includes(lower));
  }, [provinces, query]);

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
      title={country}
      subtitle="Select a province"
      showSearch
      searchPlaceholder="Search provinces"
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
              onPress={() =>
                navigation.navigate('City', { country, province: item.name })
              }
            >
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardAction}>See cities →</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyState}>
              No provinces match your search yet.
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary
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
