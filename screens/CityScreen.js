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

export default function CityScreen({ navigation, route }) {
  const { province } = route.params;
  const [query, setQuery] = useState('');

  const cities = useMemo(() => {
    if (province === 'Gauteng') {
      return [
        { name: 'Johannesburg', description: 'Skyscrapers & culture' },
        { name: 'Pretoria', description: 'Jacarandas and heritage' },
        { name: 'Soweto', description: 'History and vibrant streets' }
      ];
    }

    return [
      { name: 'Coastview', description: 'Relaxed coastal living' },
      { name: 'Hillcrest', description: 'Leafy suburbs and coffee' },
      { name: 'Riverpark', description: 'Trails and family spaces' }
    ];
  }, [province]);

  const filtered = cities.filter((city) =>
    city.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <ScreenLayout
      title={province}
      subtitle="Pick a city room"
      showSearch
      searchPlaceholder="Search cities"
      searchValue={query}
      onSearchChange={setQuery}
      onBack={() => navigation.goBack()}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Cities</Text>
        <TouchableOpacity activeOpacity={0.85}>
          <Text style={styles.sectionAction}>View map</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tagsRow}>
        {['Popular', 'Nightlife', 'Coffee', 'Parks'].map((item) => (
          <View key={item} style={styles.tagChip}>
            <Text style={styles.tagText}>{item}</Text>
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
            onPress={() => navigation.navigate('Room', { city: item.name })}
          >
            <View style={styles.cardTopRow}>
              <View>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSubtitle}>{item.description}</Text>
              </View>
              <Text style={styles.cardBadge}>Live</Text>
            </View>
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
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16
  },
  tagChip: {
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
  tagText: {
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
    marginBottom: 16
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary
  },
  cardBadge: {
    backgroundColor: colors.primaryLight,
    color: '#fff',
    fontSize: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    fontWeight: '600'
  },
  cardAction: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryDark
  }
});
