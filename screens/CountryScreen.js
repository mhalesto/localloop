import React, { useMemo, useState } from 'react';
import { Text, TouchableOpacity, StyleSheet, FlatList, View, ScrollView } from 'react-native';
import ScreenLayout from '../components/ScreenLayout';
import { colors } from '../constants/colors';
import { useSettings } from '../contexts/SettingsContext';

export default function CountryScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const { showAddShortcut } = useSettings();

  const countries = useMemo(
    () => [
      { name: 'South Africa', description: 'Vibrant cities and hidden gems' },
      { name: 'Namibia', description: 'Desert sunsets & coastal breezes' },
      { name: 'Botswana', description: 'Wildlife, safaris and open skies' }
    ],
    []
  );

  const filtered = countries.filter((country) =>
    country.name.toLowerCase().includes(query.trim().toLowerCase())
  );

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
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent</Text>
        <TouchableOpacity activeOpacity={0.85}>
          <Text style={styles.sectionAction}>Clear all</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipScrollContent}
        style={styles.chipScroll}
      >
        {['South Africa', 'Namibia', 'Botswana', 'Zimbabwe', 'Lesotho']
          .slice(0, 10)
          .map((item, index) => (
            <TouchableOpacity
              key={item}
              style={[styles.chip, styles[`chipColor${index % 3}`]]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Province', { country: item })}
            >
              <Text style={styles.chipText}>
                {item}
              </Text>
            </TouchableOpacity>
          ))}
      </ScrollView>

      <Text style={[styles.sectionTitle, styles.secondaryTitle]}>
        Pinned destinations
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate('Province', { country: item.name })
            }
          >
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSubtitle}>{item.description}</Text>
            <Text style={styles.cardAction}>Select →</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyState}>
            No countries match your search yet.
          </Text>
        }
        ListFooterComponent={
          <View style={{ height: showAddShortcut ? 160 : 60 }} />
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
  chipScroll: {
    marginTop: 12,
    marginBottom: 16,
  },
  chipScrollContent: {
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  chip: {
    backgroundColor: colors.card,
    borderRadius: 22,
    paddingHorizontal: 24,
    paddingVertical: 13,
    height: 44,
    marginRight: 14,
    minWidth: 140,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  chipText: {
    fontSize: 14,
    color: colors.primaryDark,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
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
});
