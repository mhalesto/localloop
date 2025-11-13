/**
 * Extended Professional Business Card Designs
 * Additional modern business card templates with front and back views
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

// Tech Modern Design
export const TechCard = ({
  profile,
  side = 'front',
  primaryColor = '#00D4FF',
  cardWidth,
}) => {
  const { width: resolvedWidth, height: resolvedHeight } = resolveCardDimensions(cardWidth);

  const styles = StyleSheet.create({
    container: {
      width: resolvedWidth,
      height: resolvedHeight,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
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
    circuitPattern: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      opacity: 0.03,
    },
    circuitLine1: {
      position: 'absolute',
      height: 1,
      backgroundColor: primaryColor,
      width: '100%',
      top: '30%',
    },
    circuitLine2: {
      position: 'absolute',
      width: 1,
      backgroundColor: primaryColor,
      height: '100%',
      left: '70%',
    },
    circuitDot: {
      position: 'absolute',
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: primaryColor,
      top: '30%',
      left: '70%',
    },
    techHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    avatarContainer: {
      width: 50,
      height: 50,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: primaryColor,
      padding: 2,
      overflow: 'hidden',
    },
    avatar: {
      width: '100%',
      height: '100%',
      borderRadius: 6,
    },
    techInfo: {
      flex: 1,
    },
    techName: {
      fontSize: 18,
      fontWeight: '700',
      color: '#FFF',
      marginBottom: 2,
    },
    techRole: {
      fontSize: 12,
      fontWeight: '500',
      color: primaryColor,
    },
    techCompany: {
      fontSize: 11,
      fontWeight: '400',
      color: '#FFF',
      opacity: 0.7,
    },
    codeBlock: {
      backgroundColor: 'rgba(0,212,255,0.1)',
      borderLeftWidth: 3,
      borderLeftColor: primaryColor,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 4,
    },
    codeText: {
      fontFamily: 'monospace',
      fontSize: 10,
      color: primaryColor,
      lineHeight: 14,
    },
    techFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    techContact: {
      fontSize: 10,
      color: '#FFF',
      opacity: 0.8,
    },
    version: {
      fontSize: 9,
      color: primaryColor,
      fontFamily: 'monospace',
    },
    // Back Side
    backContainer: {
      flex: 1,
      backgroundColor: '#0A0E27',
      flexDirection: 'row',
      padding: 16,
    },
    backLeftTech: {
      flex: 1.2,
      paddingRight: 15,
      justifyContent: 'flex-start',
      paddingTop: 10,
    },
    backRightTech: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    terminalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 10,
    },
    terminalDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    terminalContent: {
      gap: 8,
    },
    terminalLine: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 2,
    },
    terminalPrompt: {
      fontSize: 10,
      color: primaryColor,
      fontFamily: 'monospace',
      marginRight: 6,
    },
    terminalText: {
      fontSize: 10,
      color: '#FFF',
      fontFamily: 'monospace',
    },
    terminalSection: {
      marginBottom: 10,
    },
    qrTerminal: {
      alignItems: 'center',
    },
    qrBox: {
      backgroundColor: '#FFF',
      padding: 10,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: primaryColor,
    },
    scanCommand: {
      fontSize: 9,
      color: '#00FF00',
      fontFamily: 'monospace',
      marginTop: 8,
      textAlign: 'center',
    },
  });

  if (side === 'front') {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0A0E27', '#1A1F3A']}
          style={styles.gradient}
        >
          <View style={styles.frontContainer}>
            <View style={styles.circuitPattern}>
              <View style={styles.circuitLine1} />
              <View style={styles.circuitLine2} />
              <View style={styles.circuitDot} />
            </View>

            <View style={styles.techHeader}>
              <View style={styles.avatarContainer}>
                {profile.profilePhoto ? (
                  <Image source={{ uri: profile.profilePhoto }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: primaryColor + '20', justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: primaryColor }}>
                      {profile.displayName ? profile.displayName.charAt(0).toUpperCase() : 'A'}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.techInfo}>
                <Text style={styles.techName}>
                  {profile.displayName || 'Alex Kumar'}
                </Text>
                <Text style={styles.techRole}>
                  {profile.profession || 'Full Stack Developer'}
                </Text>
                <Text style={styles.techCompany}>
                  {profile.company || 'Tech Innovations Inc.'}
                </Text>
              </View>
            </View>

            <View style={styles.codeBlock}>
              <Text style={styles.codeText}>
                {'const developer = {\n  skills: ["React", "Node", "Python"],\n  available: true\n}'}
              </Text>
            </View>

            <View style={styles.techFooter}>
              <Text style={styles.techContact}>
                {profile.contactEmail || 'alex@techinnovations.io'}
              </Text>
              <Text style={styles.version}>v2.0.24</Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.backContainer}>
        {/* Left Side - Terminal Info */}
        <View style={styles.backLeftTech}>
          <View style={styles.terminalHeader}>
            <View style={[styles.terminalDot, { backgroundColor: '#FF5F56' }]} />
            <View style={[styles.terminalDot, { backgroundColor: '#FFBD2E' }]} />
            <View style={[styles.terminalDot, { backgroundColor: '#27C93F' }]} />
          </View>

          <View style={styles.terminalContent}>
            <View style={styles.terminalSection}>
              <View style={styles.terminalLine}>
                <Text style={styles.terminalPrompt}>$</Text>
                <Text style={styles.terminalText}>whoami</Text>
              </View>
              <View style={styles.terminalLine}>
                <Text style={[styles.terminalText, { color: primaryColor }]}>
                  {profile.username || 'alexkumar'}
                </Text>
              </View>
            </View>

            <View style={styles.terminalSection}>
              <View style={styles.terminalLine}>
                <Text style={styles.terminalPrompt}>$</Text>
                <Text style={styles.terminalText}>contact --info</Text>
              </View>
              <View style={styles.terminalLine}>
                <Text style={styles.terminalText}>
                  📧 {profile.contactEmail || 'alex@tech.io'}
                </Text>
              </View>
              <View style={styles.terminalLine}>
                <Text style={styles.terminalText}>
                  📱 {profile.contactPhone || '+27 123 456 789'}
                </Text>
              </View>
              <View style={styles.terminalLine}>
                <Text style={styles.terminalText}>
                  🌐 {profile.website || 'github.com/alexkumar'}
                </Text>
              </View>
              <View style={styles.terminalLine}>
                <Text style={styles.terminalText}>
                  📍 {profile.location || 'Silicon Valley, CA'}
                </Text>
              </View>
            </View>

            <View style={styles.terminalSection}>
              <View style={styles.terminalLine}>
                <Text style={styles.terminalPrompt}>$</Text>
                <Text style={styles.terminalText}>skills --list</Text>
              </View>
              <View style={styles.terminalLine}>
                <Text style={[styles.terminalText, { fontSize: 10 }]}>
                  ['React', 'Node.js', 'Python', 'AWS']
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Right Side - QR Code */}
        <View style={styles.backRightTech}>
          <View style={styles.qrTerminal}>
            <View style={styles.qrBox}>
              <ProfileShareCode
                profile={profile}
                primaryColor="#0A0E27"
                variant="minimal"
                size="compact"
                showMeta={false}
                showHeader={false}
                frameless
              />
            </View>
            <Text style={styles.scanCommand}>$ scan --connect</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

// Creative Studio Design
export const CreativeCard = ({
  profile,
  side = 'front',
  primaryColor = '#FF006E',
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
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
      overflow: 'hidden',
    },
    // Front Side
    frontContainer: {
      flex: 1,
      position: 'relative',
    },
    artisticShapes: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    shape1: {
      position: 'absolute',
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: primaryColor,
      opacity: 0.1,
      top: -30,
      right: -30,
    },
    shape2: {
      position: 'absolute',
      width: 80,
      height: 80,
      backgroundColor: '#FFBE0B',
      opacity: 0.1,
      bottom: -20,
      left: -20,
      transform: [{ rotate: '45deg' }],
    },
    shape3: {
      position: 'absolute',
      width: 60,
      height: 120,
      backgroundColor: '#3A86FF',
      opacity: 0.08,
      top: '40%',
      right: '10%',
      borderRadius: 30,
      transform: [{ rotate: '-20deg' }],
    },
    creativeContent: {
      flex: 1,
      padding: 24,
      justifyContent: 'center',
    },
    creativeLogo: {
      fontSize: 32,
      marginBottom: 20,
    },
    creativeName: {
      fontSize: 24,
      fontWeight: '800',
      color: '#1A1A1A',
      marginBottom: 4,
    },
    creativeTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: primaryColor,
      marginBottom: 2,
    },
    creativeCompany: {
      fontSize: 12,
      fontWeight: '400',
      color: '#666',
    },
    tagline: {
      fontSize: 11,
      fontStyle: 'italic',
      color: '#999',
      marginTop: 12,
    },
    // Back Side
    backContainer: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      flexDirection: 'row',
      padding: 16,
      position: 'relative',
      overflow: 'hidden',
    },
    backPattern: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    patternAccent: {
      position: 'absolute',
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: primaryColor,
      opacity: 0.05,
      top: -100,
      left: -100,
    },
    backLeftCreative: {
      flex: 1.2,
      paddingRight: 15,
      justifyContent: 'flex-start',
      paddingTop: 10,
    },
    backRightCreative: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    creativeBackHeader: {
      marginBottom: 12,
    },
    creativeBackName: {
      fontSize: 16,
      fontWeight: '700',
      color: primaryColor,
      marginBottom: 2,
    },
    creativeBackCompany: {
      fontSize: 11,
      fontWeight: '400',
      color: '#666',
    },
    boxHeader: {
      fontSize: 10,
      fontWeight: '700',
      color: primaryColor,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 12,
    },
    creativeServices: {
      gap: 6,
      marginBottom: 12,
    },
    serviceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    serviceDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: primaryColor,
    },
    serviceText: {
      fontSize: 11,
      color: '#333',
    },
    contactCreative: {
      gap: 10,
    },
    contactRowCreative: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    contactTextCreative: {
      fontSize: 11,
      color: '#333',
      flex: 1,
    },
    creativeQrContainer: {
      backgroundColor: primaryColor,
      padding: 16,
      borderRadius: 12,
    },
    creativeQrInner: {
      backgroundColor: '#FFF',
      padding: 8,
      borderRadius: 8,
    },
    creativeQrLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: '#FFF',
      textAlign: 'center',
      marginTop: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    socialRowCreative: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: '#F0F0F0',
    },
    socialBubble: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: primaryColor + '10',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

  if (side === 'front') {
    return (
      <View style={styles.container}>
        <View style={styles.frontContainer}>
          <View style={styles.artisticShapes}>
            <View style={styles.shape1} />
            <View style={styles.shape2} />
            <View style={styles.shape3} />
          </View>

          <View style={styles.creativeContent}>
            <Text style={styles.creativeLogo}>🎨</Text>
            <Text style={styles.creativeName}>
              {profile.displayName || 'Lisa Martinez'}
            </Text>
            <Text style={styles.creativeTitle}>
              {profile.profession || 'Art Director'}
            </Text>
            <Text style={styles.creativeCompany}>
              {profile.company || 'Creative Studios'}
            </Text>
            <Text style={styles.tagline}>
              "Bringing ideas to life"
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.backContainer}>
        <View style={styles.backPattern}>
          <View style={styles.patternAccent} />
        </View>

        {/* Left Side - Information */}
        <View style={styles.backLeftCreative}>
          <View style={styles.creativeBackHeader}>
            <Text style={styles.creativeBackName}>
              {profile.displayName || 'Lisa Martinez'}
            </Text>
            <Text style={styles.creativeBackCompany}>
              {profile.company || 'Creative Studios'}
            </Text>
          </View>

          <View>
            <Text style={styles.boxHeader}>Our Services</Text>
            <View style={styles.creativeServices}>
              <View style={styles.serviceRow}>
                <View style={styles.serviceDot} />
                <Text style={styles.serviceText}>Brand Design</Text>
              </View>
              <View style={styles.serviceRow}>
                <View style={styles.serviceDot} />
                <Text style={styles.serviceText}>Visual Identity</Text>
              </View>
              <View style={styles.serviceRow}>
                <View style={styles.serviceDot} />
                <Text style={styles.serviceText}>Motion Graphics</Text>
              </View>
              <View style={styles.serviceRow}>
                <View style={styles.serviceDot} />
                <Text style={styles.serviceText}>Creative Consulting</Text>
              </View>
            </View>
          </View>

          <View style={styles.contactCreative}>
            <View style={styles.contactRowCreative}>
              <Ionicons name="mail-outline" size={14} color={primaryColor} />
              <Text style={styles.contactTextCreative}>
                {profile.contactEmail || 'hello@creativestudios.com'}
              </Text>
            </View>
            <View style={styles.contactRowCreative}>
              <Ionicons name="call-outline" size={14} color={primaryColor} />
              <Text style={styles.contactTextCreative}>
                {profile.contactPhone || '+27 123 456 7890'}
              </Text>
            </View>
            <View style={styles.contactRowCreative}>
              <Ionicons name="globe-outline" size={14} color={primaryColor} />
              <Text style={styles.contactTextCreative}>
                {profile.website || 'www.creativestudios.com'}
              </Text>
            </View>
          </View>

          <View style={styles.socialRowCreative}>
            <View style={styles.socialBubble}>
              <Ionicons name="logo-instagram" size={16} color={primaryColor} />
            </View>
            <View style={styles.socialBubble}>
              <Ionicons name="logo-dribbble" size={16} color={primaryColor} />
            </View>
            <View style={styles.socialBubble}>
              <Ionicons name="logo-behance" size={16} color={primaryColor} />
            </View>
          </View>
        </View>

        {/* Right Side - QR Code */}
        <View style={styles.backRightCreative}>
          <View style={styles.creativeQrContainer}>
            <View style={styles.creativeQrInner}>
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
          </View>
          <Text style={[styles.creativeQrLabel, { color: primaryColor }]}>Get Creative</Text>
        </View>
      </View>
    </View>
  );
};

// Elegant Classic Design
export const ElegantCard = ({
  profile,
  side = 'front',
  primaryColor = '#8B5A8C',
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
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
      overflow: 'hidden',
    },
    // Front Side
    frontContainer: {
      flex: 1,
      position: 'relative',
    },
    elegantBorder: {
      position: 'absolute',
      top: 12,
      left: 12,
      right: 12,
      bottom: 12,
      borderWidth: 1,
      borderColor: primaryColor,
      borderRadius: 12,
      opacity: 0.3,
    },
    innerBorder: {
      position: 'absolute',
      top: 16,
      left: 16,
      right: 16,
      bottom: 16,
      borderWidth: 1,
      borderColor: primaryColor,
      borderRadius: 10,
      opacity: 0.15,
    },
    floralAccent: {
      position: 'absolute',
      top: 24,
      right: 24,
      fontSize: 20,
      opacity: 0.2,
    },
    elegantContent: {
      flex: 1,
      padding: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    elegantMonogram: {
      width: 50,
      height: 50,
      borderRadius: 25,
      borderWidth: 1,
      borderColor: primaryColor,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    monogramLetter: {
      fontSize: 22,
      fontWeight: '300',
      color: primaryColor,
    },
    elegantNameBlock: {
      alignItems: 'center',
    },
    elegantDisplayName: {
      fontSize: 18,
      fontWeight: '400',
      color: '#2C2C2C',
      letterSpacing: 1.5,
      marginBottom: 6,
    },
    elegantProfession: {
      fontSize: 11,
      fontWeight: '300',
      color: primaryColor,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    elegantDivider: {
      width: 30,
      height: 1,
      backgroundColor: primaryColor,
      opacity: 0.3,
      marginVertical: 8,
    },
    elegantCompany: {
      fontSize: 10,
      fontWeight: '400',
      color: '#666',
      letterSpacing: 1,
    },
    // Back Side
    backContainer: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      flexDirection: 'row',
      padding: 16,
      position: 'relative',
    },
    backFloralPattern: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      fontSize: 60,
      opacity: 0.05,
    },
    backLeftElegant: {
      flex: 1.2,
      paddingRight: 20,
      justifyContent: 'center',
    },
    backRightElegant: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    elegantBackHeader: {
      marginBottom: 20,
    },
    elegantBackName: {
      fontSize: 18,
      fontWeight: '600',
      color: primaryColor,
      marginBottom: 4,
    },
    elegantBackCompany: {
      fontSize: 12,
      fontWeight: '400',
      color: '#666',
    },
    contactElegant: {
      gap: 12,
    },
    elegantContactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    elegantContactIcon: {
      width: 20,
    },
    elegantContactText: {
      fontSize: 11,
      fontWeight: '400',
      color: '#444',
      flex: 1,
    },
    elegantSocial: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      gap: 12,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: 'rgba(139,90,140,0.15)',
      marginTop: 16,
    },
    elegantSocialIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(139,90,140,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    elegantQrBox: {
      backgroundColor: '#FFF',
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: primaryColor,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    elegantQrLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: primaryColor,
      textAlign: 'center',
      marginTop: 10,
      letterSpacing: 0.5,
    },
  });

  if (side === 'front') {
    return (
      <View style={styles.container}>
        <View style={styles.frontContainer}>
          <View style={styles.elegantBorder} />
          <View style={styles.innerBorder} />
          <Text style={styles.floralAccent}>❀</Text>

          <View style={styles.elegantContent}>
            <View style={styles.elegantMonogram}>
              <Text style={styles.monogramLetter}>
                {profile.displayName ? profile.displayName.charAt(0).toUpperCase() : 'S'}
              </Text>
            </View>

            <View style={styles.elegantNameBlock}>
              <Text style={styles.elegantDisplayName}>
                {profile.displayName || 'Sophia Anderson'}
              </Text>
              <Text style={styles.elegantProfession}>
                {profile.profession || 'Interior Designer'}
              </Text>
              <View style={styles.elegantDivider} />
              <Text style={styles.elegantCompany}>
                {profile.company || 'Anderson Design Studio'}
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
        <Text style={styles.backFloralPattern}>❀</Text>

        {/* Left Side - Information */}
        <View style={styles.backLeftElegant}>
          <View style={styles.elegantBackHeader}>
            <Text style={styles.elegantBackName}>
              {profile.displayName || 'Sophia Anderson'}
            </Text>
            <Text style={styles.elegantBackCompany}>
              {profile.company || 'Anderson Design Studio'}
            </Text>
          </View>

          <View style={styles.contactElegant}>
            <View style={styles.elegantContactRow}>
              <View style={styles.elegantContactIcon}>
                <Ionicons name="call-outline" size={14} color={primaryColor} />
              </View>
              <Text style={styles.elegantContactText}>
                {profile.contactPhone || '+27 123 456 7890'}
              </Text>
            </View>
            <View style={styles.elegantContactRow}>
              <View style={styles.elegantContactIcon}>
                <Ionicons name="mail-outline" size={14} color={primaryColor} />
              </View>
              <Text style={styles.elegantContactText}>
                {profile.contactEmail || 'sophia@andersondesign.com'}
              </Text>
            </View>
            <View style={styles.elegantContactRow}>
              <View style={styles.elegantContactIcon}>
                <Ionicons name="globe-outline" size={14} color={primaryColor} />
              </View>
              <Text style={styles.elegantContactText}>
                {profile.website || 'www.andersondesign.com'}
              </Text>
            </View>
            <View style={styles.elegantContactRow}>
              <View style={styles.elegantContactIcon}>
                <Ionicons name="location-outline" size={14} color={primaryColor} />
              </View>
              <Text style={styles.elegantContactText}>
                {profile.location || 'Cape Town, South Africa'}
              </Text>
            </View>
          </View>

          <View style={styles.elegantSocial}>
            <View style={styles.elegantSocialIcon}>
              <Ionicons name="logo-pinterest" size={14} color={primaryColor} />
            </View>
            <View style={styles.elegantSocialIcon}>
              <Ionicons name="logo-instagram" size={14} color={primaryColor} />
            </View>
            <View style={styles.elegantSocialIcon}>
              <Ionicons name="logo-linkedin" size={14} color={primaryColor} />
            </View>
          </View>
        </View>

        {/* Right Side - QR Code */}
        <View style={styles.backRightElegant}>
          <View style={styles.elegantQrBox}>
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
          <Text style={styles.elegantQrLabel}>Scan to Connect</Text>
        </View>
      </View>
    </View>
  );
};

// Gradient Bold Design
export const GradientBoldCard = ({
  profile,
  side = 'front',
  primaryColor = '#667EEA',
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
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 6,
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
    glassOverlay: {
      position: 'absolute',
      top: '40%',
      left: -50,
      right: -50,
      height: 100,
      backgroundColor: 'rgba(255,255,255,0.1)',
      transform: [{ rotate: '-10deg' }],
    },
    boldHeader: {
      gap: 12,
    },
    boldName: {
      fontSize: 28,
      fontWeight: '900',
      color: '#FFF',
      letterSpacing: 0.5,
    },
    boldTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFF',
      opacity: 0.9,
    },
    boldCompany: {
      fontSize: 12,
      fontWeight: '400',
      color: '#FFF',
      opacity: 0.7,
    },
    skillPills: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    pill: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    pillText: {
      fontSize: 10,
      fontWeight: '600',
      color: '#FFF',
    },
    gradientFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    gradientContact: {
      fontSize: 11,
      color: '#FFF',
      opacity: 0.9,
    },
    logoWhite: {
      width: 24,
      height: 24,
      opacity: 0.8,
    },
    // Back Side
    backContainer: {
      flex: 1,
      padding: 16,
      flexDirection: 'row',
      position: 'relative',
    },
    wavePattern: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 150,
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderTopLeftRadius: 100,
      borderTopRightRadius: 100,
    },
    backLeftGradient: {
      flex: 1.2,
      paddingRight: 20,
      justifyContent: 'center',
      zIndex: 10,
    },
    backRightGradient: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    gradientBackHeader: {
      marginBottom: 20,
    },
    gradientBackName: {
      fontSize: 18,
      fontWeight: '700',
      color: '#FFF',
      marginBottom: 4,
    },
    gradientBackCompany: {
      fontSize: 12,
      fontWeight: '400',
      color: 'rgba(255,255,255,0.8)',
    },
    gradientContactInfo: {
      gap: 12,
    },
    gradientContactItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    gradientContactIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    gradientContactText: {
      fontSize: 11,
      fontWeight: '400',
      color: '#FFF',
      flex: 1,
    },
    qrGradient: {
      padding: 16,
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderRadius: 12,
    },
    connectText: {
      fontSize: 9,
      fontWeight: '700',
      color: '#FFF',
      letterSpacing: 1,
      marginTop: 8,
      textAlign: 'center',
      textTransform: 'uppercase',
    },
  });

  if (side === 'front') {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[primaryColor, '#764BA2']}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.frontContainer}>
            <View style={styles.glassOverlay} />

            <View style={styles.boldHeader}>
              <Text style={styles.boldName}>
                {profile.displayName || 'David Park'}
              </Text>
              <Text style={styles.boldTitle}>
                {profile.profession || 'Product Manager'}
              </Text>
              <Text style={styles.boldCompany}>
                {profile.company || 'Innovation Labs'}
              </Text>
            </View>

            <View style={styles.skillPills}>
              <View style={styles.pill}>
                <Text style={styles.pillText}>Strategy</Text>
              </View>
              <View style={styles.pill}>
                <Text style={styles.pillText}>Leadership</Text>
              </View>
              <View style={styles.pill}>
                <Text style={styles.pillText}>Innovation</Text>
              </View>
            </View>

            <View style={styles.gradientFooter}>
              <Text style={styles.gradientContact}>
                {profile.contactEmail || 'david@innovationlabs.io'}
              </Text>
              <Image
                source={require('../assets/icon.png')}
                style={styles.logoWhite}
                resizeMode="contain"
              />
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#764BA2', primaryColor]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.backContainer}>
          <View style={styles.wavePattern} />

          {/* Left Side - Information */}
          <View style={styles.backLeftGradient}>
            <View style={styles.gradientBackHeader}>
              <Text style={styles.gradientBackName}>
                {profile.displayName || 'David Park'}
              </Text>
              <Text style={styles.gradientBackCompany}>
                {profile.company || 'Innovation Labs'}
              </Text>
            </View>

            <View style={styles.gradientContactInfo}>
              <View style={styles.gradientContactItem}>
                <View style={styles.gradientContactIcon}>
                  <Ionicons name="call" size={16} color="#FFF" />
                </View>
                <Text style={styles.gradientContactText}>
                  {profile.contactPhone || '+27 123 456 7890'}
                </Text>
              </View>
              <View style={styles.gradientContactItem}>
                <View style={styles.gradientContactIcon}>
                  <Ionicons name="mail" size={16} color="#FFF" />
                </View>
                <Text style={styles.gradientContactText}>
                  {profile.contactEmail || 'david@innovationlabs.io'}
                </Text>
              </View>
              <View style={styles.gradientContactItem}>
                <View style={styles.gradientContactIcon}>
                  <Ionicons name="globe" size={16} color="#FFF" />
                </View>
                <Text style={styles.gradientContactText}>
                  {profile.website || 'www.davidpark.io'}
                </Text>
              </View>
              <View style={styles.gradientContactItem}>
                <View style={styles.gradientContactIcon}>
                  <Ionicons name="location" size={16} color="#FFF" />
                </View>
                <Text style={styles.gradientContactText}>
                  {profile.location || 'Johannesburg, SA'}
                </Text>
              </View>
            </View>
          </View>

          {/* Right Side - QR Code */}
          <View style={styles.backRightGradient}>
            <View style={styles.qrGradient}>
              <ProfileShareCode
                profile={profile}
                primaryColor="#764BA2"
                variant="minimal"
                size="compact"
                showMeta={false}
                showHeader={false}
                frameless
              />
            </View>
            <Text style={styles.connectText}>Connect</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

// Export all extended card designs
export default {
  TechCard,
  CreativeCard,
  ElegantCard,
  GradientBoldCard,
};
