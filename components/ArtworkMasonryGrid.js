import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Text, Dimensions } from 'react-native';
import { useSettings } from '../contexts/SettingsContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = (SCREEN_WIDTH - 60) / 2; // 2 columns with padding

export default function ArtworkMasonryGrid({ artworks, onArtworkPress }) {
  const { themeColors } = useSettings();

  // Split artworks into two columns for masonry layout
  const leftColumn = [];
  const rightColumn = [];

  artworks.forEach((artwork, index) => {
    if (index % 2 === 0) {
      leftColumn.push(artwork);
    } else {
      rightColumn.push(artwork);
    }
  });

  const renderArtworkItem = (artwork) => (
    <TouchableOpacity
      key={artwork.id}
      style={[styles.artworkCard, { backgroundColor: themeColors.card, borderColor: themeColors.divider }]}
      activeOpacity={0.9}
      onPress={() => onArtworkPress(artwork)}
    >
      <Image source={{ uri: artwork.url }} style={styles.artworkImage} />
      <View style={styles.artworkInfo}>
        {artwork.style && (
          <View style={[styles.styleBadge, { backgroundColor: `${themeColors.primary}20` }]}>
            <Text style={[styles.styleText, { color: themeColors.primary }]} numberOfLines={1}>
              {artwork.style}
            </Text>
          </View>
        )}
        <View style={styles.artistInfo}>
          {artwork.profilePhoto && (
            <Image source={{ uri: artwork.profilePhoto }} style={styles.artistPhoto} />
          )}
          <Text style={[styles.artistName, { color: themeColors.textSecondary }]} numberOfLines={1}>
            {artwork.displayName || artwork.username}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.column}>
        {leftColumn.map(renderArtworkItem)}
      </View>
      <View style={styles.column}>
        {rightColumn.map(renderArtworkItem)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 20,
  },
  column: {
    flex: 1,
    gap: 12,
  },
  artworkCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  artworkImage: {
    width: '100%',
    height: COLUMN_WIDTH * 1.2, // Slightly taller than wide
    resizeMode: 'cover',
  },
  artworkInfo: {
    padding: 10,
  },
  styleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 8,
  },
  styleText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  artistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  artistPhoto: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  artistName: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
});
