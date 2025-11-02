import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AttachmentMenu({ visible, onClose, onSelectOption, themeColors }) {
  const insets = useSafeAreaInsets();

  const options = [
    { id: 'photo', icon: 'images-outline', label: 'Photo', color: '#5B9FED' },
    { id: 'camera', icon: 'camera-outline', label: 'Camera', color: '#E8E8E8' },
    { id: 'location', icon: 'location-outline', label: 'Location', color: '#7FD8BE' },
    { id: 'contact', icon: 'person-circle-outline', label: 'Contact', color: '#C4C4C4' },
    { id: 'document', icon: 'document-outline', label: 'Document', color: '#6FB4E8' },
    { id: 'poll', icon: 'bar-chart-outline', label: 'Poll', color: '#E8A550' },
    { id: 'sticker', icon: 'happy-outline', label: 'Sticker', color: '#FF6B6B' },
    { id: 'gif', icon: 'image-outline', label: 'GIF', color: '#8E7BE8' },
  ];

  if (!visible) return null;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.card, paddingBottom: insets.bottom, marginBottom: -70 }]}>
      <View style={styles.rowContainer}>
        <View style={styles.row}>
          {options.slice(0, 4).map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.option}
              onPress={() => {
                onSelectOption(option.id);
              }}
              activeOpacity={0.6}
            >
              <View style={[styles.iconContainer, { backgroundColor: option.color }]}>
                <Ionicons name={option.icon} size={28} color="#fff" />
              </View>
              <Text style={[styles.label, { color: themeColors.textPrimary }]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.row}>
          {options.slice(4, 8).map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.option}
              onPress={() => {
                onSelectOption(option.id);
              }}
              activeOpacity={0.6}
            >
              <View style={[styles.iconContainer, { backgroundColor: option.color }]}>
                <Ionicons name={option.icon} size={28} color="#fff" />
              </View>
              <Text style={[styles.label, { color: themeColors.textPrimary }]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 20,
  },
  rowContainer: {
    gap: 20,
    paddingBottom: 105,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  option: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
