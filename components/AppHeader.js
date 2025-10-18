import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';

export default function AppHeader({
  title,
  subtitle,
  onBack,
  rightIcon,
  onRightPress,
  showSearch,
  searchPlaceholder = 'Search',
  onSearchChange,
  searchValue
}) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onBack}
          disabled={!onBack}
          activeOpacity={0.8}
        >
          <Ionicons
            name={onBack ? 'chevron-back' : 'menu'}
            size={22}
            color="#fff"
          />
        </TouchableOpacity>

        <View style={styles.titleBlock}>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {title ? <Text style={styles.title}>{title}</Text> : null}
        </View>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={onRightPress}
          disabled={!onRightPress}
          activeOpacity={0.8}
        >
          <Ionicons
            name={rightIcon ?? 'notifications-outline'}
            size={22}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      {showSearch ? (
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            placeholder={searchPlaceholder}
            placeholderTextColor={colors.textSecondary}
            value={searchValue}
            onChangeText={onSearchChange}
            style={styles.searchInput}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)'
  },
  titleBlock: {
    flex: 1,
    marginHorizontal: 12
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginBottom: 2
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600'
  },
  searchWrapper: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  searchInput: {
    marginLeft: 10,
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14
  }
});
