import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const QUICKCHART_ENDPOINT = 'https://quickchart.io/qr';
const PLACEHOLDER_GRID = 9;

const VARIANT_PRESETS = {
  light: {
    background: '#F8FAFC',
    border: '#E2E8F0',
    text: '#0F172A',
    subtext: '#475569',
    badgeBg: '#E2E8F0',
    frameGradient: ['#FFFFFF', '#F1F5F9'],
    frameBorder: '#E2E8F0',
    lightColor: '#FFFFFF',
  },
  minimal: {
    background: '#FFFFFF',
    border: '#E5E7EB',
    text: '#111827',
    subtext: '#6B7280',
    badgeBg: '#E5E7EB',
    frameGradient: ['#FFFFFF', '#F9FAFB'],
    frameBorder: '#E5E7EB',
    lightColor: '#FFFFFF',
  },
  dark: {
    background: 'rgba(15,23,42,0.35)',
    border: 'rgba(255,255,255,0.18)',
    text: '#F8FAFC',
    subtext: 'rgba(226,232,240,0.8)',
    badgeBg: 'rgba(15,23,42,0.6)',
    frameGradient: ['rgba(15,23,42,0.9)', 'rgba(30,41,59,0.9)'],
    frameBorder: 'rgba(255,255,255,0.25)',
    lightColor: '#0F172A',
  },
  elegant: {
    background: 'rgba(250, 247, 240, 0.95)',
    border: '#E8DCC8',
    text: '#2C2416',
    subtext: '#8B7355',
    badgeBg: '#EEDFC3',
    frameGradient: ['#FFF9F0', '#F7E8CC'],
    frameBorder: '#E8DCC8',
    lightColor: '#FFFFFF',
  },
};

function normalizeColor(color) {
  const fallback = '#111827';
  if (!color || typeof color !== 'string') {
    return { hex: fallback, noHash: '111827' };
  }
  let hex = color.trim();
  if (hex.startsWith('#')) {
    if (hex.length === 4) {
      hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
    }
    if (hex.length === 7) {
      return { hex, noHash: hex.slice(1) };
    }
  }
  const rgbMatch = hex.match(/rgba?\(([^)]+)\)/i);
  if (rgbMatch) {
    const [r, g, b] = rgbMatch[1]
      .split(',')
      .slice(0, 3)
      .map((value) => Math.max(0, Math.min(255, Number(value.trim()))));
    const converted = `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
    return { hex: converted, noHash: converted.slice(1) };
  }
  return { hex: fallback, noHash: '111827' };
}

function componentToHex(value) {
  const hex = Number(value).toString(16);
  return hex.length === 1 ? `0${hex}` : hex;
}

function buildQrUrl(payload, { dark, light, size = 480, margin = 12 }) {
  const params = [
    `text=${encodeURIComponent(payload)}`,
    `size=${size}`,
    `margin=${margin}`,
    `format=png`,
    `dark=${encodeURIComponent(dark)}`,
    `light=${encodeURIComponent(light)}`,
  ];
  return `${QUICKCHART_ENDPOINT}?${params.join('&')}`;
}

function getShareTarget(profile) {
  const username = profile?.username?.trim();
  const slug = username?.length ? username.toLowerCase() : profile?.id || 'profile';
  const deepLink = `localloop://profile/${slug}`;
  const webUrl = `https://localloop.app/u/${slug}`;
  return { slug, deepLink, webUrl };
}

function buildPlaceholderMatrix(seed) {
  const value = seed || 'loop';
  const codes = Array.from(value).map((char) => char.charCodeAt(0));
  let state = codes.reduce((acc, code) => (acc * 31 + code) >>> 0, 0x811c9dc5);
  const matrix = [];
  for (let row = 0; row < PLACEHOLDER_GRID; row += 1) {
    const rowArray = [];
    for (let col = 0; col < PLACEHOLDER_GRID; col += 1) {
      state = (1664525 * state + 1013904223) >>> 0;
      rowArray.push(((state >>> 24) & 1) === 1);
    }
    matrix.push(rowArray);
  }
  return matrix;
}

export default function ProfileShareCode({
  profile,
  primaryColor = '#111827',
  variant = 'light',
  style,
  size = 'large',
  showMeta = true,
  showHeader = true,
  frameless = false,
  qrSizeOverride,
}) {
  const palette = VARIANT_PRESETS[variant] || VARIANT_PRESETS.light;
  const overlayColor = variant === 'dark' ? 'rgba(15,23,42,0.65)' : 'rgba(255,255,255,0.45)';
  const normalizedColor = useMemo(() => normalizeColor(primaryColor), [primaryColor]);
  const { slug, deepLink, webUrl } = useMemo(() => getShareTarget(profile), [profile]);
  const qrPayload = `${deepLink}?card=1`;
  const qrMargin = frameless ? 0 : 12;
  const qrImageUri = useMemo(
    () =>
      buildQrUrl(qrPayload, {
        dark: normalizedColor.noHash,
        light: (palette.lightColor || '#FFFFFF').replace('#', ''),
        margin: qrMargin,
      }),
    [qrPayload, normalizedColor.noHash, palette.lightColor, qrMargin]
  );
  const [qrReady, setQrReady] = useState(false);
  const [qrFailed, setQrFailed] = useState(false);
  const initials = useMemo(() => {
    const base = profile?.displayName || profile?.username || 'Loop';
    return base.slice(0, 2).toUpperCase();
  }, [profile]);
  const placeholderMatrix = useMemo(() => buildPlaceholderMatrix(slug), [slug]);
  const isCompact = size === 'compact';
  const isInline = size === 'inline';
  const baseQrSize = isInline ? 118 : isCompact ? 150 : 220;
  const qrSize = qrSizeOverride || baseQrSize;
  const sizeRatio = qrSize / baseQrSize;
  const baseBadgeSize = isInline ? 50 : isCompact ? 60 : 72;
  const badgeSize = baseBadgeSize * sizeRatio;
  const avatarSize = badgeSize - 8;
  const baseContainerPadding = isInline ? 6 : isCompact ? 12 : 16;
  const baseContainerGap = isInline ? 6 : isCompact ? 12 : 16;
  const baseFramePadding = isInline ? 4 : isCompact ? 8 : 12;
  const baseFrameRadius = isInline ? 14 : isCompact ? 18 : 20;
  const containerPadding = frameless ? 0 : baseContainerPadding;
  const containerGap = frameless ? 0 : baseContainerGap;
  const framePadding = frameless ? 0 : baseFramePadding;
  const frameRadius = frameless ? 0 : baseFrameRadius;
  const containerBg = frameless ? 'transparent' : palette.background;
  const containerBorder = frameless ? 'transparent' : palette.border;
  const frameBorderColor = frameless ? 'transparent' : palette.frameBorder;
  const frameColors = frameless ? ['transparent', 'transparent'] : palette.frameGradient;

  return (
    <View
      style={[
        styles.container,
        isCompact && styles.compactContainer,
        isInline && styles.inlineContainer,
        frameless && styles.framelessContainer,
        {
          backgroundColor: containerBg,
          borderColor: containerBorder,
          padding: containerPadding,
          gap: containerGap,
        },
        style,
      ]}
    >
      {showHeader && (
        <View style={styles.headerRow}>
          <View style={[styles.iconBubble, { backgroundColor: palette.badgeBg }]}>
            <Ionicons name="qr-code-outline" size={16} color={palette.text} />
          </View>
          <View style={styles.headerCopy}>
            <Text
              style={[
                styles.headerTitle,
                { color: palette.text },
                (isCompact || isInline) && styles.compactHeaderTitle,
              ]}
            >
              Share your profile
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                { color: palette.subtext },
                (isCompact || isInline) && styles.compactHeaderSubtitle,
              ]}
            >
              Friends can scan to view @{profile?.username || slug}
            </Text>
          </View>
        </View>
      )}

      <LinearGradient
        colors={frameColors}
        style={[
          styles.qrFrame,
          (isCompact || isInline) && styles.compactQrFrame,
          isInline && styles.inlineQrFrame,
          frameless && styles.framelessFrame,
          {
            borderColor: frameBorderColor,
            padding: framePadding,
            borderRadius: frameRadius,
          },
        ]}
      >
        <Image
          source={{ uri: qrImageUri }}
          style={[styles.qrImage, { width: qrSize, height: qrSize }]}
          resizeMode="contain"
          onLoadEnd={() => setQrReady(true)}
          onError={() => {
            setQrFailed(true);
            setQrReady(true);
          }}
        />
        {!qrReady && (
          <View style={[styles.loadingOverlay, { backgroundColor: overlayColor }]}>
            <ActivityIndicator color={palette.text} />
          </View>
        )}
        {qrFailed && (
          <View style={[styles.fallbackGrid, { width: qrSize, height: qrSize }]}>
            {placeholderMatrix.map((row, rowIndex) => (
              <View key={`row-${rowIndex}`} style={styles.fallbackRow}>
                {row.map((filled, cellIndex) => (
                  <View
                    key={`cell-${rowIndex}-${cellIndex}`}
                    style={[
                      styles.fallbackCell,
                      filled
                        ? { backgroundColor: normalizedColor.hex }
                        : { borderColor: palette.border, borderWidth: StyleSheet.hairlineWidth },
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
        )}
        <View
          style={[
            styles.avatarBadge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              marginLeft: -badgeSize / 2,
              marginTop: -badgeSize / 2,
            },
          ]}
        >
          {profile?.profilePhoto ? (
            <Image
              source={{ uri: profile.profilePhoto }}
              style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }}
            />
          ) : (
            <View
              style={[
                styles.avatarFallback,
                { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
              ]}
            >
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {showMeta && (
        <View style={[styles.metaBlock, (isCompact || isInline) && styles.compactMetaBlock]}>
          <Text style={[styles.username, { color: palette.text }]} numberOfLines={1}>
            @{profile?.username || slug}
          </Text>
          <Text style={[styles.linkText, { color: palette.subtext }]} numberOfLines={1}>
            {webUrl.replace(/^https?:\/\//, '')}
          </Text>
          <Text style={[styles.deepLink, { color: palette.subtext }]} numberOfLines={1}>
            {deepLink}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  compactContainer: {
    padding: 0,
    borderRadius: 14,
    gap: 12,
  },
  inlineContainer: {
    padding: 10,
    borderRadius: 12,
    gap: 10,
  },
  framelessContainer: {
    borderWidth: 0,
    borderRadius: 0,
    padding: 0,
    gap: 0,
    backgroundColor: 'transparent',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  compactHeaderTitle: {
    fontSize: 13,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  compactHeaderSubtitle: {
    fontSize: 11,
  },
  qrFrame: {
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    elevation: 2,
  },
  compactQrFrame: {
    borderRadius: 16,
    padding: 0,
  },
  inlineQrFrame: {
    borderRadius: 14,
    padding: 6,
  },
  framelessFrame: {
    borderWidth: 0,
    borderRadius: 0,
    padding: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  avatarBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -36,
    marginTop: -36,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  fallbackGrid: {
    position: 'absolute',
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  fallbackRow: {
    flexDirection: 'row',
    gap: 2,
  },
  fallbackCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  metaBlock: {
    alignItems: 'flex-start',
    gap: 4,
  },
  compactMetaBlock: {
    gap: 2,
  },
  username: {
    fontSize: 16,
    fontWeight: '700',
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
  },
  deepLink: {
    fontSize: 12,
    fontWeight: '500',
  },
});
