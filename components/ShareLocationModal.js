import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../contexts/SettingsContext';
import { fetchCities, fetchCountries, fetchStates } from '../services/locationService';

function normalizeName(name) {
  return name?.trim().toLowerCase() ?? '';
}

export default function ShareLocationModal({
  visible,
  onClose,
  onSelectCity,
  originCity,
  accentColor,
  initialCountry,
  initialProvince,
  title = 'Share to another room'
}) {
  const { themeColors, isDarkMode } = useSettings();
  const styles = useMemo(() => createStyles(themeColors, { isDarkMode }), [themeColors, isDarkMode]);
  const effectiveAccentColor = accentColor ?? themeColors.primaryDark;
  const [step, setStep] = useState('country');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [countries, setCountries] = useState([]);
  const [provinceCache, setProvinceCache] = useState({});
  const [cityCache, setCityCache] = useState({});

  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedProvince, setSelectedProvince] = useState(null);

  const fetchTracker = useRef({
    countries: false,
    provinces: new Set(),
    cities: new Set()
  });

  const resetState = useCallback(() => {
    setStep('country');
    setSearch('');
    setError('');
    setSelectedCountry(null);
    setSelectedProvince(null);
    setLoading(false);
  }, []);

  const ensureCountries = useCallback(async () => {
    if (countries.length > 0) return;
    const tracker = fetchTracker.current;
    if (tracker.countries) return;
    tracker.countries = true;
    try {
      setLoading(true);
      const result = await fetchCountries();
      const sorted = [...result].sort((a, b) => a.name.localeCompare(b.name));
      setCountries(sorted);
      setError('');
    } catch (err) {
      setError('Unable to load countries right now.');
    } finally {
      tracker.countries = false;
      setLoading(false);
    }
  }, [countries.length]);

  const ensureProvinces = useCallback(
    async (countryName) => {
      if (!countryName) return;
      if (provinceCache[countryName]) return;
      const tracker = fetchTracker.current;
      if (tracker.provinces.has(countryName)) return;
      tracker.provinces.add(countryName);
      try {
        setLoading(true);
        const { states, fallback } = await fetchStates(countryName);
        const sorted = [...(states ?? [])].sort((a, b) => a.localeCompare(b));
        setProvinceCache((prev) => ({ ...prev, [countryName]: sorted }));
        setError(
          fallback
            ? 'Unable to reach the full list right now. Showing a limited set for now.'
            : ''
        );
      } catch (err) {
        setError('Unable to load provinces right now.');
      } finally {
        tracker.provinces.delete(countryName);
        setLoading(false);
      }
    },
    [provinceCache]
  );

  const ensureCities = useCallback(
    async (countryName, provinceName) => {
      if (!countryName || !provinceName) return;
      const cacheKey = `${countryName}::${provinceName}`;
      if (cityCache[cacheKey]) return;
      const tracker = fetchTracker.current;
      if (tracker.cities.has(cacheKey)) return;
      tracker.cities.add(cacheKey);
      try {
        setLoading(true);
        const results = await fetchCities(countryName, provinceName);
        const unique = Array.from(
          new Set((results ?? []).filter((name) => typeof name === 'string' && name.trim().length > 0))
        ).sort((a, b) => a.localeCompare(b));
        setCityCache((prev) => ({ ...prev, [cacheKey]: unique }));
        setError('');
      } catch (err) {
        setError('Unable to load cities right now.');
      } finally {
        tracker.cities.delete(cacheKey);
        setLoading(false);
      }
    },
    [cityCache]
  );

  useEffect(() => {
    if (!visible) return;
    ensureCountries();
  }, [ensureCountries, visible]);

  useEffect(() => {
    if (!visible) return;
    if (step === 'province' && selectedCountry) {
      ensureProvinces(selectedCountry.name);
    } else if (step === 'city' && selectedCountry && selectedProvince) {
      ensureCities(selectedCountry.name, selectedProvince);
    }
  }, [
    ensureCities,
    ensureProvinces,
    selectedCountry,
    selectedProvince,
    step,
    visible
  ]);

  // Auto-select initial values if provided
  useEffect(() => {
    if (!visible) {
      return;
    }
    if (initialCountry && !selectedCountry && countries.length > 0) {
      const found = countries.find(
        (item) => normalizeName(item.name) === normalizeName(initialCountry)
      );
      if (found) {
        setSelectedCountry(found);
        setStep('province');
      }
    }
  }, [countries, initialCountry, initialProvince, selectedCountry, visible]);

  useEffect(() => {
    if (!visible) return;
    if (
      initialProvince &&
      step === 'province' &&
      selectedCountry &&
      provinceCache[selectedCountry.name]?.length
    ) {
      const list = provinceCache[selectedCountry.name];
      const found = list.find((item) => normalizeName(item) === normalizeName(initialProvince));
      if (found) {
        setSelectedProvince(found);
        setStep('city');
      }
    }
  }, [initialProvince, provinceCache, selectedCountry, step, visible]);

  const currentOptions = useMemo(() => {
    if (step === 'country') {
      return countries.map((item) => ({
        key: item.iso2 ?? item.name,
        label: item.name,
        subtitle: 'Country',
        data: item
      }));
    }
    if (step === 'province' && selectedCountry) {
      const list = provinceCache[selectedCountry.name] ?? [];
      return list.map((name) => ({
        key: name,
        label: name,
        subtitle: 'Province',
        data: name
      }));
    }
    if (step === 'city' && selectedCountry && selectedProvince) {
      const cacheKey = `${selectedCountry.name}::${selectedProvince}`;
      const list = cityCache[cacheKey] ?? [];
      return list
        .filter((name) => normalizeName(name) !== normalizeName(originCity))
        .map((name) => ({
          key: name,
          label: name,
          subtitle: 'City',
          data: name
        }));
    }
    return [];
  }, [cityCache, countries, originCity, provinceCache, selectedCountry, selectedProvince, step]);

  const filteredOptions = useMemo(() => {
    const trimmed = search.trim().toLowerCase();
    if (!trimmed) {
      return currentOptions;
    }
    return currentOptions.filter((option) => option.label.toLowerCase().includes(trimmed));
  }, [currentOptions, search]);

  const shareStepTitle =
    step === 'country'
      ? 'Choose a country'
      : step === 'province'
      ? `Choose a province in ${selectedCountry?.name ?? 'this country'}`
      : `Choose a city in ${selectedProvince ?? 'this province'}`;

  const searchPlaceholder =
    step === 'country'
      ? 'Search countries'
      : step === 'province'
      ? 'Search provinces or states'
      : 'Search cities';

  const pathLabel = useMemo(() => {
    if (!selectedCountry) return '';
    if (!selectedProvince) return selectedCountry.name;
    return `${selectedCountry.name} · ${selectedProvince}`;
  }, [selectedCountry, selectedProvince]);

  const emptyMessage =
    step === 'country'
      ? 'No countries match your search yet.'
      : step === 'province'
      ? 'No provinces match your search yet.'
      : 'No cities match your search yet.';

  const handleBack = useCallback(() => {
    if (step === 'city') {
      setStep('province');
      setSelectedProvince(null);
    } else if (step === 'province') {
      setStep('country');
      setSelectedCountry(null);
      setSelectedProvince(null);
    }
    setSearch('');
    setError('');
  }, [step]);

  const handleSelect = useCallback(
    async (option) => {
      if (step === 'country') {
        setSelectedCountry(option.data);
        setSelectedProvince(null);
        setStep('province');
        setSearch('');
        setError('');
        await ensureProvinces(option.data.name);
        return;
      }

      if (step === 'province') {
        const provinceName = option.data;
        setSelectedProvince(provinceName);
        setStep('city');
        setSearch('');
        setError('');
        await ensureCities(selectedCountry.name, provinceName);
        return;
      }

      if (step === 'city') {
        onSelectCity(option.data, {
          country: selectedCountry?.name ?? null,
          province: selectedProvince ?? null
        });
        onClose();
      }
    },
    [ensureCities, ensureProvinces, onClose, onSelectCity, selectedCountry, selectedProvince, step]
  );

  useEffect(() => {
    if (!visible) {
      resetState();
    }
  }, [resetState, visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{shareStepTitle}</Text>
          {step !== 'country' ? (
            <TouchableOpacity style={styles.backButton} activeOpacity={0.7} onPress={handleBack}>
              <Ionicons name="chevron-back" size={16} color={effectiveAccentColor} />
              <Text style={[styles.backLabel, { color: effectiveAccentColor }]}>Back</Text>
            </TouchableOpacity>
          ) : null}
          {pathLabel ? <Text style={styles.pathLabel}>Selected: {pathLabel}</Text> : null}
          <TextInput
            placeholder={searchPlaceholder}
            value={search}
            onChangeText={setSearch}
            style={styles.input}
            placeholderTextColor={themeColors.textSecondary}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <FlatList
            data={filteredOptions}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.option}
                activeOpacity={0.75}
                onPress={() => handleSelect(item)}
              >
                <Text style={styles.optionLabel}>{item.label}</Text>
                <Text style={styles.optionType}>{item.subtitle}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              loading ? (
                <View style={styles.emptyState}>
                  <ActivityIndicator size="small" color={effectiveAccentColor} />
                </View>
              ) : (
                <Text style={styles.emptyText}>{emptyMessage}</Text>
              )
            }
            style={styles.list}
            keyboardShouldPersistTaps="handled"
          />
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeLabel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (palette, { isDarkMode } = {}) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'center',
      padding: 24
    },
    card: {
      borderRadius: 20,
      backgroundColor: palette.card,
      padding: 20,
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.28 : 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: palette.textPrimary,
      marginBottom: 12
    },
    subtitle: {
      fontSize: 13,
      color: palette.textSecondary,
      marginBottom: 8
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      marginBottom: 8
    },
    backLabel: {
      fontSize: 13,
      fontWeight: '600',
      marginLeft: 4
    },
    pathLabel: {
      fontSize: 12,
      color: palette.textSecondary,
      marginBottom: 12
    },
    input: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.divider,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: palette.textPrimary,
      backgroundColor: isDarkMode ? palette.background : '#ffffff',
      marginBottom: 12
    },
    error: {
      color: palette.primaryDark,
      fontSize: 12,
      marginBottom: 8
    },
    list: {
      maxHeight: 240
    },
    option: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: palette.divider
    },
    optionLabel: {
      fontSize: 14,
      color: palette.textPrimary,
      fontWeight: '600'
    },
    optionType: {
      fontSize: 11,
      color: palette.textSecondary,
      textTransform: 'uppercase'
    },
    emptyState: {
      paddingVertical: 24,
      alignItems: 'center',
      justifyContent: 'center'
    },
    emptyText: {
      textAlign: 'center',
      color: palette.textSecondary,
      fontSize: 13,
      paddingVertical: 20
    },
    closeButton: {
      marginTop: 12,
      alignSelf: 'center'
    },
    closeLabel: {
      color: palette.textPrimary,
      fontWeight: '600',
      fontSize: 14
    }
  });
