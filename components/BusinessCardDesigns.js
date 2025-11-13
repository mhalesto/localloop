/**
 * Professional Business Card Designs
 * Multiple modern business card templates with front and back views
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProfileShareCode from './ProfileShareCode';
import { LinearGradient } from 'expo-linear-gradient';

const DEFAULT_CARD_WIDTH = Dimensions.get('window').width - 40;
const CARD_ASPECT_RATIO = 0.56; // Standard business card ratio

const resolveCardDimensions = (customWidth) => {
  const width = Math.max(260, customWidth ?? DEFAULT_CARD_WIDTH);
  return {
    width,
    height: width * CARD_ASPECT_RATIO,
  };
};

// Card Design Templates
export const BUSINESS_CARD_DESIGNS = {
  corporate: {
    id: 'corporate',
    name: 'Corporate Professional',
    icon: 'briefcase-outline',
  },
  geometric: {
    id: 'geometric',
    name: 'Modern Geometric',
    icon: 'shapes-outline',
  },
  minimalist: {
    id: 'minimalist',
    name: 'Clean Minimalist',
    icon: 'remove-outline',
  },
  gradient: {
    id: 'gradient',
    name: 'Bold Gradient',
    icon: 'color-palette-outline',
  },
  luxury: {
    id: 'luxury',
    name: 'Luxury Gold',
    icon: 'diamond-outline',
  },
  tech: {
    id: 'tech',
    name: 'Tech Modern',
    icon: 'code-slash-outline',
  },
  creative: {
    id: 'creative',
    name: 'Creative Studio',
    icon: 'brush-outline',
  },
  elegant: {
    id: 'elegant',
    name: 'Elegant Classic',
    icon: 'rose-outline',
  },
};

// Corporate Professional Design
export const CorporateCard = ({
  profile,
  side = 'front',
  primaryColor = '#FFB800',
  cardWidth,
}) => {
  const { width: resolvedWidth, height: resolvedHeight } = resolveCardDimensions(cardWidth);

  const styles = StyleSheet.create({
    container: {
      width: resolvedWidth,
      height: resolvedHeight,
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
      overflow: 'hidden',
    },
    // Front Side
    frontContainer: {
      flex: 1,
      padding: 24,
      justifyContent: 'space-between',
    },
    accentBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 60,
      backgroundColor: primaryColor,
    },
    companySection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 20,
    },
    profilePhoto: {
      width: 50,
      height: 50,
      borderRadius: 25,
      borderWidth: 2,
      borderColor: primaryColor,
    },
    companyInfo: {
      flex: 1,
    },
    companyName: {
      fontSize: 12,
      fontWeight: '600',
      color: '#666',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    nameSection: {
      flex: 1,
      justifyContent: 'center',
    },
    displayName: {
      fontSize: 24,
      fontWeight: '700',
      color: '#1A1A1A',
      marginBottom: 4,
    },
    profession: {
      fontSize: 14,
      fontWeight: '500',
      color: '#666',
      marginBottom: 2,
    },
    department: {
      fontSize: 12,
      fontWeight: '400',
      color: '#999',
    },
    contactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      zIndex: 10,
    },
    contactItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 16,
    },
    contactIcon: {
      marginRight: 4,
    },
    contactText: {
      fontSize: 10,
      color: '#FFF',
      fontWeight: '500',
    },
    // Back Side
    backContainer: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      position: 'relative',
      overflow: 'hidden',
    },
    backMainContent: {
      flex: 1,
      flexDirection: 'row',
      padding: 16,
    },
    backLeftSide: {
      flex: 1,
      justifyContent: 'space-between',
      paddingRight: 15,
    },
    backRightSide: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    backCompanyHeader: {
      marginBottom: 16,
    },
    backCompanyName: {
      fontSize: 15,
      fontWeight: '700',
      color: '#1A1A1A',
      marginBottom: 4,
    },
    backTagline: {
      fontSize: 10,
      color: '#666',
      fontStyle: 'italic',
    },
    backInfoSection: {
      flex: 1,
      justifyContent: 'center',
    },
    backContactItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    backContactIcon: {
      width: 32,
      alignItems: 'center',
    },
    backContactText: {
      fontSize: 12,
      color: '#333',
      flex: 1,
    },
    backContactLabel: {
      fontSize: 10,
      color: '#999',
      marginTop: 2,
    },
    backSocialSection: {
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: '#F0F0F0',
    },
    backSocialTitle: {
      fontSize: 10,
      color: '#999',
      letterSpacing: 1,
      marginBottom: 10,
      textTransform: 'uppercase',
    },
    backSocialIcons: {
      flexDirection: 'row',
      gap: 12,
    },
    backSocialIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#F5F5F5',
      alignItems: 'center',
      justifyContent: 'center',
    },
    qrContainer: {
      backgroundColor: '#FFFFFF',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E0E0E0',
    },
    qrLabel: {
      fontSize: 9,
      color: '#666',
      textAlign: 'center',
      marginTop: 8,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
  });

  if (side === 'front') {
    return (
      <View style={styles.container}>
        <View style={styles.accentBar} />
        <View style={styles.frontContainer}>
          <View style={styles.companySection}>
            {profile.profilePhoto ? (
              <Image
                source={{ uri: profile.profilePhoto }}
                style={styles.profilePhoto}
              />
            ) : (
              <View style={[styles.profilePhoto, { backgroundColor: primaryColor + '20', justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: primaryColor }}>
                  {profile.displayName ? profile.displayName.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>
                {profile.company || 'LocalLoop Technologies'}
              </Text>
            </View>
          </View>

          <View style={styles.nameSection}>
            <Text style={styles.displayName}>
              {profile.displayName || 'John Smith'}
            </Text>
            <Text style={styles.profession}>
              {profile.profession || 'Senior Software Engineer'}
            </Text>
            <Text style={styles.department}>
              {profile.department || 'Product Development'}
            </Text>
          </View>

          <View style={styles.contactRow}>
            <View style={styles.contactItem}>
              <Ionicons name="call" size={12} color="#FFF" style={styles.contactIcon} />
              <Text style={styles.contactText}>
                {profile.contactPhone || '+27 123 456 7890'}
              </Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="mail" size={12} color="#FFF" style={styles.contactIcon} />
              <Text style={styles.contactText} numberOfLines={1}>
                {profile.contactEmail || 'john@localloop.com'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.backContainer}>
        <View style={styles.backMainContent}>
          {/* Left Side - Information */}
          <View style={styles.backLeftSide}>
            <View style={styles.backCompanyHeader}>
              <Text style={styles.backCompanyName}>
                {profile.company || 'LocalLoop Technologies'}
              </Text>
              <Text style={styles.backTagline}>
                "Connecting Communities Worldwide"
              </Text>
            </View>

            <View style={styles.backInfoSection}>
              <View style={styles.backContactItem}>
                <View style={styles.backContactIcon}>
                  <Ionicons name="call" size={16} color={primaryColor} />
                </View>
                <View>
                  <Text style={styles.backContactText}>
                    {profile.contactPhone || '+27 123 456 7890'}
                  </Text>
                  <Text style={styles.backContactLabel}>Phone</Text>
                </View>
              </View>

              <View style={styles.backContactItem}>
                <View style={styles.backContactIcon}>
                  <Ionicons name="mail" size={16} color={primaryColor} />
                </View>
                <View>
                  <Text style={styles.backContactText}>
                    {profile.contactEmail || 'contact@localloop.com'}
                  </Text>
                  <Text style={styles.backContactLabel}>Email</Text>
                </View>
              </View>

              <View style={styles.backContactItem}>
                <View style={styles.backContactIcon}>
                  <Ionicons name="location" size={16} color={primaryColor} />
                </View>
                <View>
                  <Text style={styles.backContactText}>
                    {profile.location || 'Cape Town, South Africa'}
                  </Text>
                  <Text style={styles.backContactLabel}>Location</Text>
                </View>
              </View>

              <View style={styles.backContactItem}>
                <View style={styles.backContactIcon}>
                  <Ionicons name="globe" size={16} color={primaryColor} />
                </View>
                <View>
                  <Text style={styles.backContactText}>
                    {profile.website || 'www.localloop.com'}
                  </Text>
                  <Text style={styles.backContactLabel}>Website</Text>
                </View>
              </View>
            </View>

            <View style={styles.backSocialSection}>
              <Text style={styles.backSocialTitle}>Connect</Text>
              <View style={styles.backSocialIcons}>
                <View style={styles.backSocialIcon}>
                  <Ionicons name="logo-linkedin" size={16} color={primaryColor} />
                </View>
                <View style={styles.backSocialIcon}>
                  <Ionicons name="logo-twitter" size={16} color={primaryColor} />
                </View>
                <View style={styles.backSocialIcon}>
                  <Ionicons name="logo-instagram" size={16} color={primaryColor} />
                </View>
                <View style={styles.backSocialIcon}>
                  <Ionicons name="logo-facebook" size={16} color={primaryColor} />
                </View>
              </View>
            </View>
          </View>

          {/* Right Side - QR Code */}
          <View style={styles.backRightSide}>
            <View style={styles.qrContainer}>
              <ProfileShareCode
                profile={profile}
                primaryColor={primaryColor}
                variant="minimal"
                size="compact"
                showMeta={false}
                showHeader={false}
                frameless
              />
            </View>
            <Text style={styles.qrLabel}>Scan to Connect</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

// Modern Geometric Design
export const GeometricCard = ({
  profile,
  side = 'front',
  primaryColor = '#FFB800',
  cardWidth,
}) => {
  const { width: resolvedWidth, height: resolvedHeight } = resolveCardDimensions(cardWidth);

  const styles = StyleSheet.create({
    container: {
      width: resolvedWidth,
      height: resolvedHeight,
      backgroundColor: '#1A1A1A',
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
      overflow: 'hidden',
    },
    // Front Side
    frontContainer: {
      flex: 1,
      position: 'relative',
    },
    geometricPattern: {
      position: 'absolute',
      top: -50,
      left: -50,
      width: 200,
      height: 200,
      transform: [{ rotate: '45deg' }],
    },
    geometricSquare1: {
      position: 'absolute',
      width: 100,
      height: 100,
      backgroundColor: primaryColor,
      opacity: 0.9,
    },
    geometricSquare2: {
      position: 'absolute',
      width: 70,
      height: 70,
      backgroundColor: primaryColor,
      opacity: 0.6,
      left: 60,
      top: 60,
    },
    geometricSquare3: {
      position: 'absolute',
      width: 50,
      height: 50,
      backgroundColor: '#FFF',
      opacity: 0.1,
      left: 100,
      top: 100,
    },
    frontContent: {
      flex: 1,
      padding: 24,
      justifyContent: 'flex-end',
    },
    profilePhotoGeometric: {
      position: 'absolute',
      top: 24,
      right: 24,
      width: 60,
      height: 60,
      borderRadius: 30,
      borderWidth: 3,
      borderColor: primaryColor,
    },
    nameBlock: {
      marginBottom: 16,
    },
    displayName: {
      fontSize: 26,
      fontWeight: '800',
      color: '#FFF',
      marginBottom: 4,
    },
    profession: {
      fontSize: 14,
      fontWeight: '400',
      color: primaryColor,
      letterSpacing: 0.5,
    },
    contactInfo: {
      gap: 8,
    },
    contactItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    contactText: {
      fontSize: 11,
      color: '#FFF',
      opacity: 0.9,
    },
    // Back Side - Geometric
    backContainerGeometric: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      position: 'relative',
      overflow: 'hidden',
    },
    geometricBackPattern: {
      position: 'absolute',
      bottom: -30,
      right: -30,
      width: 150,
      height: 150,
      transform: [{ rotate: '45deg' }],
      opacity: 0.05,
    },
    backMainContentGeometric: {
      flex: 1,
      flexDirection: 'row',
      padding: 16,
    },
    backLeftGeometric: {
      flex: 1,
      justifyContent: 'space-between',
      paddingRight: 15,
    },
    backRightGeometric: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    companyHeaderGeometric: {
      marginBottom: 10,
    },
    companyNameGeometric: {
      fontSize: 14,
      fontWeight: '800',
      color: '#1A1A1A',
      marginBottom: 2,
    },
    companyTaglineGeometric: {
      fontSize: 9,
      color: primaryColor,
      fontWeight: '500',
    },
    servicesSection: {
      flex: 1,
      justifyContent: 'center',
    },
    servicesTitle: {
      fontSize: 9,
      fontWeight: '700',
      color: '#999',
      letterSpacing: 1,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    serviceItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 5,
    },
    serviceDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: primaryColor,
      marginRight: 6,
    },
    serviceText: {
      fontSize: 10,
      color: '#333',
    },
    geometricContactSection: {
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: '#F0F0F0',
    },
    geometricContactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    geometricContactIcon: {
      width: 20,
      marginRight: 8,
    },
    geometricContactText: {
      fontSize: 11,
      color: '#666',
    },
    qrContainerGeometric: {
      backgroundColor: '#F8F9FA',
      padding: 12,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: primaryColor,
      borderStyle: 'dashed',
    },
    qrLabelGeometric: {
      fontSize: 10,
      color: primaryColor,
      textAlign: 'center',
      marginTop: 10,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
  });

  if (side === 'front') {
    return (
      <View style={styles.container}>
        <View style={styles.frontContainer}>
          <View style={styles.geometricPattern}>
            <View style={styles.geometricSquare1} />
            <View style={styles.geometricSquare2} />
            <View style={styles.geometricSquare3} />
          </View>

          {profile.profilePhoto ? (
            <Image
              source={{ uri: profile.profilePhoto }}
              style={styles.profilePhotoGeometric}
            />
          ) : (
            <View style={[styles.profilePhotoGeometric, { backgroundColor: primaryColor + '20', justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: primaryColor }}>
                {profile.displayName ? profile.displayName.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
          )}

          <View style={styles.frontContent}>
            <View style={styles.nameBlock}>
              <Text style={styles.displayName}>
                {profile.displayName || 'Sarah Johnson'}
              </Text>
              <Text style={styles.profession}>
                {profile.profession || 'Creative Director'}
              </Text>
            </View>

            <View style={styles.contactInfo}>
              <View style={styles.contactItem}>
                <Ionicons name="call-outline" size={14} color={primaryColor} />
                <Text style={styles.contactText}>
                  {profile.contactPhone || '+27 123 456 7890'}
                </Text>
              </View>
              <View style={styles.contactItem}>
                <Ionicons name="mail-outline" size={14} color={primaryColor} />
                <Text style={styles.contactText}>
                  {profile.contactEmail || 'sarah@design.studio'}
                </Text>
              </View>
              <View style={styles.contactItem}>
                <Ionicons name="location-outline" size={14} color={primaryColor} />
                <Text style={styles.contactText}>
                  {profile.location || 'Cape Town, South Africa'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.backContainerGeometric}>
        <View style={[styles.geometricBackPattern, { backgroundColor: primaryColor }]} />

        <View style={styles.backMainContentGeometric}>
          {/* Left Side - Information */}
          <View style={styles.backLeftGeometric}>
            <View style={styles.companyHeaderGeometric}>
              <Text style={styles.companyNameGeometric}>
                {profile.company || 'Design Studio Co.'}
              </Text>
              <Text style={styles.companyTaglineGeometric}>
                Creating Digital Experiences
              </Text>
            </View>

            <View style={styles.servicesSection}>
              <Text style={styles.servicesTitle}>Our Services</Text>
              <View style={styles.serviceItem}>
                <View style={styles.serviceDot} />
                <Text style={styles.serviceText}>Brand Identity Design</Text>
              </View>
              <View style={styles.serviceItem}>
                <View style={styles.serviceDot} />
                <Text style={styles.serviceText}>Web Development</Text>
              </View>
              <View style={styles.serviceItem}>
                <View style={styles.serviceDot} />
                <Text style={styles.serviceText}>UI/UX Design</Text>
              </View>
              <View style={styles.serviceItem}>
                <View style={styles.serviceDot} />
                <Text style={styles.serviceText}>Digital Marketing</Text>
              </View>
            </View>

            <View style={styles.geometricContactSection}>
              <View style={styles.geometricContactRow}>
                <View style={styles.geometricContactIcon}>
                  <Ionicons name="globe-outline" size={14} color={primaryColor} />
                </View>
                <Text style={styles.geometricContactText}>
                  {profile.website || 'www.designstudio.com'}
                </Text>
              </View>
              <View style={styles.geometricContactRow}>
                <View style={styles.geometricContactIcon}>
                  <Ionicons name="mail-outline" size={14} color={primaryColor} />
                </View>
                <Text style={styles.geometricContactText}>
                  {profile.contactEmail || 'hello@designstudio.com'}
                </Text>
              </View>
              <View style={styles.geometricContactRow}>
                <View style={styles.geometricContactIcon}>
                  <Ionicons name="call-outline" size={14} color={primaryColor} />
                </View>
                <Text style={styles.geometricContactText}>
                  {profile.contactPhone || '+27 123 456 7890'}
                </Text>
              </View>
            </View>
          </View>

          {/* Right Side - QR Code */}
          <View style={styles.backRightGeometric}>
            <View style={styles.qrContainerGeometric}>
              <ProfileShareCode
                profile={profile}
                primaryColor={primaryColor}
                variant="minimal"
                size="compact"
                showMeta={false}
                showHeader={false}
                frameless
              />
            </View>
            <Text style={styles.qrLabelGeometric}>SCAN ME</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

// Minimalist Clean Design
export const MinimalistCard = ({
  profile,
  side = 'front',
  primaryColor = '#000',
  cardWidth,
}) => {
  const { width: resolvedWidth, height: resolvedHeight } = resolveCardDimensions(cardWidth);

  const styles = StyleSheet.create({
    container: {
      width: resolvedWidth,
      height: resolvedHeight,
      backgroundColor: '#FFF',
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 3,
      overflow: 'hidden',
    },
    // Front Side
    frontContainer: {
      flex: 1,
      padding: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    minimalPhoto: {
      width: 60,
      height: 60,
      borderRadius: 30,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: '#E0E0E0',
    },
    nameSection: {
      alignItems: 'center',
      marginBottom: 20,
    },
    displayName: {
      fontSize: 22,
      fontWeight: '300',
      color: '#000',
      letterSpacing: 2,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    divider: {
      width: 40,
      height: 1,
      backgroundColor: '#000',
      marginVertical: 12,
      opacity: 0.2,
    },
    profession: {
      fontSize: 11,
      fontWeight: '400',
      color: '#666',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    // Back Side
    backContainer: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      flexDirection: 'row',
      padding: 20,
    },
    backLeftMinimal: {
      flex: 1.2,
      justifyContent: 'center',
      paddingRight: 15,
    },
    backRightMinimal: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    minimalBackHeader: {
      marginBottom: 16,
    },
    minimalBackName: {
      fontSize: 16,
      fontWeight: '300',
      color: '#000',
      letterSpacing: 1,
      marginBottom: 2,
    },
    minimalBackTitle: {
      fontSize: 10,
      fontWeight: '400',
      color: '#666',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    contactSection: {
      gap: 16,
    },
    contactItem: {
      borderBottomWidth: 1,
      borderBottomColor: '#F0F0F0',
      paddingBottom: 12,
    },
    contactLabel: {
      fontSize: 9,
      fontWeight: '500',
      color: '#999',
      letterSpacing: 1,
      marginBottom: 4,
      textTransform: 'uppercase',
    },
    contactValue: {
      fontSize: 12,
      fontWeight: '300',
      color: '#333',
    },
    minimalQrContainer: {
      backgroundColor: '#FAFAFA',
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#E0E0E0',
    },
    minimalQrLabel: {
      fontSize: 9,
      fontWeight: '500',
      color: '#999',
      textAlign: 'center',
      marginTop: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    minimalUsername: {
      fontSize: 10,
      fontWeight: '400',
      color: '#666',
      textAlign: 'center',
      marginTop: 8,
    },
  });

  if (side === 'front') {
    return (
      <View style={styles.container}>
        <View style={styles.frontContainer}>
          {profile.profilePhoto ? (
            <Image
              source={{ uri: profile.profilePhoto }}
              style={styles.minimalPhoto}
            />
          ) : (
            <View style={[styles.minimalPhoto, { backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ fontSize: 20, fontWeight: '300', color: '#999' }}>
                {profile.displayName ? profile.displayName.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
          )}

          <View style={styles.nameSection}>
            <Text style={styles.displayName}>
              {profile.displayName || 'EMMA WILSON'}
            </Text>
            <View style={styles.divider} />
            <Text style={styles.profession}>
              {profile.profession || 'ARCHITECT'}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.backContainer}>
        {/* Left Side - Information */}
        <View style={styles.backLeftMinimal}>
          <View style={styles.minimalBackHeader}>
            <Text style={styles.minimalBackName}>
              {profile.displayName || 'EMMA WILSON'}
            </Text>
            <Text style={styles.minimalBackTitle}>
              {profile.profession || 'ARCHITECT'}
            </Text>
          </View>

          <View style={styles.contactSection}>
            <View style={styles.contactItem}>
              <Text style={styles.contactLabel}>EMAIL</Text>
              <Text style={styles.contactValue}>
                {profile.contactEmail || 'emma@architecture.studio'}
              </Text>
            </View>

            <View style={styles.contactItem}>
              <Text style={styles.contactLabel}>PHONE</Text>
              <Text style={styles.contactValue}>
                {profile.contactPhone || '+27 123 456 7890'}
              </Text>
            </View>

            <View style={styles.contactItem}>
              <Text style={styles.contactLabel}>LOCATION</Text>
              <Text style={styles.contactValue}>
                {profile.location || 'Cape Town, SA'}
              </Text>
            </View>

            <View style={[styles.contactItem, { borderBottomWidth: 0 }]}>
              <Text style={styles.contactLabel}>WEBSITE</Text>
              <Text style={styles.contactValue}>
                {profile.website || 'www.architecture.studio'}
              </Text>
            </View>
          </View>
        </View>

        {/* Right Side - QR Code */}
        <View style={styles.backRightMinimal}>
          <View style={styles.minimalQrContainer}>
            <ProfileShareCode
              profile={profile}
              primaryColor="#000"
              variant="minimal"
              size="compact"
              showMeta={false}
              showHeader={false}
              frameless
            />
          </View>
          <Text style={styles.minimalQrLabel}>SCAN TO CONNECT</Text>
          <Text style={styles.minimalUsername}>@{profile.username || 'emmawilson'}</Text>
        </View>
      </View>
    </View>
  );
};

// Luxury Gold Design
export const LuxuryCard = ({
  profile,
  side = 'front',
  primaryColor = '#D4AF37',
  cardWidth,
}) => {
  const { width: resolvedWidth, height: resolvedHeight } = resolveCardDimensions(cardWidth);

  const styles = StyleSheet.create({
    container: {
      width: resolvedWidth,
      height: resolvedHeight,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 8,
      overflow: 'hidden',
    },
    gradient: {
      flex: 1,
    },
    // Front Side
    frontContainer: {
      flex: 1,
      padding: 24,
      justifyContent: 'space-between',
    },
    goldBorder: {
      position: 'absolute',
      top: 16,
      left: 16,
      right: 16,
      bottom: 16,
      borderWidth: 2,
      borderColor: primaryColor,
      borderRadius: 12,
      opacity: 0.3,
    },
    luxuryHeader: {
      alignItems: 'center',
    },
    luxuryProfilePhoto: {
      width: 70,
      height: 70,
      borderRadius: 35,
      borderWidth: 3,
      borderColor: primaryColor,
      marginBottom: 16,
    },
    monogram: {
      width: 70,
      height: 70,
      borderRadius: 35,
      borderWidth: 3,
      borderColor: primaryColor,
      backgroundColor: 'rgba(212, 175, 55, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    monogramText: {
      fontSize: 24,
      fontWeight: '700',
      color: primaryColor,
    },
    centerContent: {
      alignItems: 'center',
    },
    luxuryName: {
      fontSize: 20,
      fontWeight: '700',
      color: '#FFF',
      letterSpacing: 1.5,
      marginBottom: 8,
    },
    luxuryTitle: {
      fontSize: 12,
      fontWeight: '400',
      color: primaryColor,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    luxuryCompany: {
      fontSize: 11,
      fontWeight: '300',
      color: '#FFF',
      opacity: 0.8,
      marginTop: 4,
      letterSpacing: 1,
    },
    luxuryFooter: {
      alignItems: 'center',
    },
    establishedText: {
      fontSize: 10,
      fontWeight: '400',
      color: primaryColor,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    // Back Side
    backContainer: {
      flex: 1,
      padding: 16,
      flexDirection: 'row',
    },
    backGoldAccent: {
      position: 'absolute',
      top: -30,
      right: -30,
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: primaryColor,
      opacity: 0.1,
    },
    backLeftLuxury: {
      flex: 1.2,
      justifyContent: 'center',
      paddingRight: 20,
    },
    backRightLuxury: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    luxuryBackHeader: {
      marginBottom: 12,
    },
    luxuryBackName: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFF',
      letterSpacing: 1,
      marginBottom: 2,
    },
    luxuryBackCompany: {
      fontSize: 10,
      fontWeight: '400',
      color: primaryColor,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    luxuryContact: {
      gap: 10,
    },
    luxuryContactItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    luxuryContactIcon: {
      width: 24,
    },
    luxuryContactText: {
      fontSize: 11,
      fontWeight: '400',
      color: '#FFF',
      letterSpacing: 0.5,
      flex: 1,
    },
    socialRow: {
      flexDirection: 'row',
      gap: 16,
      marginTop: 20,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: 'rgba(212,175,55,0.3)',
    },
    socialIconLuxury: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: primaryColor,
      alignItems: 'center',
      justifyContent: 'center',
    },
    luxuryQrWrapper: {
      padding: 16,
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderRadius: 12,
      borderWidth: 2,
      borderColor: primaryColor,
    },
    luxuryQrLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: primaryColor,
      textAlign: 'center',
      marginTop: 12,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
  });

  if (side === 'front') {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#1A1A1A', '#2C2416', '#1A1A1A']}
          style={styles.gradient}
        >
          <View style={styles.frontContainer}>
            <View style={styles.goldBorder} />

            <View style={styles.luxuryHeader}>
              {profile.profilePhoto ? (
                <Image
                  source={{ uri: profile.profilePhoto }}
                  style={styles.luxuryProfilePhoto}
                />
              ) : (
                <View style={styles.monogram}>
                  <Text style={styles.monogramText}>
                    {profile.displayName ? profile.displayName.charAt(0).toUpperCase() : 'M'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.centerContent}>
              <Text style={styles.luxuryName}>
                {profile.displayName || 'MICHAEL CHEN'}
              </Text>
              <Text style={styles.luxuryTitle}>
                {profile.profession || 'CHIEF EXECUTIVE OFFICER'}
              </Text>
              <Text style={styles.luxuryCompany}>
                {profile.company || 'Luxury Holdings Group'}
              </Text>
            </View>

            <View style={styles.luxuryFooter}>
              <Text style={styles.establishedText}>
                ESTABLISHED 2020
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2C2416', '#1A1A1A', '#2C2416']}
        style={styles.gradient}
      >
        <View style={styles.backContainer}>
          <View style={styles.backGoldAccent} />

          {/* Left Side - Information */}
          <View style={styles.backLeftLuxury}>
            <View style={styles.luxuryBackHeader}>
              <Text style={styles.luxuryBackName}>
                {profile.displayName || 'MICHAEL CHEN'}
              </Text>
              <Text style={styles.luxuryBackCompany}>
                {profile.company || 'Luxury Holdings Group'}
              </Text>
            </View>

            <View style={styles.luxuryContact}>
              <View style={styles.luxuryContactItem}>
                <View style={styles.luxuryContactIcon}>
                  <Ionicons name="call" size={14} color={primaryColor} />
                </View>
                <Text style={styles.luxuryContactText}>
                  {profile.contactPhone || '+27 123 456 7890'}
                </Text>
              </View>
              <View style={styles.luxuryContactItem}>
                <View style={styles.luxuryContactIcon}>
                  <Ionicons name="mail" size={14} color={primaryColor} />
                </View>
                <Text style={styles.luxuryContactText}>
                  {profile.contactEmail || 'michael@luxurygroup.com'}
                </Text>
              </View>
              <View style={styles.luxuryContactItem}>
                <View style={styles.luxuryContactIcon}>
                  <Ionicons name="globe" size={14} color={primaryColor} />
                </View>
                <Text style={styles.luxuryContactText}>
                  {profile.website || 'www.luxurygroup.com'}
                </Text>
              </View>
              <View style={styles.luxuryContactItem}>
                <View style={styles.luxuryContactIcon}>
                  <Ionicons name="location" size={14} color={primaryColor} />
                </View>
                <Text style={styles.luxuryContactText}>
                  {profile.location || 'Johannesburg, South Africa'}
                </Text>
              </View>
            </View>

            <View style={styles.socialRow}>
              <View style={styles.socialIconLuxury}>
                <Ionicons name="logo-linkedin" size={16} color={primaryColor} />
              </View>
              <View style={styles.socialIconLuxury}>
                <Ionicons name="logo-twitter" size={16} color={primaryColor} />
              </View>
              <View style={styles.socialIconLuxury}>
                <Ionicons name="logo-instagram" size={16} color={primaryColor} />
              </View>
            </View>
          </View>

          {/* Right Side - QR Code */}
          <View style={styles.backRightLuxury}>
            <View style={styles.luxuryQrWrapper}>
              <ProfileShareCode
                profile={profile}
                primaryColor={primaryColor}
                variant="luxury"
                size="compact"
                showMeta={false}
                showHeader={false}
                frameless
              />
            </View>
            <Text style={styles.luxuryQrLabel}>Exclusive Access</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

// Export all card designs
export default {
  CorporateCard,
  GeometricCard,
  MinimalistCard,
  LuxuryCard,
};
