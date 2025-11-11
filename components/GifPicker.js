import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2; // 2 columns with padding

const resolveGiphyApiKey = () =>
  process.env.EXPO_PUBLIC_GIPHY_API_KEY ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_GIPHY_API_KEY ||
  '';

const GIPHY_API_KEY = resolveGiphyApiKey();
const IS_GIPHY_CONFIGURED = Boolean(GIPHY_API_KEY);

export default function GifPicker({ visible, onClose, onSelectGif, themeColors }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);

  const searchGifs = useCallback(async (query, pageNum = 0) => {
    if (!IS_GIPHY_CONFIGURED) {
      console.warn('[GifPicker] Missing GIPHY API key. Set EXPO_PUBLIC_GIPHY_API_KEY.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = query
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20&offset=${pageNum * 20}`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20&offset=${pageNum * 20}`;

      const response = await fetch(endpoint);
      const data = await response.json();

      if (pageNum === 0) {
        setGifs(data.data || []);
      } else {
        setGifs(prev => [...prev, ...(data.data || [])]);
      }
    } catch (error) {
      console.error('[GifPicker] Failed to fetch GIFs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setPage(0);
      searchGifs(searchQuery, 0);
    }
  }, [visible, searchGifs]);

  const handleSearch = () => {
    setPage(0);
    searchGifs(searchQuery, 0);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    searchGifs(searchQuery, nextPage);
  };

  const handleSelectGif = (gif) => {
    const gifUrl = gif.images.fixed_height.url;
    onSelectGif(gifUrl, gif.images.fixed_height.width, gif.images.fixed_height.height);
    onClose();
  };

  if (!IS_GIPHY_CONFIGURED) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <Pressable style={styles.overlay} onPress={onClose}>
          <View style={[styles.container, { backgroundColor: themeColors.surface }]}>
            <View style={styles.setupMessage}>
              <Text style={[styles.setupText, { color: themeColors.textPrimary }]}>
                To use GIFs, set the EXPO_PUBLIC_GIPHY_API_KEY environment variable.
              </Text>
              <Text style={[styles.setupText, { color: themeColors.textSecondary }]}>
                You can request a free key at https://developers.giphy.com/ and add it to app config or your build environment.
              </Text>
              <TouchableOpacity
                style={[styles.closeSetupButton, { backgroundColor: themeColors.primary }]}
                onPress={onClose}
              >
                <Text style={styles.closeSetupButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.container, { backgroundColor: themeColors.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: themeColors.divider }]}>
            <Text style={[styles.title, { color: themeColors.textPrimary }]}>
              GIFs
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.closeButton, { color: themeColors.textSecondary }]}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={[styles.searchBar, { backgroundColor: themeColors.card }]}>
            <TextInput
              style={[styles.searchInput, { color: themeColors.textPrimary }]}
              placeholder="Search GIFs..."
              placeholderTextColor={themeColors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
          </View>

          {/* GIF grid */}
          <ScrollView
            style={styles.gifGrid}
            contentContainerStyle={styles.gifGridContent}
            onScroll={({ nativeEvent }) => {
              const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
              const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
              if (isCloseToBottom && !loading) {
                handleLoadMore();
              }
            }}
            scrollEventThrottle={400}
          >
            <View style={styles.grid}>
              {gifs.map((gif) => (
                <TouchableOpacity
                  key={gif.id}
                  style={[styles.gifButton, { backgroundColor: themeColors.card }]}
                  onPress={() => handleSelectGif(gif)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: gif.images.fixed_height_small.url }}
                    style={styles.gifImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
            {loading && (
              <View style={styles.loader}>
                <ActivityIndicator size="large" color={themeColors.primary} />
              </View>
            )}
          </ScrollView>

          <Text style={[styles.poweredBy, { color: themeColors.textSecondary }]}>
            Powered by GIPHY
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    fontSize: 24,
    fontWeight: '400',
  },
  searchBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 15,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  gifGrid: {
    flex: 1,
  },
  gifGridContent: {
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gifButton: {
    width: COLUMN_WIDTH,
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gifImage: {
    width: '100%',
    height: '100%',
  },
  loader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  poweredBy: {
    textAlign: 'center',
    fontSize: 11,
    paddingVertical: 8,
  },
  setupMessage: {
    padding: 32,
    alignItems: 'center',
    gap: 16,
  },
  setupText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  setupLink: {
    fontSize: 13,
    fontWeight: '600',
  },
  closeSetupButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  closeSetupButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
