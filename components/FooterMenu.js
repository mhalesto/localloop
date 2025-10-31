// FooterMenu.js
import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Mask, Rect, Circle } from 'react-native-svg';
import { useSettings } from '../contexts/SettingsContext';

/**
 * theme tokens:
 *  themeColors.card          -> bar fill
 *  themeColors.primary       -> FAB color
 *  themeColors.primaryDark   -> active tab color
 *  themeColors.textSecondary -> inactive tab color
 */

const tabs = [
  { key: 'home', label: 'Explore', icon: 'home-outline' },
  { key: 'myComments', label: 'My Replies', icon: 'chatbubble-ellipses-outline' },
  { key: 'settings', label: 'Settings', icon: 'settings-outline' },
];

// ===== TUNABLES =====
const BAR_HEIGHT = 76;
const CORNER_R = 28;

const NOTCH_R = 38;
const SPACER_EXTRA = -16;

const FAB_SIZE = 56;
const FAB_NUDGE_X = 0;
const FAB_RISE = 8;

const TAB_ROW_PADDING_H = 6;
// =====================

export default function FooterMenu({
  activeTab,
  onPressTab,
  onAddPostShortcut,
  showShortcut = true,
  accent,
  myRepliesBadge = 0
}) {
  const { themeColors, isDarkMode } = useSettings();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 12);

  const [barW, setBarW] = useState(0);
  const [anchorX, setAnchorX] = useState(null); // center of gap (between Explore & My Replies)
  const maskId = useRef(`mask_${Math.random().toString(36).slice(2)}`).current;

  // Notch / FAB x-position
  const notchCx = anchorX != null ? anchorX + FAB_NUDGE_X : null;

  const accentActiveColor = accent?.buttonBackground ?? themeColors.primaryDark;
  const accentInactiveColor = themeColors.textSecondary;
  const accentFabBackground = accent?.fabBackground ?? themeColors.primary;
  const accentFabForeground = accent?.fabForeground ?? '#fff';

  // Keep notch inside SVG viewport - increased for deeper curve
  const OFFSET_Y = NOTCH_R;
  const SVG_H = BAR_HEIGHT + OFFSET_Y;

  // Equal tab widths (3 tabs) with spacer width for the notch
  const spacerW = NOTCH_R * 2 + SPACER_EXTRA * 2;
  const contentW = Math.max(0, barW - TAB_ROW_PADDING_H * 2 - (showShortcut ? spacerW : 0));
  const tabItemW = contentW > 0 ? contentW / 3 : 90;

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { paddingBottom: bottomPad }]}>
      <View
        style={[
          styles.barWrap,
          { shadowOpacity: isDarkMode ? 0.12 : 0.08 }
        ]}
        onLayout={(e) => setBarW(e.nativeEvent.layout.width)}
      >
        {/* SVG pill with true circular notch via luminance mask */}
        {barW > 0 && (
          <Svg
            width={barW}
            height={SVG_H}
            style={[StyleSheet.absoluteFill, { top: -OFFSET_Y }]}
            pointerEvents="none"
          >
            <Defs>
              <Mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={barW} height={SVG_H}>
                <Rect
                  x="0"
                  y={OFFSET_Y}
                  width={barW}
                  height={BAR_HEIGHT}
                  rx={CORNER_R}
                  ry={CORNER_R}
                  fill="#fff"
                />
                {showShortcut && notchCx != null ? (
                  <Circle cx={notchCx + FAB_NUDGE_X} cy={OFFSET_Y} r={NOTCH_R} fill="#000" />
                ) : null}
              </Mask>
            </Defs>
            <Rect
              x="0"
              y="0"
              width={barW}
              height={SVG_H}
              fill={themeColors.card}
              mask={`url(#${maskId})`}
            />
          </Svg>
        )}

        {/* Tabs (equal spacing) */}
        <View style={styles.tabRow}>
          <TabItem
            width={tabItemW}
            tab={tabs[0]}
            active={activeTab === tabs[0].key}
            onPress={() => onPressTab?.(tabs[0].key)}
            activeColor={accentActiveColor}
            inactiveColor={accentInactiveColor}
          />

          {showShortcut ? (
            <View
              style={{ width: spacerW, height: 1 }}
              pointerEvents="none"
              onLayout={(e) => {
                const { x, width } = e.nativeEvent.layout;
                setAnchorX(x + width / 2);
              }}
            />
          ) : null}

          <TabItem
            width={tabItemW}
            tab={tabs[1]}
            active={activeTab === tabs[1].key}
            onPress={() => onPressTab?.(tabs[1].key)}
            activeColor={accentActiveColor}
            inactiveColor={accentInactiveColor}
            badgeCount={myRepliesBadge}
          />
          <TabItem
            width={tabItemW}
            tab={tabs[2]}
            active={activeTab === tabs[2].key}
            onPress={() => onPressTab?.(tabs[2].key)}
            activeColor={accentActiveColor}
            inactiveColor={accentInactiveColor}
          />
        </View>

        {/* FAB aligned with notch center (lower & slightly right vs last version) */}
        {showShortcut && notchCx != null && (
          <TouchableOpacity
            style={[
              styles.fab,
              {
                left: notchCx - FAB_SIZE / 2,
                bottom: BAR_HEIGHT / 2 + FAB_RISE,
                backgroundColor: accentFabBackground,
                shadowOpacity: isDarkMode ? 0.2 : 0.15
              },
            ]}
            onPress={onAddPostShortcut}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Create new post"
          >
            <Ionicons name="add" size={26} color={accentFabForeground} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function TabItem({ tab, active, onPress, width, activeColor, inactiveColor, badgeCount = 0 }) {
  return (
    <TouchableOpacity
      style={[styles.tab, { width }]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="tab"
      accessibilityState={active ? { selected: true } : {}}
    >
      {badgeCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
        </View>
      )}
      <Ionicons
        name={tab.icon}
        size={22}
        color={active ? activeColor : inactiveColor}
      />
      <Text
        style={[
          styles.tabLabel,
          { color: active ? activeColor : inactiveColor }
        ]}
      >
        {tab.label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    marginBottom: Platform.select({ ios: -50, android: -35, default: 0 })
  },
  barWrap: {
    height: BAR_HEIGHT,
    borderRadius: CORNER_R,
    backgroundColor: 'transparent', // SVG draws the pill
    justifyContent: 'center',
    overflow: 'visible',
    // refined shadow for clean elevation
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  tabRow: {
    height: BAR_HEIGHT,
    paddingHorizontal: TAB_ROW_PADDING_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  tab: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 22,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF4D6D',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    zIndex: 2
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700'
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
    // refined shadow for FAB button
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});
