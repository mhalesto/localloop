import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AccentBackground from './AccentBackground';

const defaultAccent = {
  background: '#6C4DF4',
  onPrimary: '#ffffff',
  subtitleColor: 'rgba(255,255,255,0.8)',
  iconTint: '#ffffff',
  iconBackground: 'rgba(255,255,255,0.1)',
  iconBorder: 'rgba(255,255,255,0.25)',
  placeholderColor: '#7A76A9',
  isDark: true,
  // optional: if you keep colors in accent, you can set this there and skip the prop
  postUnderlayColor: undefined,
};

export default function AppHeader({
  title,
  subtitle,
  onBack,
  onMenu,
  rightIcon,
  onRightPress,
  showSearch,
  searchPlaceholder = 'Search',
  onSearchChange,
  searchValue,
  wrapperStyle,
  accent = defaultAccent,
  rightBadgeCount = 0,

  // NEW: square filler that extends below the rounded header
  bottomFillColor,           // set this to your top post card color (e.g. themeColors.card)
  bottomFillHeight = 24,     // how far it extends
  showBottomFill = true,     // toggle on/off
}) {
  const insets = useSafeAreaInsets();

  // derive
  let {
    background = defaultAccent.background,
    onPrimary = defaultAccent.onPrimary,
    subtitleColor = defaultAccent.subtitleColor,
    iconTint = defaultAccent.iconTint,
    iconBackground = defaultAccent.iconBackground,
    iconBorder = defaultAccent.iconBorder,
    placeholderColor = accent?.isDark ? 'rgba(255,255,255,0.7)' : defaultAccent.placeholderColor,
    isDark = defaultAccent.isDark,
    postUnderlayColor = accent?.postUnderlayColor,
  } = accent ?? defaultAccent;

  const searchBackground = isDark ? 'rgba(255,255,255,0.2)' : '#ffffff';
  const searchTextColor = isDark ? '#ffffff' : '#1F1845';

  // prefer explicit prop; fall back to accent.postUnderlayColor; otherwise no fill
  const seamColor = bottomFillColor ?? postUnderlayColor ?? 'transparent';

  return (
    <View
      style={[
        styles.wrapper,
        { backgroundColor: background, paddingTop: insets.top + 12 },
        wrapperStyle
      ]}
    >
      {/* OS status bar matches header brightness; header bleeds under it */}
      <StatusBar translucent backgroundColor="transparent" barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* SHAPES (still clipped to the rounded header) */}
      <AccentBackground accent={accent} style={styles.backgroundLayer} bleedIntoStatusBar />

      {/* BOTTOM FILLER (square, no radius) that extends OUTSIDE the rounded header */}
      {showBottomFill && seamColor !== 'transparent' ? (
        <View
          pointerEvents="none"
          style={[
            styles.bottomFill,
            {
              height: bottomFillHeight,
              bottom: -bottomFillHeight, // extend outside the header
              backgroundColor: seamColor,
            }
          ]}
        />
      ) : null}

      <View style={styles.topRow}>
        <TouchableOpacity
          style={[styles.iconButton, { borderColor: iconBorder, backgroundColor: iconBackground }]}
          onPress={onBack ?? onMenu}
          disabled={!onBack && !onMenu}
          activeOpacity={0.8}
        >
          <Ionicons name={onBack ? 'chevron-back' : 'menu'} size={22} color={iconTint} />
        </TouchableOpacity>

        <View style={styles.titleBlock}>
          {subtitle ? <Text style={[styles.subtitle, { color: subtitleColor }]}>{subtitle}</Text> : null}
          {title ? <Text style={[styles.title, { color: onPrimary }]}>{title}</Text> : null}
        </View>

        <TouchableOpacity
          style={[styles.iconButton, { borderColor: iconBorder, backgroundColor: iconBackground }]}
          onPress={onRightPress}
          disabled={!onRightPress}
          activeOpacity={0.8}
        >
          <View style={styles.iconWithBadge}>
            <Ionicons name={rightIcon ?? 'notifications-outline'} size={22} color={iconTint} />
            {rightBadgeCount ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText} numberOfLines={1}>{rightBadgeCount > 99 ? '99+' : rightBadgeCount}</Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
      </View>

      {showSearch ? (
        <View style={[styles.searchWrapper, { backgroundColor: searchBackground }]}>
          <Ionicons name="search" size={18} color={placeholderColor} />
          <TextInput
            placeholder={searchPlaceholder}
            placeholderTextColor={placeholderColor}
            value={searchValue}
            onChangeText={onSearchChange}
            style={[styles.searchInput, { color: searchTextColor }]}
            autoCorrect={false}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingHorizontal: 20,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    overflow: 'visible',    // <— allow the square filler to extend out
    zIndex: 10,             // keep header above content so the filler covers the seam
  },
  backgroundLayer: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',     // <— shapes stay clipped to rounded header
  },
  bottomFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    // square: no border radius on purpose
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
  iconWithBadge: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center'
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  titleBlock: { flex: 1, marginHorizontal: 12 },
  subtitle: { fontSize: 13, marginBottom: 2 },
  title: { fontSize: 20, fontWeight: '600' },
  searchWrapper: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  searchInput: { marginLeft: 10, flex: 1, fontSize: 14 }
});
