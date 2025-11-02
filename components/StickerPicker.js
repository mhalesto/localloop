import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';

const STICKER_PACKS = {
  emotions: {
    name: 'Emotions',
    stickers: ['😀', '😂', '🥰', '😍', '🤩', '😎', '🤔', '😴', '🥳', '😭', '😡', '🤯', '😱', '🥺', '😏', '😜']
  },
  animals: {
    name: 'Animals',
    stickers: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔']
  },
  food: {
    name: 'Food',
    stickers: ['🍕', '🍔', '🍟', '🌭', '🍿', '🍩', '🍪', '🎂', '🍰', '🧁', '🍦', '🍌', '🍎', '🍇', '🍓', '🥑']
  },
  activities: {
    name: 'Activities',
    stickers: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🎮', '🎯', '🎲', '🎸', '🎨', '🎭', '🎪', '🎬', '🎤', '🎧']
  },
  nature: {
    name: 'Nature',
    stickers: ['🌸', '🌺', '🌻', '🌷', '🌹', '🌼', '🌴', '🌵', '🌊', '🌈', '☀️', '⭐', '⚡', '🔥', '💧', '❄️']
  },
  symbols: {
    name: 'Symbols',
    stickers: ['❤️', '💙', '💚', '💛', '🧡', '💜', '🖤', '💔', '💕', '💖', '💗', '💓', '💝', '💘', '✨', '💯']
  }
};

const PACK_KEYS = Object.keys(STICKER_PACKS);

export default function StickerPicker({ visible, onClose, onSelectSticker, themeColors }) {
  const [selectedPack, setSelectedPack] = useState('emotions');

  const handleSelectSticker = (sticker) => {
    onSelectSticker(sticker);
    onClose();
  };

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
              Stickers
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.closeButton, { color: themeColors.textSecondary }]}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          {/* Category tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.tabs, { borderBottomColor: themeColors.divider }]}
            contentContainerStyle={styles.tabsContent}
          >
            {PACK_KEYS.map((packKey) => {
              const pack = STICKER_PACKS[packKey];
              const isSelected = selectedPack === packKey;
              return (
                <TouchableOpacity
                  key={packKey}
                  style={[
                    styles.tab,
                    {
                      backgroundColor: isSelected ? themeColors.primary + '20' : 'transparent',
                      borderBottomColor: isSelected ? themeColors.primary : 'transparent',
                    }
                  ]}
                  onPress={() => setSelectedPack(packKey)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.tabText,
                    {
                      color: isSelected ? themeColors.primary : themeColors.textSecondary,
                      fontWeight: isSelected ? '600' : '400',
                    }
                  ]}>
                    {pack.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Sticker grid */}
          <ScrollView
            style={styles.stickerGrid}
            contentContainerStyle={styles.stickerGridContent}
          >
            <View style={styles.grid}>
              {STICKER_PACKS[selectedPack].stickers.map((sticker, index) => (
                <TouchableOpacity
                  key={`${sticker}-${index}`}
                  style={[styles.stickerButton, { backgroundColor: themeColors.card }]}
                  onPress={() => handleSelectSticker(sticker)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sticker}>{sticker}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
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
    maxHeight: '70%',
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
  tabs: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
  },
  stickerGrid: {
    flex: 1,
  },
  stickerGridContent: {
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  stickerButton: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sticker: {
    fontSize: 32,
  },
});
