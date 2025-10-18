import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList
} from 'react-native';
import ScreenLayout from '../components/ScreenLayout';
import { colors } from '../constants/colors';

export default function ProvinceScreen({ navigation, route }) {
  const { country } = route.params;
  const [query, setQuery] = useState('');

  const provinces = useMemo(() => {
    if (country === 'South Africa') {
      return [
        { name: 'Gauteng', description: 'City lights and fast pace' },
        { name: 'Western Cape', description: 'Coastal views & winelands' },
        { name: 'KwaZulu-Natal', description: 'Warm beaches & culture' }
      ];
    }

    return [
      { name: 'Central', description: 'Main hub of activity' },
      { name: 'North', description: 'Nature reserves and escapes' },
      { name: 'South', description: 'Coastal calm and hidden gems' }
    ];
  }, [country]);

  const filtered = provinces.filter((province) =>
    province.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <ScreenLayout
      title={country}
      subtitle="Select a province"
      showSearch
      searchPlaceholder="Search provinces"
      searchValue={query}
      onSearchChange={setQuery}
      onBack={() => navigation.goBack()}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Provinces</Text>
        <TouchableOpacity activeOpacity={0.85}>
          <Text style={styles.sectionAction}>See all</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.filterRow}>
        {['All', 'Coastal', 'City life', 'Nature'].map((item) => (
          <View key={item} style={styles.filterChip}>
            <Text style={styles.filterText}>{item}</Text>
          </View>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate('City', { province: item.name })
            }
          >
            <View style={styles.cardTopRow}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardBadge}>Active</Text>
            </View>
            <Text style={styles.cardSubtitle}>{item.description}</Text>
            <Text style={styles.cardAction}>Enter →</Text>
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
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16
  },
  sectionAction: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '600'
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16
  },
  filterChip: {
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  filterText: {
    fontSize: 13,
    color: colors.textPrimary
  },
  listContent: {
    paddingBottom: 40
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
    marginBottom: 10
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary
  },
  cardBadge: {
    backgroundColor: colors.primaryLight,
    color: '#fff',
    fontSize: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    fontWeight: '600'
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16
  },
  cardAction: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryDark
  }
});
