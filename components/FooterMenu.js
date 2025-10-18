// FooterMenu.js
import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Mask, Rect, Path, Circle } from 'react-native-svg';
import { colors } from '../constants/colors';

/**
 * colors needed:
 *  colors.card          -> bar fill (usually #FFFFFF)
 *  colors.primary       -> FAB color
 *  colors.primaryDark   -> active tab color
 *  colors.textSecondary -> inactive tab color
 */

const tabs = [
  { key: 'home', label: 'Explore', icon: 'home-outline' },
  { key: 'myComments', label: 'My Replies', icon: 'chatbubble-ellipses-outline' },
  { key: 'settings', label: 'Settings', icon: 'settings-outline' },
];

// ===== TUNABLES =====
const BAR_HEIGHT = 76;
const CORNER_R = 28;

const NOTCH_R = 34;   // notch radius (width)
const NOTCH_DEPTH = 0.68; // deeper U (0.55–0.70)

const SPACER_EXTRA = 12;   // space around the notch between tabs

const FAB_SIZE = 60;
// move FAB & notch: LEFT(−) / RIGHT(+)
const FAB_NUDGE_X = -4;   // slightly less left than before
// lower the FAB (smaller = lower; negative drops it)
const FAB_RISE = -6;

const TAB_ROW_PADDING_H = 18; // must match styles.tabRow paddingHorizontal
// =====================

export default function FooterMenu({
  activeTab,
  onPressTab,
  onAddPostShortcut,
  showShortcut = true,
}) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 12);

  const [barW, setBarW] = useState(0);
  const [anchorX, setAnchorX] = useState(null); // center of gap (between Explore & My Replies)
  const maskId = useRef(`mask_${Math.random().toString(36).slice(2)}`).current;

  // Notch / FAB x-position
  const notchCx = anchorX != null ? anchorX + FAB_NUDGE_X : null;

  // Keep notch inside SVG viewport
  const OFFSET_Y = NOTCH_R * NOTCH_DEPTH;
  const SVG_H = BAR_HEIGHT + OFFSET_Y;

  // Equal tab widths (3 tabs) with spacer width for the notch
  const spacerW = NOTCH_R * 2 + SPACER_EXTRA * 2;
  const contentW = Math.max(0, barW - TAB_ROW_PADDING_H * 2 - (showShortcut ? spacerW : 0));
  const tabItemW = contentW > 0 ? contentW / 3 : 90;

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { paddingBottom: bottomPad }]}>
      <View
        style={styles.barWrap}
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
              <Mask
                id={maskId}
                maskUnits="userSpaceOnUse"
                x="0" y="0" width={barW} height={SVG_H}
              >
                {/* White = visible; Black = HOLE */}
                <Path d={roundedRectPath(barW, BAR_HEIGHT, CORNER_R, OFFSET_Y)} fill="#fff" />
                {showShortcut && notchCx != null && (
                  <Circle
                    cx={notchCx}
                    cy={OFFSET_Y - NOTCH_R * NOTCH_DEPTH}
                    r={NOTCH_R}
                    fill="#000"
                  />
                )}
              </Mask>
            </Defs>
            <Rect x="0" y="0" width={barW} height={SVG_H} fill={colors.card} mask={`url(#${maskId})`} />
          </Svg>
        )}

        {/* Tabs (equal spacing) */}
        <View style={styles.tabRow}>
          <TabItem
            width={tabItemW}
            tab={tabs[0]}
            active={activeTab === tabs[0].key}
            onPress={() => onPressTab?.(tabs[0].key)}
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
          />
          <TabItem
            width={tabItemW}
            tab={tabs[2]}
            active={activeTab === tabs[2].key}
            onPress={() => onPressTab?.(tabs[2].key)}
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
              },
            ]}
            onPress={onAddPostShortcut}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Create new post"
          >
            <Ionicons name="add" size={26} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function TabItem({ tab, active, onPress, width }) {
  return (
    <TouchableOpacity
      style={[styles.tab, { width }]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="tab"
      accessibilityState={active ? { selected: true } : {}}
    >
      <Ionicons
        name={tab.icon}
        size={22}
        color={active ? colors.primaryDark : colors.textSecondary}
      />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
        {tab.label}
      </Text>
    </TouchableOpacity>
  );
}

/** Rounded pill path (no notch) */
function roundedRectPath(w, h, r, offsetY) {
  const left = 0, right = w;
  const top = offsetY, bottom = h + offsetY;
  return [
    `M ${r},${top}`,
    `H ${right - r}`,
    `A ${r},${r} 0 0 1 ${right},${top + r}`,
    `V ${bottom - r}`,
    `A ${r},${r} 0 0 1 ${right - r},${bottom}`,
    `H ${r}`,
    `A ${r},${r} 0 0 1 0,${bottom - r}`,
    `V ${top + r}`,
    `A ${r},${r} 0 0 1 ${r},${top}`,
    `Z`,
  ].join(' ');
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
  },
  barWrap: {
    height: BAR_HEIGHT,
    borderRadius: CORNER_R,
    backgroundColor: 'transparent', // SVG draws the pill
    justifyContent: 'center',
    overflow: 'visible',
    // soft float
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
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
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
    // soft downward shadow (no ring)
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
});
