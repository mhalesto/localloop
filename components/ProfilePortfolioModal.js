/**
 * Profile Portfolio Modal
 * Beautiful CV/portfolio-style profile view that can be shared as PDF
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../contexts/SettingsContext';
import { ALL_INTERESTS } from '../constants/profileConstants';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import ViewShot from 'react-native-view-shot';
import ProfileShareCode from './ProfileShareCode';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PORTFOLIO_WIDTH = SCREEN_WIDTH - 40; // 20px padding on each side

// Business Card Styles
const CARD_STYLES = {
  modern: {
    id: 'modern',
    name: 'Modern Wave',
    icon: 'water-outline',
  },
  minimal: {
    id: 'minimal',
    name: 'Classic Minimal',
    icon: 'square-outline',
  },
  gradient: {
    id: 'gradient',
    name: 'Bold Gradient',
    icon: 'color-palette-outline',
  },
  elegant: {
    id: 'elegant',
    name: 'Elegant Professional',
    icon: 'diamond-outline',
  },
};

export default function ProfilePortfolioModal({
  visible,
  onClose,
  profile,
  albumPhotos = [],
}) {
  const { themeColors, accentPreset } = useSettings();
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [viewMode, setViewMode] = useState('portfolio'); // 'portfolio' or 'card'
  const [cardStyle, setCardStyle] = useState('modern'); // Business card style
  const [stylePickerVisible, setStylePickerVisible] = useState(false);
  const viewShotRef = useRef(null);
  const primaryColor = accentPreset?.buttonBackground || themeColors.primary;

  const handleShare = async () => {
    try {
      setIsSharing(true);

      // Capture the view as an image
      const uri = await viewShotRef.current.capture();

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        alert('Sharing is not available on this device');
        return;
      }

      // Share the captured image
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: `${profile.displayName || profile.username}'s Portfolio`,
      });

    } catch (error) {
      console.error('[ProfilePortfolio] Error sharing:', error);
      alert('Failed to share portfolio. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);

      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access media library is required to save the image.');
        return;
      }

      // Capture the view as an image
      const uri = await viewShotRef.current.capture();

      // Save to photo library
      await MediaLibrary.saveToLibraryAsync(uri);

      alert('Portfolio saved to your photo library!');

    } catch (error) {
      console.error('[ProfilePortfolio] Error downloading:', error);
      alert('Failed to save portfolio. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Get user's interests
  const userInterests = profile.interests?.map(interestId =>
    ALL_INTERESTS.find(i => i.id === interestId)
  ).filter(Boolean) || [];

  // Create masonry layout columns
  const createMasonryLayout = (photos) => {
    const columns = [[], []]; // Two columns
    // Filter out photos without downloadUrl
    const validPhotos = photos.filter(photo => photo?.downloadUrl);
    validPhotos.forEach((photo, index) => {
      columns[index % 2].push(photo);
    });
    return columns;
  };

  const masonryColumns = createMasonryLayout(albumPhotos);
  const hasAlbumPhotos = albumPhotos.filter(photo => photo?.downloadUrl).length > 0;

  // Get location display text
  const getLocationText = () => {
    const parts = [];
    if (profile.city) parts.push(profile.city);
    if (profile.province) parts.push(profile.province);
    if (profile.countryName) parts.push(profile.countryName);
    return parts.join(', ') || 'Location not specified';
  };

  // Parse skills into array
  const skillsArray = profile.skills ? profile.skills.split(',').map(s => s.trim()).filter(Boolean) : [];

  // Render Business Card View based on selected style
  const renderBusinessCard = () => {
    switch (cardStyle) {
      case 'modern':
        return renderModernCard();
      case 'minimal':
        return renderMinimalCard();
      case 'gradient':
        return renderGradientCard();
      case 'elegant':
        return renderElegantCard();
      default:
        return renderModernCard();
    }
  };

  // Modern Wave Style (current design)
  const renderModernCard = () => (
    <View style={localStyles.businessCardContainer}>
      {/* Header */}
      <View style={localStyles.cardHeader}>
        {profile.profilePhoto && (
          <Image
            source={{ uri: profile.profilePhoto }}
            style={localStyles.cardProfilePhoto}
          />
        )}
        <View style={localStyles.cardHeaderInfo}>
          <Text style={localStyles.cardDisplayName}>
            {profile.displayName || profile.username}
          </Text>
          <Text style={localStyles.cardUsername}>@{profile.username}</Text>
        </View>
      </View>

      {/* Profession & Company */}
      {profile.profession && (
        <View style={localStyles.cardTitleSection}>
          <Text style={localStyles.cardProfession}>
            {profile.profession}
          </Text>
          {profile.company && (
            <Text style={localStyles.cardCompany}>
              {profile.company}
            </Text>
          )}
        </View>
      )}

      {/* Experience Badge */}
      {profile.yearsOfExperience > 0 && (
        <View style={localStyles.cardExperienceBadge}>
          <View style={localStyles.cardExperienceIcon}>
            <Ionicons name="briefcase" size={20} color={primaryColor} />
          </View>
          <Text style={localStyles.cardExperienceText}>
            {profile.yearsOfExperience} years of experience
          </Text>
        </View>
      )}

      {/* Education */}
      {profile.education && (
        <View style={localStyles.cardSection}>
          <Text style={localStyles.cardSectionLabel}>🎓 EDUCATION</Text>
          <Text style={localStyles.cardSectionValue}>{profile.education}</Text>
        </View>
      )}

      {/* Contact Information */}
      <View style={localStyles.cardSection}>
        <Text style={localStyles.cardSectionLabel}>📬 CONTACT</Text>
        <View style={localStyles.cardContactShareRow}>
          <View style={[localStyles.cardContactGrid, localStyles.cardContactDetails]}>
            {profile.contactEmail && (
              <View style={localStyles.cardContactItem}>
                <View style={localStyles.cardContactIconContainer}>
                  <Ionicons name="mail" size={18} color="#fff" />
                </View>
                <Text style={localStyles.cardContactValue} numberOfLines={1}>
                  {profile.contactEmail}
                </Text>
              </View>
            )}
            <View style={localStyles.cardContactItem}>
              <View style={localStyles.cardContactIconContainer}>
                <Ionicons name="location" size={18} color="#fff" />
              </View>
              <Text style={localStyles.cardContactValue} numberOfLines={1}>
                {getLocationText()}
              </Text>
            </View>
            {profile.links && profile.links.length > 0 && (
              <View style={localStyles.cardContactItem}>
                <View style={localStyles.cardContactIconContainer}>
                  <Ionicons name="link" size={18} color="#fff" />
                </View>
                <Text style={localStyles.cardContactValue} numberOfLines={1}>
                  {profile.links[0].label}
                </Text>
              </View>
            )}
          </View>
          <ProfileShareCode
            profile={profile}
            primaryColor={primaryColor}
            variant="light"
            size="inline"
            showMeta={false}
            showHeader={false}
            style={localStyles.cardShareCodeCompact}
          />
        </View>
      </View>

      {/* Bio */}
      {profile.bio && (
        <View style={localStyles.cardSection}>
          <Text style={localStyles.cardSectionLabel}>💬 ABOUT</Text>
          <Text style={localStyles.cardBioText}>{profile.bio}</Text>
        </View>
      )}

      {/* Skills */}
      {skillsArray.length > 0 && (
        <View style={localStyles.cardSection}>
          <Text style={localStyles.cardSectionLabel}>🔧 SKILLS</Text>
          <View style={localStyles.cardSkills}>
            {skillsArray.slice(0, 8).map((skill, index) => (
              <View key={index} style={localStyles.cardSkillPill}>
                <Text style={localStyles.cardSkillText}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Available for Work */}
      {profile.availableForWork && (
        <View style={localStyles.cardSection}>
          <View style={localStyles.cardAvailableBadge}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={localStyles.cardAvailableText}>Available for Work</Text>
          </View>
        </View>
      )}

      {/* Footer */}
      <View style={localStyles.cardFooter}>
        <Text style={localStyles.cardFooterText}>Created with</Text>
        <View style={localStyles.cardLogo}>
          <Image
            source={require('../assets/icon.png')}
            style={localStyles.cardLogoImage}
            resizeMode="contain"
          />
          <Text style={localStyles.cardLogoText}>LocalLoop</Text>
        </View>
      </View>
    </View>
  );

  // Classic Minimal Style
  const renderMinimalCard = () => (
    <View style={localStyles.minimalCardContainer}>
      {/* Centered Header */}
      <View style={localStyles.minimalHeader}>
        {profile.profilePhoto && (
          <Image
            source={{ uri: profile.profilePhoto }}
            style={localStyles.minimalPhoto}
          />
        )}
        <Text style={localStyles.minimalName}>
          {profile.displayName || profile.username}
        </Text>
        {profile.profession && (
          <Text style={localStyles.minimalProfession}>{profile.profession}</Text>
        )}
        {profile.company && (
          <Text style={localStyles.minimalCompany}>{profile.company}</Text>
        )}
      </View>

      {/* Divider */}
      <View style={localStyles.minimalDivider} />

      {/* Contact Grid */}
      <View style={localStyles.minimalContactGrid}>
        {profile.contactEmail && (
          <View style={localStyles.minimalContactItem}>
            <Ionicons name="mail" size={16} color="#666" />
            <Text style={localStyles.minimalContactText}>{profile.contactEmail}</Text>
          </View>
        )}
        <View style={localStyles.minimalContactItem}>
          <Ionicons name="location" size={16} color="#666" />
          <Text style={localStyles.minimalContactText}>{getLocationText()}</Text>
        </View>
        {profile.yearsOfExperience > 0 && (
          <View style={localStyles.minimalContactItem}>
            <Ionicons name="briefcase" size={16} color="#666" />
            <Text style={localStyles.minimalContactText}>
              {profile.yearsOfExperience} years experience
            </Text>
          </View>
        )}
      </View>

      {/* Skills */}
      {skillsArray.length > 0 && (
        <View style={localStyles.minimalSkillsSection}>
          <View style={localStyles.minimalSkills}>
            {skillsArray.slice(0, 6).map((skill, index) => (
              <Text key={index} style={localStyles.minimalSkillText}>
                {skill}
                {index < skillsArray.slice(0, 6).length - 1 ? ' • ' : ''}
              </Text>
            ))}
          </View>
        </View>
      )}

      <View style={localStyles.minimalShareSection}>
        <ProfileShareCode
          profile={profile}
          primaryColor={primaryColor}
          variant="minimal"
        />
      </View>

      {/* Footer */}
      <View style={localStyles.minimalFooter}>
        <Text style={localStyles.minimalFooterText}>@{profile.username}</Text>
      </View>
    </View>
  );

  // Bold Gradient Style
  const renderGradientCard = () => (
    <View style={localStyles.gradientCardContainer}>
      {/* Gradient Background Overlay */}
      <View style={localStyles.gradientOverlay} />

      {/* Content */}
      <View style={localStyles.gradientContent}>
        {/* Header */}
        <View style={localStyles.gradientHeader}>
          {profile.profilePhoto && (
            <Image
              source={{ uri: profile.profilePhoto }}
              style={localStyles.gradientPhoto}
            />
          )}
          <Text style={localStyles.gradientName}>
            {profile.displayName || profile.username}
          </Text>
          <Text style={localStyles.gradientUsername}>@{profile.username}</Text>
        </View>

        {/* Main Info Card */}
        <View style={localStyles.gradientInfoCard}>
          {profile.profession && (
            <View style={localStyles.gradientInfoRow}>
              <Ionicons name="briefcase" size={18} color={primaryColor} />
              <Text style={localStyles.gradientInfoText}>
                {profile.profession}
                {profile.company && ` @ ${profile.company}`}
              </Text>
            </View>
          )}
          {profile.contactEmail && (
            <View style={localStyles.gradientInfoRow}>
              <Ionicons name="mail" size={18} color={primaryColor} />
              <Text style={localStyles.gradientInfoText}>{profile.contactEmail}</Text>
            </View>
          )}
          <View style={localStyles.gradientInfoRow}>
            <Ionicons name="location" size={18} color={primaryColor} />
            <Text style={localStyles.gradientInfoText}>{getLocationText()}</Text>
          </View>
          {profile.yearsOfExperience > 0 && (
            <View style={localStyles.gradientInfoRow}>
              <Ionicons name="time" size={18} color={primaryColor} />
              <Text style={localStyles.gradientInfoText}>
                {profile.yearsOfExperience} years experience
              </Text>
            </View>
          )}
        </View>

        {/* Skills */}
        {skillsArray.length > 0 && (
          <View style={localStyles.gradientSkills}>
            {skillsArray.slice(0, 6).map((skill, index) => (
              <View key={index} style={localStyles.gradientSkillPill}>
                <Text style={localStyles.gradientSkillText}>{skill}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={localStyles.gradientShareSection}>
          <ProfileShareCode
            profile={profile}
            primaryColor={primaryColor}
            variant="dark"
          />
        </View>

        {/* Available Badge */}
        {profile.availableForWork && (
          <View style={localStyles.gradientAvailableBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#fff" />
            <Text style={localStyles.gradientAvailableText}>Available for Work</Text>
          </View>
        )}
      </View>
    </View>
  );

  // Elegant Professional Style
  const renderElegantCard = () => (
    <View style={localStyles.elegantCardContainer}>
      {/* Decorative Corner */}
      <View style={localStyles.elegantCorner} />

      {/* Header with Side Photo */}
      <View style={localStyles.elegantHeader}>
        <View style={localStyles.elegantHeaderText}>
          <Text style={localStyles.elegantName}>
            {profile.displayName || profile.username}
          </Text>
          {profile.profession && (
            <Text style={localStyles.elegantProfession}>{profile.profession}</Text>
          )}
          {profile.company && (
            <Text style={localStyles.elegantCompany}>{profile.company}</Text>
          )}
        </View>
        {profile.profilePhoto && (
          <Image
            source={{ uri: profile.profilePhoto }}
            style={localStyles.elegantPhoto}
          />
        )}
      </View>

      {/* Gold Divider */}
      <View style={localStyles.elegantDivider} />

      {/* Experience Badge */}
      {profile.yearsOfExperience > 0 && (
        <View style={localStyles.elegantExperience}>
          <View style={localStyles.elegantExpIcon}>
            <Text style={localStyles.elegantExpNumber}>{profile.yearsOfExperience}</Text>
          </View>
          <Text style={localStyles.elegantExpText}>Years of Experience</Text>
        </View>
      )}

      {/* Contact Section */}
      <View style={localStyles.elegantSection}>
        <Text style={localStyles.elegantSectionTitle}>Contact Information</Text>
        {profile.contactEmail && (
          <View style={localStyles.elegantContactRow}>
            <Ionicons name="mail" size={14} color="#8B7355" />
            <Text style={localStyles.elegantContactText}>{profile.contactEmail}</Text>
          </View>
        )}
        <View style={localStyles.elegantContactRow}>
          <Ionicons name="location" size={14} color="#8B7355" />
          <Text style={localStyles.elegantContactText}>{getLocationText()}</Text>
        </View>
      </View>

      {/* Skills */}
      {skillsArray.length > 0 && (
        <View style={localStyles.elegantSection}>
          <Text style={localStyles.elegantSectionTitle}>Expertise</Text>
          <Text style={localStyles.elegantSkillsText}>
            {skillsArray.slice(0, 6).join(' • ')}
          </Text>
        </View>
      )}

      <View style={localStyles.elegantShareSection}>
        <ProfileShareCode
          profile={profile}
          primaryColor={primaryColor}
          variant="elegant"
        />
      </View>

      {/* Footer */}
      <View style={localStyles.elegantFooter}>
        <Text style={localStyles.elegantFooterText}>@{profile.username}</Text>
        <View style={localStyles.elegantFooterBrand}>
          <Image
            source={require('../assets/icon.png')}
            style={localStyles.elegantLogoImage}
            resizeMode="contain"
          />
          <Text style={localStyles.elegantBrandText}>LocalLoop</Text>
        </View>
      </View>
    </View>
  );

  const localStyles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      backgroundColor: themeColors.card,
      borderRadius: 16,
      width: SCREEN_WIDTH - 40,
      height: '90%',
      overflow: 'hidden',
    },
    header: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.divider,
      position: 'relative',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: themeColors.textPrimary,
      textAlign: 'center',
    },
    closeButtonTop: {
      position: 'absolute',
      right: 16,
      padding: 4,
      zIndex: 10,
    },
    actionsFooter: {
      borderTopWidth: 1,
      borderTopColor: themeColors.divider,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: themeColors.card,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    footerToggleButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 2,
    },
    footerToggleText: {
      fontSize: 15,
      fontWeight: '700',
    },
    footerActionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 12,
      borderWidth: 1.5,
    },
    footerActionText: {
      fontSize: 13,
      fontWeight: '700',
    },
    footerIconButton: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      borderWidth: 1.5,
    },
    footerToggleButtonCompact: {
      flex: 0,
      minWidth: 100,
      maxWidth: 140,
    },
    scrollView: {
      flex: 1,
    },
    scrollViewContent: {
      flexGrow: 1,
    },
    portfolioContainer: {
      backgroundColor: '#fff',
      padding: 20,
    },
    // Header Section
    portfolioHeader: {
      alignItems: 'center',
      marginBottom: 24,
      paddingBottom: 20,
      borderBottomWidth: 2,
      borderBottomColor: primaryColor,
    },
    profilePhoto: {
      width: 100,
      height: 100,
      borderRadius: 50,
      marginBottom: 12,
      borderWidth: 3,
      borderColor: primaryColor,
    },
    displayName: {
      fontSize: 26,
      fontWeight: '800',
      color: '#1a1a1a',
      marginBottom: 4,
    },
    username: {
      fontSize: 16,
      color: '#666',
      marginBottom: 8,
    },
    location: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    locationText: {
      fontSize: 14,
      color: '#666',
      marginLeft: 4,
    },
    bio: {
      fontSize: 14,
      color: '#333',
      lineHeight: 20,
      textAlign: 'center',
    },
    // Section Styles
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#1a1a1a',
      marginBottom: 12,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#e0e0e0',
    },
    // Interests
    interestsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginRight: -8,
    },
    interestPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: `${primaryColor}15`,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginRight: 8,
      marginBottom: 8,
    },
    interestIcon: {
      marginRight: 4,
    },
    interestText: {
      fontSize: 13,
      fontWeight: '600',
      color: primaryColor,
    },
    // Links
    linkItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: '#f5f5f5',
      borderRadius: 8,
      marginBottom: 8,
    },
    linkIcon: {
      marginRight: 8,
    },
    linkText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#333',
      flex: 1,
    },
    linkUrl: {
      fontSize: 12,
      color: '#666',
    },
    // Album - Masonry Layout
    albumContainer: {
      flexDirection: 'row',
      marginRight: -8,
    },
    masonryColumn: {
      flex: 1,
      marginRight: 8,
    },
    albumPhoto: {
      width: '100%',
      borderRadius: 8,
      marginBottom: 8,
    },
    // Footer
    portfolioFooter: {
      marginTop: 24,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: '#e0e0e0',
      alignItems: 'center',
    },
    footerText: {
      fontSize: 12,
      color: '#999',
      marginBottom: 8,
    },
    logoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    logo: {
      width: 32,
      height: 32,
    },
    appName: {
      fontSize: 16,
      fontWeight: '700',
      color: primaryColor,
    },
    emptyState: {
      padding: 20,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: '#666',
      textAlign: 'center',
      marginTop: 8,
    },
    emptyAlbumState: {
      padding: 32,
      alignItems: 'center',
      backgroundColor: '#f9f9f9',
      borderRadius: 12,
      marginTop: 8,
    },
    emptyAlbumText: {
      fontSize: 14,
      color: '#999',
      textAlign: 'center',
      marginTop: 12,
      fontWeight: '500',
    },
    // Business Card Styles
    businessCardContainer: {
      backgroundColor: '#fff',
      padding: 28,
      borderRadius: 20,
      margin: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 8,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
      paddingBottom: 20,
      borderBottomWidth: 3,
      borderBottomColor: primaryColor,
    },
    cardProfilePhoto: {
      width: 90,
      height: 90,
      borderRadius: 45,
      marginRight: 16,
      borderWidth: 4,
      borderColor: primaryColor,
    },
    cardHeaderInfo: {
      flex: 1,
    },
    cardDisplayName: {
      fontSize: 24,
      fontWeight: '900',
      color: '#1a1a1a',
      marginBottom: 4,
      letterSpacing: -0.5,
    },
    cardUsername: {
      fontSize: 15,
      color: '#666',
      fontWeight: '500',
    },
    cardTitleSection: {
      marginBottom: 20,
      paddingHorizontal: 4,
    },
    cardProfession: {
      fontSize: 18,
      fontWeight: '700',
      color: primaryColor,
      marginBottom: 4,
    },
    cardCompany: {
      fontSize: 15,
      fontWeight: '600',
      color: '#555',
    },
    cardExperienceBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: `${primaryColor}08`,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginBottom: 20,
      borderWidth: 2,
      borderColor: `${primaryColor}20`,
    },
    cardExperienceIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: primaryColor,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    cardExperienceText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#1a1a1a',
      flex: 1,
    },
    cardSection: {
      marginBottom: 20,
    },
    cardSectionLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: '#888',
      letterSpacing: 1.2,
      marginBottom: 12,
    },
    cardSectionValue: {
      fontSize: 15,
      color: '#333',
      fontWeight: '500',
      lineHeight: 22,
    },
    cardBioText: {
      fontSize: 15,
      color: '#444',
      fontWeight: '400',
      lineHeight: 22,
      fontStyle: 'italic',
    },
    cardContactShareRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'stretch',
      gap: 16,
    },
    cardContactGrid: {
      gap: 10,
    },
    cardContactDetails: {
      flex: 1,
      minWidth: 0,
    },
    cardContactItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f8f9fa',
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#e9ecef',
    },
    cardContactIconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: primaryColor,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    cardContactValue: {
      fontSize: 14,
      fontWeight: '600',
      color: '#333',
      flex: 1,
    },
    cardShareCodeCompact: {
      minWidth: 130,
      flexBasis: 140,
      flexGrow: 0,
      flexShrink: 0,
    },
    cardSkills: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    cardSkillPill: {
      backgroundColor: `${primaryColor}12`,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: `${primaryColor}40`,
    },
    cardSkillText: {
      fontSize: 13,
      fontWeight: '700',
      color: primaryColor,
    },
    cardAvailableBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#10B981',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      alignSelf: 'flex-start',
      shadowColor: '#10B981',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    cardAvailableText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#fff',
      marginLeft: 8,
    },
    cardFooter: {
      marginTop: 24,
      paddingTop: 20,
      borderTopWidth: 2,
      borderTopColor: '#f0f0f0',
      alignItems: 'center',
    },
    cardFooterText: {
      fontSize: 11,
      color: '#aaa',
      marginBottom: 8,
      fontWeight: '500',
    },
    cardLogo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    cardLogoImage: {
      width: 28,
      height: 28,
    },
    cardLogoText: {
      fontSize: 16,
      fontWeight: '800',
      color: primaryColor,
      letterSpacing: -0.3,
    },
    styleButton: {
      padding: 8,
      borderRadius: 8,
      borderWidth: 1.5,
    },
    // Minimal Card Styles
    minimalCardContainer: {
      backgroundColor: '#fff',
      padding: 32,
      borderRadius: 20,
      margin: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
      borderWidth: 1,
      borderColor: '#e5e5e5',
    },
    minimalHeader: {
      alignItems: 'center',
      marginBottom: 24,
    },
    minimalPhoto: {
      width: 70,
      height: 70,
      borderRadius: 35,
      marginBottom: 16,
      borderWidth: 2,
      borderColor: '#333',
    },
    minimalName: {
      fontSize: 22,
      fontWeight: '800',
      color: '#1a1a1a',
      marginBottom: 6,
      textAlign: 'center',
    },
    minimalProfession: {
      fontSize: 16,
      fontWeight: '600',
      color: '#555',
      textAlign: 'center',
      marginBottom: 4,
    },
    minimalCompany: {
      fontSize: 14,
      fontWeight: '500',
      color: '#777',
      textAlign: 'center',
    },
    minimalDivider: {
      height: 1,
      backgroundColor: '#ddd',
      marginBottom: 24,
    },
    minimalContactGrid: {
      gap: 16,
      marginBottom: 24,
    },
    minimalContactItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    minimalContactText: {
      fontSize: 14,
      color: '#555',
      fontWeight: '500',
    },
    minimalSkillsSection: {
      marginBottom: 16,
    },
    minimalShareSection: {
      marginTop: 8,
      marginBottom: 16,
    },
    minimalSkills: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    minimalSkillText: {
      fontSize: 13,
      color: '#666',
      fontWeight: '600',
    },
    minimalFooter: {
      marginTop: 24,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: '#ddd',
      alignItems: 'center',
    },
    minimalFooterText: {
      fontSize: 13,
      color: '#888',
      fontWeight: '600',
    },
    // Gradient Card Styles
    gradientCardContainer: {
      borderRadius: 20,
      margin: 20,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
    gradientOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
      backgroundColor: primaryColor,
      opacity: 0.95,
    },
    gradientContent: {
      padding: 28,
      position: 'relative',
      zIndex: 1,
    },
    gradientHeader: {
      alignItems: 'center',
      marginBottom: 24,
    },
    gradientPhoto: {
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 4,
      borderColor: '#fff',
      marginBottom: 16,
    },
    gradientName: {
      fontSize: 26,
      fontWeight: '900',
      color: '#fff',
      textAlign: 'center',
      marginBottom: 4,
      textShadowColor: 'rgba(0,0,0,0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    gradientUsername: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
      opacity: 0.9,
      textAlign: 'center',
    },
    gradientInfoCard: {
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      gap: 12,
    },
    gradientInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    gradientInfoText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#333',
      flex: 1,
    },
    gradientSkills: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    gradientShareSection: {
      marginBottom: 16,
    },
    gradientSkillPill: {
      backgroundColor: 'rgba(255,255,255,0.95)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    gradientSkillText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#333',
    },
    gradientAvailableBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#10B981',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      alignSelf: 'center',
      borderWidth: 2,
      borderColor: '#fff',
      gap: 8,
    },
    gradientAvailableText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#fff',
    },
    // Elegant Card Styles
    elegantCardContainer: {
      backgroundColor: '#FAF9F7',
      padding: 32,
      borderRadius: 20,
      margin: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 6,
      borderWidth: 3,
      borderColor: '#D4AF37',
      position: 'relative',
    },
    elegantCorner: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: 60,
      height: 60,
      borderTopRightRadius: 18,
      borderBottomLeftRadius: 40,
      backgroundColor: '#D4AF37',
      opacity: 0.15,
    },
    elegantHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    elegantHeaderText: {
      flex: 1,
      marginRight: 16,
    },
    elegantName: {
      fontSize: 22,
      fontWeight: '800',
      color: '#2C2416',
      marginBottom: 6,
      letterSpacing: 0.5,
    },
    elegantProfession: {
      fontSize: 16,
      fontWeight: '600',
      color: '#8B7355',
      marginBottom: 4,
    },
    elegantCompany: {
      fontSize: 14,
      fontWeight: '500',
      color: '#A0896B',
    },
    elegantPhoto: {
      width: 70,
      height: 70,
      borderRadius: 35,
      borderWidth: 3,
      borderColor: '#D4AF37',
    },
    elegantDivider: {
      height: 2,
      backgroundColor: '#D4AF37',
      marginBottom: 20,
      opacity: 0.3,
    },
    elegantExperience: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      backgroundColor: '#fff',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E8DCC8',
    },
    elegantExpIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#D4AF37',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    elegantExpNumber: {
      fontSize: 18,
      fontWeight: '900',
      color: '#fff',
    },
    elegantExpText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#2C2416',
      flex: 1,
    },
    elegantSection: {
      marginBottom: 16,
    },
    elegantSectionTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: '#8B7355',
      letterSpacing: 1.5,
      marginBottom: 10,
      textTransform: 'uppercase',
    },
    elegantContactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    elegantContactText: {
      fontSize: 13,
      fontWeight: '500',
      color: '#4A3F2E',
      flex: 1,
    },
    elegantSkillsText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#4A3F2E',
      lineHeight: 20,
    },
    elegantShareSection: {
      marginBottom: 16,
    },
    elegantFooter: {
      marginTop: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: '#E8DCC8',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    elegantFooterText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#8B7355',
    },
    elegantFooterBrand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    elegantLogoImage: {
      width: 20,
      height: 20,
    },
    elegantBrandText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#8B7355',
    },
    // Style Picker Styles
    stylePickerOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingTop: 60,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
    stylePickerContainer: {
      backgroundColor: themeColors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: 40,
    },
    stylePickerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.divider,
    },
    stylePickerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: themeColors.textPrimary,
    },
    stylePickerClose: {
      padding: 4,
    },
    stylePickerGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: 20,
      gap: 12,
    },
    stylePickerOption: {
      width: '47%',
      padding: 16,
      borderRadius: 16,
      borderWidth: 2,
      alignItems: 'center',
      position: 'relative',
    },
    stylePickerIcon: {
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    stylePickerName: {
      fontSize: 14,
      textAlign: 'center',
    },
    stylePickerCheck: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={localStyles.modalOverlay}>
        <View style={localStyles.modalContainer}>
          {/* Header */}
          <View style={localStyles.header}>
            <TouchableOpacity
              onPress={onClose}
              style={localStyles.closeButtonTop}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={28} color={themeColors.textPrimary} />
            </TouchableOpacity>
            <Text style={localStyles.headerTitle}>
              {viewMode === 'portfolio' ? 'Portfolio' : 'Business Card'}
            </Text>
          </View>

          {/* Content */}
          <ScrollView
            style={localStyles.scrollView}
            contentContainerStyle={localStyles.scrollViewContent}
            showsVerticalScrollIndicator={false}
          >
            <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0 }}>
              {viewMode === 'card' ? (
                renderBusinessCard()
              ) : (
                <View style={localStyles.portfolioContainer}>
                {/* Header Section */}
                <View style={localStyles.portfolioHeader}>
                  {profile.profilePhoto && (
                    <Image
                      source={{ uri: profile.profilePhoto }}
                      style={localStyles.profilePhoto}
                    />
                  )}
                  <Text style={localStyles.displayName}>
                    {profile.displayName || profile.username}
                  </Text>
                  <Text style={localStyles.username}>@{profile.username}</Text>

                  {profile.location && (
                    <View style={localStyles.location}>
                      <Ionicons name="location" size={16} color="#666" />
                      <Text style={localStyles.locationText}>{profile.location}</Text>
                    </View>
                  )}

                  {profile.bio && (
                    <Text style={localStyles.bio}>{profile.bio}</Text>
                  )}
                </View>

                {/* Interests Section */}
                {userInterests.length > 0 && (
                  <View style={localStyles.section}>
                    <Text style={localStyles.sectionTitle}>Interests</Text>
                    <View style={localStyles.interestsGrid}>
                      {userInterests.map((interest) => (
                        <View key={interest.id} style={localStyles.interestPill}>
                          <Ionicons
                            name={interest.icon}
                            size={14}
                            color={primaryColor}
                            style={localStyles.interestIcon}
                          />
                          <Text style={localStyles.interestText}>{interest.label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Links Section */}
                {profile.links && profile.links.length > 0 && (
                  <View style={localStyles.section}>
                    <Text style={localStyles.sectionTitle}>Links</Text>
                    {profile.links.map((link, index) => (
                      <View key={index} style={localStyles.linkItem}>
                        <Ionicons name="link" size={20} color={primaryColor} style={localStyles.linkIcon} />
                        <View style={{ flex: 1 }}>
                          <Text style={localStyles.linkText}>{link.label}</Text>
                          <Text style={localStyles.linkUrl} numberOfLines={1}>
                            {link.url}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Album Section - Masonry Layout */}
                <View style={localStyles.section}>
                  <Text style={localStyles.sectionTitle}>Album</Text>
                  {hasAlbumPhotos ? (
                    <View style={localStyles.albumContainer}>
                      {masonryColumns.map((column, colIndex) => (
                        <View key={colIndex} style={localStyles.masonryColumn}>
                          {column.map((photo, photoIndex) => (
                            <Image
                              key={photoIndex}
                              source={{ uri: photo.downloadUrl }}
                              style={[
                                localStyles.albumPhoto,
                                { height: 200 },
                              ]}
                              resizeMode="cover"
                            />
                          ))}
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={localStyles.emptyAlbumState}>
                      <Ionicons name="images-outline" size={48} color="#ccc" />
                      <Text style={localStyles.emptyAlbumText}>
                        No album photos yet
                      </Text>
                    </View>
                  )}
                </View>

                {/* Footer */}
                <View style={localStyles.portfolioFooter}>
                  <Text style={localStyles.footerText}>Created with</Text>
                  <View style={localStyles.logoContainer}>
                    <Image
                      source={require('../assets/icon.png')}
                      style={localStyles.logo}
                      resizeMode="contain"
                    />
                    <Text style={localStyles.appName}>LocalLoop</Text>
                  </View>
                </View>
              </View>
              )}
            </ViewShot>
          </ScrollView>

          {/* Action Buttons Footer */}
          <View style={localStyles.actionsFooter}>
            <View style={localStyles.actionsRow}>
              {/* View Toggle Button */}
              <TouchableOpacity
                onPress={() => setViewMode(viewMode === 'portfolio' ? 'card' : 'portfolio')}
                style={[
                  localStyles.footerToggleButton,
                  { backgroundColor: `${primaryColor}15`, borderColor: primaryColor },
                  viewMode === 'card' && localStyles.footerToggleButtonCompact,
                ]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={viewMode === 'portfolio' ? 'card-outline' : 'document-text-outline'}
                  size={20}
                  color={primaryColor}
                />
                <Text style={[localStyles.footerToggleText, { color: primaryColor }]} numberOfLines={1}>
                  {viewMode === 'portfolio' ? 'Card' : 'Portfolio'}
                </Text>
              </TouchableOpacity>

              {/* Style Picker Button (only in card mode) */}
              {viewMode === 'card' && (
                <TouchableOpacity
                  onPress={() => setStylePickerVisible(true)}
                  style={[localStyles.footerIconButton, { backgroundColor: themeColors.background, borderColor: themeColors.divider }]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={CARD_STYLES[cardStyle].icon}
                    size={22}
                    color={themeColors.textPrimary}
                  />
                </TouchableOpacity>
              )}

              {/* Spacer to push download/share to the right */}
              <View style={{ flex: 1 }} />

              {/* Download Button */}
              <TouchableOpacity
                onPress={handleDownload}
                style={[localStyles.footerIconButton, { backgroundColor: themeColors.background, borderColor: themeColors.divider }]}
                disabled={isDownloading}
                activeOpacity={0.7}
              >
                {isDownloading ? (
                  <ActivityIndicator color={themeColors.textPrimary} size="small" />
                ) : (
                  <Ionicons name="download-outline" size={22} color={themeColors.textPrimary} />
                )}
              </TouchableOpacity>

              {/* Share Button */}
              <TouchableOpacity
                onPress={handleShare}
                style={[localStyles.footerIconButton, { backgroundColor: `${primaryColor}15`, borderColor: primaryColor }]}
                disabled={isSharing}
                activeOpacity={0.7}
              >
                {isSharing ? (
                  <ActivityIndicator color={primaryColor} size="small" />
                ) : (
                  <Ionicons name="share-outline" size={22} color={primaryColor} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Style Picker Modal */}
        {stylePickerVisible && (
          <View style={localStyles.stylePickerOverlay}>
            <View style={localStyles.stylePickerContainer}>
              <View style={localStyles.stylePickerHeader}>
                <Text style={localStyles.stylePickerTitle}>Choose Card Style</Text>
                <TouchableOpacity
                  onPress={() => setStylePickerVisible(false)}
                  style={localStyles.stylePickerClose}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={24} color={themeColors.textPrimary} />
                </TouchableOpacity>
              </View>

              <View style={localStyles.stylePickerGrid}>
                {Object.values(CARD_STYLES).map((style) => (
                  <TouchableOpacity
                    key={style.id}
                    onPress={() => {
                      setCardStyle(style.id);
                      setStylePickerVisible(false);
                    }}
                    style={[
                      localStyles.stylePickerOption,
                      {
                        backgroundColor: themeColors.background,
                        borderColor: cardStyle === style.id ? primaryColor : themeColors.divider,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        localStyles.stylePickerIcon,
                        {
                          backgroundColor: cardStyle === style.id ? `${primaryColor}20` : themeColors.card,
                        },
                      ]}
                    >
                      <Ionicons
                        name={style.icon}
                        size={28}
                        color={cardStyle === style.id ? primaryColor : themeColors.textSecondary}
                      />
                    </View>
                    <Text
                      style={[
                        localStyles.stylePickerName,
                        {
                          color: cardStyle === style.id ? primaryColor : themeColors.textPrimary,
                          fontWeight: cardStyle === style.id ? '700' : '600',
                        },
                      ]}
                    >
                      {style.name}
                    </Text>
                    {cardStyle === style.id && (
                      <View style={[localStyles.stylePickerCheck, { backgroundColor: primaryColor }]}>
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
