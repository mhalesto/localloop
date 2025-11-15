import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../contexts/SettingsContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Ad templates with Ionicons fallback
const AD_TEMPLATES = [
  {
    id: 'blackfriday',
    icon: 'pricetag',
    title: '🔥 Black Friday Sale!',
    subtitle: '50% OFF All Premium Plans',
    description: 'Limited time offer - Deal resets daily at midnight',
    colors: { primary: '#000000', secondary: '#FFD700' },
    animatedIcon: 'gift',
    isBlackFriday: true,
  },
  {
    id: 'restaurant',
    icon: 'restaurant',
    title: 'Hungry?',
    subtitle: 'Discover top-rated restaurants near you',
    description: 'Order from 50+ local eateries',
    colors: { primary: '#FF6B6B', secondary: '#FFE66D' },
    animatedIcon: 'fast-food',
  },
  {
    id: 'services',
    icon: 'construct',
    title: 'Need Help?',
    subtitle: 'Connect with local service providers',
    description: 'Plumbing, electrical, cleaning & more',
    colors: { primary: '#4ECDC4', secondary: '#44A08D' },
    animatedIcon: 'hammer',
  },
  {
    id: 'realestate',
    icon: 'home',
    title: 'Find Your Dream Home',
    subtitle: 'Browse properties in your area',
    description: '100+ listings available now',
    colors: { primary: '#9B59B6', secondary: '#E056FD' },
    animatedIcon: 'business',
  },
  {
    id: 'jobs',
    icon: 'briefcase',
    title: 'Hiring Now!',
    subtitle: 'Local jobs waiting for you',
    description: 'Apply to 200+ opportunities',
    colors: { primary: '#3498DB', secondary: '#2ECC71' },
    animatedIcon: 'trending-up',
  },
  {
    id: 'events',
    icon: 'calendar',
    title: 'What\'s Happening?',
    subtitle: 'Discover local events & activities',
    description: 'This week\'s hottest spots',
    colors: { primary: '#F39C12', secondary: '#E74C3C' },
    animatedIcon: 'musical-notes',
  },
];

export default function SponsoredAdCard({ adIndex = 0, onPress }) {
  const { themeColors } = useSettings();
  const template = AD_TEMPLATES[adIndex % AD_TEMPLATES.length];

  return (
    <TouchableOpacity
      style={[styles.adCard, { backgroundColor: themeColors.card, borderColor: themeColors.divider }]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      {/* Gradient background effect */}
      <View
        style={[
          styles.gradientOverlay,
          {
            backgroundColor: `${template.colors.primary}15`,
          },
        ]}
      />

      {/* Sponsored badge */}
      <View style={[styles.sponsoredBadge, { backgroundColor: template.colors.primary }]}>
        <Ionicons name="megaphone" size={12} color="#fff" />
        <Text style={styles.sponsoredText}>Sponsored</Text>
      </View>

      <View style={styles.content}>
        {/* Animated Icon */}
        <View style={styles.animationContainer}>
          <View
            style={[
              styles.iconBackground,
              {
                backgroundColor: `${template.colors.primary}25`,
                borderColor: `${template.colors.primary}50`,
              },
            ]}
          >
            <Ionicons name={template.animatedIcon} size={48} color={template.colors.primary} />
          </View>
        </View>

        {/* Text Content */}
        <View style={styles.textContainer}>
          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: `${template.colors.primary}20` }]}>
              <Ionicons name={template.icon} size={20} color={template.colors.primary} />
            </View>
            <Text style={[styles.title, { color: themeColors.textPrimary }]} numberOfLines={1}>
              {template.title}
            </Text>
          </View>

          <Text style={[styles.subtitle, { color: themeColors.textPrimary }]} numberOfLines={1}>
            {template.subtitle}
          </Text>

          <Text style={[styles.description, { color: themeColors.textSecondary }]} numberOfLines={2}>
            {template.description}
          </Text>

          {/* CTA Button */}
          <View style={[styles.ctaButton, { backgroundColor: template.colors.primary }]}>
            <Text style={styles.ctaText}>Learn More</Text>
            <Ionicons name="arrow-forward" size={14} color="#fff" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  adCard: {
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 12,
    marginBottom: 24,
    marginTop: 12,
    overflow: 'visible',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    position: 'relative',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  sponsoredBadge: {
    position: 'absolute',
    top: -10,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  sponsoredText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  animationContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBackground: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});
