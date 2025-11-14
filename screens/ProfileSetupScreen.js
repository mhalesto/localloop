import React, { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { Switch } from 'react-native';
import ScreenLayout from '../components/ScreenLayout';
import InterestsSelectorModal from '../components/InterestsSelectorModal';
import LinksManagerModal from '../components/LinksManagerModal';
import PronounsPicker from '../components/PronounsPicker';
import ShareLocationModal from '../components/ShareLocationModal';
import { ALL_INTERESTS, LINK_TYPES, DEFAULT_PRIVACY_SETTINGS } from '../constants/profileConstants';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import {
  validateUsernameFormat,
  isUsernameAvailable,
  validateAndReserveUsername,
} from '../services/usernameService';
import { updateUserProfile } from '../services/userProfileService';
import { uploadProfilePhotoToStorage } from '../services/profilePhotoService';

export default function ProfileSetupScreen({ navigation, route }) {
  const { themeColors, accentPreset, userProfile, updateUserProfile: updateLocalProfile, reloadProfile } = useSettings();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const isEditing = route.params?.isEditing ?? false;

  console.log('[ProfileSetup] Component mounted/rendered, isEditing:', isEditing, 'userProfile.interests:', userProfile?.interests?.length);

  const [username, setUsername] = useState(userProfile?.username || '');
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [profilePhoto, setProfilePhoto] = useState(userProfile?.profilePhoto || '');
  const [localPhotoUri, setLocalPhotoUri] = useState(null); // Local URI for preview before upload
  const [country, setCountry] = useState(userProfile?.country || '');
  const [province, setProvince] = useState(userProfile?.province || '');
  const [city, setCity] = useState(userProfile?.city || '');
  const [usernameError, setUsernameError] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameValid, setIsUsernameValid] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(isEditing); // Loading state for edit mode

  // New profile fields
  const [pronouns, setPronouns] = useState(userProfile?.pronouns || '');
  const [profession, setProfession] = useState(userProfile?.profession || '');
  const [company, setCompany] = useState(userProfile?.company || '');
  const [interests, setInterests] = useState(userProfile?.interests || []);
  const [links, setLinks] = useState(userProfile?.links || []);
  const [category, setCategory] = useState(userProfile?.category || '');
  const [contactEmail, setContactEmail] = useState(userProfile?.contactEmail || '');
  const [channelName, setChannelName] = useState(userProfile?.channelName || '');
  const [channelMemberCount, setChannelMemberCount] = useState(userProfile?.channelMemberCount?.toString() || '');

  // New CV/Portfolio fields
  const [education, setEducation] = useState(userProfile?.education || '');
  const [skills, setSkills] = useState(userProfile?.skills || '');
  const [yearsOfExperience, setYearsOfExperience] = useState(userProfile?.yearsOfExperience?.toString() || '');
  const [availableForWork, setAvailableForWork] = useState(userProfile?.availableForWork ?? false);

  // Privacy settings
  const [showPronouns, setShowPronouns] = useState(userProfile?.showPronouns ?? DEFAULT_PRIVACY_SETTINGS.showPronouns);
  const [showProfession, setShowProfession] = useState(userProfile?.showProfession ?? DEFAULT_PRIVACY_SETTINGS.showProfession);
  const [showCompany, setShowCompany] = useState(userProfile?.showCompany ?? DEFAULT_PRIVACY_SETTINGS.showCompany);
  const [showInterests, setShowInterests] = useState(userProfile?.showInterests ?? DEFAULT_PRIVACY_SETTINGS.showInterests);
  const [showLinks, setShowLinks] = useState(userProfile?.showLinks ?? DEFAULT_PRIVACY_SETTINGS.showLinks);
  const [showCategory, setShowCategory] = useState(userProfile?.showCategory ?? DEFAULT_PRIVACY_SETTINGS.showCategory);
  const [showContactEmail, setShowContactEmail] = useState(userProfile?.showContactEmail ?? DEFAULT_PRIVACY_SETTINGS.showContactEmail);
  const [showChannel, setShowChannel] = useState(userProfile?.showChannel ?? DEFAULT_PRIVACY_SETTINGS.showChannel);

  // Modal states
  const [pronounsPickerVisible, setPronounsPickerVisible] = useState(false);
  const [interestsModalVisible, setInterestsModalVisible] = useState(false);
  const [linksModalVisible, setLinksModalVisible] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);

  // Handle location modal save - ShareLocationModal callback signature
  const handleLocationSave = (cityName, meta) => {
    console.log('[ProfileSetup] Location saved:', {
      city: cityName,
      country: meta.country,
      province: meta.province,
    });
    setCity(cityName);
    setCountry(meta.country || '');
    setProvince(meta.province || '');
  };

  // Get location display text
  const getLocationDisplayText = () => {
    if (!country) return 'Select your location...';
    const parts = [country]; // ShareLocationModal returns full country name
    if (province) parts.push(province);
    if (city) parts.push(city);
    return parts.join(', ');
  };

  const primaryColor = accentPreset?.buttonBackground || themeColors.primary;

  // Validate username as user types
  useEffect(() => {
    const validateUsername = async () => {
      if (!username) {
        setUsernameError('');
        setIsUsernameValid(false);
        return;
      }

      // Format validation
      const formatValidation = validateUsernameFormat(username);
      if (!formatValidation.valid) {
        setUsernameError(formatValidation.error);
        setIsUsernameValid(false);
        return;
      }

      // Skip availability check if username hasn't changed
      if (isEditing && username.toLowerCase() === userProfile?.username?.toLowerCase()) {
        setUsernameError('');
        setIsUsernameValid(true);
        return;
      }

      // Check availability
      setIsCheckingUsername(true);
      try {
        const available = await isUsernameAvailable(username);
        if (available) {
          setUsernameError('');
          setIsUsernameValid(true);
        } else {
          setUsernameError('Username is already taken');
          setIsUsernameValid(false);
        }
      } catch (error) {
        setUsernameError('Error checking username');
        setIsUsernameValid(false);
      } finally {
        setIsCheckingUsername(false);
      }
    };

    const debounce = setTimeout(validateUsername, 500);
    return () => clearTimeout(debounce);
  }, [username, isEditing, userProfile?.username]);

  // Reload profile data when screen is focused (for edit mode)
  useFocusEffect(
    useCallback(() => {
      if (isEditing) {
        setIsLoadingProfile(true);
        console.log('[ProfileSetup] Screen focused, reloading profile data');
        reloadProfile().then(() => {
          console.log('[ProfileSetup] Profile reloaded on focus');
        }).catch(error => {
          console.error('[ProfileSetup] Error reloading profile on focus:', error);
          setIsLoadingProfile(false);
        });
      }
    }, [isEditing, reloadProfile])
  );

  // Sync form fields with userProfile when editing
  useEffect(() => {
    console.log('[ProfileSetup] useEffect triggered - isEditing:', isEditing, 'userProfile exists:', !!userProfile);

    if (isEditing && userProfile) {
      console.log('[ProfileSetup] Syncing form fields with userProfile:', {
        interests: userProfile.interests?.length,
        interestsArray: userProfile.interests,
        links: userProfile.links?.length,
        pronouns: userProfile.pronouns,
        profession: userProfile.profession,
      });

      setUsername(userProfile.username || '');
      setDisplayName(userProfile.displayName || '');
      setBio(userProfile.bio || '');
      setProfilePhoto(userProfile.profilePhoto || '');
      setCountry(userProfile.country || '');
      setProvince(userProfile.province || '');
      setCity(userProfile.city || '');
      setPronouns(userProfile.pronouns || '');
      setProfession(userProfile.profession || '');
      setCompany(userProfile.company || '');
      const loadedInterests = userProfile.interests || [];
      const loadedLinks = userProfile.links || [];
      console.log('[ProfileSetup] ABOUT TO SET INTERESTS:', loadedInterests.length, loadedInterests);
      console.log('[ProfileSetup] Setting links:', loadedLinks.length);
      setInterests(loadedInterests);
      setLinks(loadedLinks);
      setCategory(userProfile.category || '');
      setContactEmail(userProfile.contactEmail || '');
      setChannelName(userProfile.channelName || '');
      setChannelMemberCount(userProfile.channelMemberCount?.toString() || '');
      // CV/Portfolio fields
      setEducation(userProfile.education || '');
      setSkills(userProfile.skills || '');
      setYearsOfExperience(userProfile.yearsOfExperience?.toString() || '');
      setAvailableForWork(userProfile.availableForWork ?? false);

      // Privacy settings
      setShowPronouns(userProfile.showPronouns ?? DEFAULT_PRIVACY_SETTINGS.showPronouns);
      setShowProfession(userProfile.showProfession ?? DEFAULT_PRIVACY_SETTINGS.showProfession);
      setShowCompany(userProfile.showCompany ?? DEFAULT_PRIVACY_SETTINGS.showCompany);
      setShowInterests(userProfile.showInterests ?? DEFAULT_PRIVACY_SETTINGS.showInterests);
      setShowLinks(userProfile.showLinks ?? DEFAULT_PRIVACY_SETTINGS.showLinks);
      setShowCategory(userProfile.showCategory ?? DEFAULT_PRIVACY_SETTINGS.showCategory);
      setShowContactEmail(userProfile.showContactEmail ?? DEFAULT_PRIVACY_SETTINGS.showContactEmail);
      setShowChannel(userProfile.showChannel ?? DEFAULT_PRIVACY_SETTINGS.showChannel);

      // Done loading
      setIsLoadingProfile(false);
      console.log('[ProfileSetup] Form fields synced, loading complete. Interests set to:', loadedInterests.length);
    } else {
      console.log('[ProfileSetup] useEffect skipped - conditions not met');
    }
  }, [isEditing, userProfile]);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert(
          'Permission Required',
          'Please allow access to your photo library to upload a profile picture.',
          [],
          { type: 'warning' }
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // Store local URI for preview, will upload to Firebase Storage when saving
        setLocalPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('[ProfileSetup] Error picking image:', error);
      showAlert('Error', 'Failed to select image. Please try again.', [], { type: 'error' });
    }
  };

  const handleSave = async () => {
    // Validation
    if (!username) {
      showAlert('Username Required', 'Please enter a username.', [], { type: 'warning' });
      return;
    }

    if (!isUsernameValid) {
      showAlert('Invalid Username', usernameError || 'Please choose a valid username.', [], { type: 'warning' });
      return;
    }

    if (!displayName) {
      showAlert('Display Name Required', 'Please enter a display name.', [], { type: 'warning' });
      return;
    }

    setIsSaving(true);

    try {
      // Upload profile photo to Firebase Storage if a new one was selected
      let photoUrl = profilePhoto; // Keep existing URL if no new photo
      if (localPhotoUri) {
        console.log('[ProfileSetup] Uploading new profile photo to Firebase Storage...');
        photoUrl = await uploadProfilePhotoToStorage(user.uid, localPhotoUri);
        console.log('[ProfileSetup] Photo uploaded successfully:', photoUrl);
      }

      // Reserve username in Firestore
      await validateAndReserveUsername(username, user.uid, userProfile?.username);

      // Update user profile in Firestore
      const profileData = {
        username: username.toLowerCase(),
        displayName,
        bio: bio || '',
        profilePhoto: photoUrl || '',
        isPublicProfile: true,
        country: country || '',
        province: province || '',
        city: city || '',
        countryName: country || '', // ShareLocationModal returns full country name
        followersCount: userProfile?.followersCount || 0,
        followingCount: userProfile?.followingCount || 0,
        publicPostsCount: userProfile?.publicPostsCount || 0,
        allowFollows: true,
        showFollowers: true,
        showFollowing: true,
        // New professional profile fields
        pronouns: pronouns || '',
        profession: profession || '',
        company: company || '',
        interests: interests || [],
        links: links || [],
        category: category || '',
        contactEmail: contactEmail || '',
        channelName: channelName || '',
        channelMemberCount: channelMemberCount ? parseInt(channelMemberCount, 10) : 0,
        // CV/Portfolio fields
        education: education || '',
        skills: skills || '',
        yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience, 10) : 0,
        availableForWork: availableForWork,
        // Privacy settings
        showPronouns,
        showProfession,
        showCompany,
        showInterests,
        showLinks,
        showCategory,
        showContactEmail,
        showChannel,
      };

      await updateUserProfile(user.uid, profileData);

      // Reload profile from Firebase to ensure all screens get the latest data
      await reloadProfile();

      showAlert(
        'Profile Updated! 🎉',
        isEditing
          ? 'Your profile has been updated successfully.'
          : 'Your public profile is now active! You can now post as yourself and build a following.',
        [
          {
            text: 'Great!',
            onPress: () => navigation.goBack(),
          },
        ],
        { type: 'success' }
      );
    } catch (error) {
      console.error('[ProfileSetup] Error saving profile:', error);
      showAlert(
        'Error',
        error.message || 'Failed to save profile. Please try again.',
        [],
        { type: 'error' }
      );
    } finally {
      setIsSaving(false);
    }
  };

  const getUsernameInputColor = () => {
    if (!username) return themeColors.divider;
    if (isCheckingUsername) return themeColors.textSecondary;
    if (isUsernameValid) return '#4CAF50';
    return '#F44336';
  };

  return (
    <ScreenLayout
      title={isEditing ? 'Edit Profile' : 'Set Up Your Profile'}
      subtitle={isEditing ? 'Update your public profile' : 'Create your public identity'}
      navigation={navigation}
      onBack={() => navigation.goBack()}
      showFooter={false}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Photo */}
        <View style={styles.photoSection}>
          <TouchableOpacity
            style={[styles.photoContainer, { borderColor: primaryColor }]}
            onPress={pickImage}
            activeOpacity={0.7}
          >
            {(localPhotoUri || profilePhoto) ? (
              <Image source={{ uri: localPhotoUri || profilePhoto }} style={styles.photo} />
            ) : (
              <View style={[styles.photoPlaceholder, { backgroundColor: `${primaryColor}20` }]}>
                <Ionicons name="person" size={50} color={primaryColor} />
              </View>
            )}
            <View style={[styles.photoEditBadge, { backgroundColor: primaryColor }]}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.photoHint, { color: themeColors.textSecondary }]}>
            Tap to {profilePhoto ? 'change' : 'add'} photo
          </Text>
        </View>

        {/* Username */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: themeColors.textPrimary }]}>
              Username <Text style={{ color: '#F44336' }}>*</Text>
            </Text>
            {isCheckingUsername && (
              <ActivityIndicator size="small" color={primaryColor} />
            )}
            {!isCheckingUsername && username && (
              <Ionicons
                name={isUsernameValid ? 'checkmark-circle' : 'close-circle'}
                size={20}
                color={isUsernameValid ? '#4CAF50' : '#F44336'}
              />
            )}
          </View>
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: themeColors.background,
                borderColor: getUsernameInputColor(),
              },
            ]}
          >
            <Text style={[styles.inputPrefix, { color: themeColors.textSecondary }]}>@</Text>
            <TextInput
              style={[styles.input, { color: themeColors.textPrimary }]}
              placeholder="johndoe"
              placeholderTextColor={themeColors.textSecondary}
              value={username}
              onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
            />
          </View>
          {usernameError ? (
            <Text style={styles.errorText}>{usernameError}</Text>
          ) : (
            <Text style={[styles.hint, { color: themeColors.textSecondary }]}>
              3-20 characters, letters, numbers, and underscores only
            </Text>
          )}
        </View>

        {/* Display Name */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: themeColors.textPrimary }]}>
            Display Name <Text style={{ color: '#F44336' }}>*</Text>
          </Text>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: themeColors.background,
                color: themeColors.textPrimary,
                borderColor: themeColors.divider,
              },
            ]}
            placeholder="John Doe"
            placeholderTextColor={themeColors.textSecondary}
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={50}
          />
          <Text style={[styles.hint, { color: themeColors.textSecondary }]}>
            Your name as it will appear on your profile
          </Text>
        </View>

        {/* Bio */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: themeColors.textPrimary }]}>Bio</Text>
            <Text style={[styles.charCount, { color: themeColors.textSecondary }]}>
              {bio.length}/150
            </Text>
          </View>
          <TextInput
            style={[
              styles.bioInput,
              {
                backgroundColor: themeColors.background,
                color: themeColors.textPrimary,
                borderColor: themeColors.divider,
              },
            ]}
            placeholder="Tell people about yourself..."
            placeholderTextColor={themeColors.textSecondary}
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={150}
            textAlignVertical="top"
          />
        </View>

        {/* Location Section */}
        <View style={styles.locationSection}>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
            📍 Location (Optional)
          </Text>
          <Text style={[styles.sectionHint, { color: themeColors.textSecondary }]}>
            Help neighbors find you and improve local recommendations
          </Text>

          <View style={styles.inputGroup}>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                {
                  backgroundColor: themeColors.background,
                  borderColor: themeColors.divider,
                },
              ]}
              onPress={() => setLocationModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="location-outline"
                size={20}
                color={country ? primaryColor : themeColors.textSecondary}
                style={{ marginRight: 8 }}
              />
              <Text
                style={[
                  styles.pickerButtonText,
                  { color: country ? themeColors.textPrimary : themeColors.textSecondary },
                ]}
              >
                {getLocationDisplayText()}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Professional Profile Section */}
        <View style={styles.locationSection}>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
            ✨ Professional Profile (Optional)
          </Text>
          <Text style={[styles.sectionHint, { color: themeColors.textSecondary }]}>
            Showcase your interests, profession, and links
          </Text>

          {/* Pronouns */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.textPrimary }]}>Pronouns</Text>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                {
                  backgroundColor: themeColors.background,
                  borderColor: themeColors.divider,
                },
              ]}
              onPress={() => setPronounsPickerVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pickerButtonText, { color: pronouns ? themeColors.textPrimary : themeColors.textSecondary }]}>
                {pronouns || 'Select pronouns...'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Profession */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.textPrimary }]}>Profession</Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: themeColors.background,
                  color: themeColors.textPrimary,
                  borderColor: themeColors.divider,
                },
              ]}
              placeholder="e.g., Software Developer, Artist..."
              placeholderTextColor={themeColors.textSecondary}
              value={profession}
              onChangeText={setProfession}
              maxLength={50}
            />
          </View>

          {/* Company */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.textPrimary }]}>Company</Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: themeColors.background,
                  color: themeColors.textPrimary,
                  borderColor: themeColors.divider,
                },
              ]}
              placeholder="e.g., Google, Self-employed..."
              placeholderTextColor={themeColors.textSecondary}
              value={company}
              onChangeText={setCompany}
              maxLength={50}
            />
          </View>

          {/* Education */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.textPrimary }]}>Education</Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: themeColors.background,
                  color: themeColors.textPrimary,
                  borderColor: themeColors.divider,
                },
              ]}
              placeholder="e.g., BSc Computer Science, University of Cape Town"
              placeholderTextColor={themeColors.textSecondary}
              value={education}
              onChangeText={setEducation}
              maxLength={100}
            />
            <Text style={[styles.hint, { color: themeColors.textSecondary }]}>
              Your highest degree or current education
            </Text>
          </View>

          {/* Years of Experience */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.textPrimary }]}>Years of Experience</Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: themeColors.background,
                  color: themeColors.textPrimary,
                  borderColor: themeColors.divider,
                },
              ]}
              placeholder="e.g., 5"
              placeholderTextColor={themeColors.textSecondary}
              value={yearsOfExperience}
              onChangeText={(text) => setYearsOfExperience(text.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text style={[styles.hint, { color: themeColors.textSecondary }]}>
              Years of professional experience in your field
            </Text>
          </View>

          {/* Skills */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.textPrimary }]}>Skills</Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: themeColors.background,
                  color: themeColors.textPrimary,
                  borderColor: themeColors.divider,
                },
              ]}
              placeholder="e.g., JavaScript, React, Design, Leadership"
              placeholderTextColor={themeColors.textSecondary}
              value={skills}
              onChangeText={setSkills}
              maxLength={200}
            />
            <Text style={[styles.hint, { color: themeColors.textSecondary }]}>
              Your key skills (comma-separated)
            </Text>
          </View>

          {/* Available for Work */}
          <View style={styles.inputGroup}>
            <View style={styles.privacyRow}>
              <View style={styles.privacyLabel}>
                <Text style={[styles.label, { color: themeColors.textPrimary }]}>
                  Available for Work
                </Text>
                <Text style={[styles.privacyHint, { color: themeColors.textSecondary }]}>
                  {availableForWork ? 'Open to opportunities' : 'Not currently looking'}
                </Text>
              </View>
              <Switch
                value={availableForWork}
                onValueChange={setAvailableForWork}
                trackColor={{ false: themeColors.divider, true: primaryColor }}
                thumbColor={availableForWork ? '#fff' : '#f4f3f4'}
              />
            </View>
          </View>

          {/* Category (Tagline) */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.textPrimary }]}>Category</Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: themeColors.background,
                  color: themeColors.textPrimary,
                  borderColor: themeColors.divider,
                },
              ]}
              placeholder="e.g., autistic∞, artist, entrepreneur..."
              placeholderTextColor={themeColors.textSecondary}
              value={category}
              onChangeText={setCategory}
              maxLength={30}
            />
            <Text style={[styles.hint, { color: themeColors.textSecondary }]}>
              A short tagline or category
            </Text>
          </View>

          {/* Contact Email */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.textPrimary }]}>Contact Email</Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: themeColors.background,
                  color: themeColors.textPrimary,
                  borderColor: themeColors.divider,
                },
              ]}
              placeholder="e.g., business@example.com"
              placeholderTextColor={themeColors.textSecondary}
              value={contactEmail}
              onChangeText={setContactEmail}
              maxLength={100}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={[styles.hint, { color: themeColors.textSecondary }]}>
              For collaborations and business inquiries
            </Text>
          </View>

          {/* Channel/Group Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.textPrimary }]}>Channel/Group</Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: themeColors.background,
                  color: themeColors.textPrimary,
                  borderColor: themeColors.divider,
                },
              ]}
              placeholder="e.g., My Community, Tech Talk..."
              placeholderTextColor={themeColors.textSecondary}
              value={channelName}
              onChangeText={setChannelName}
              maxLength={50}
            />
          </View>

          {/* Channel Member Count */}
          {channelName && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.textPrimary }]}>Member Count</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: themeColors.background,
                    color: themeColors.textPrimary,
                    borderColor: themeColors.divider,
                  },
                ]}
                placeholder="e.g., 1700"
                placeholderTextColor={themeColors.textSecondary}
                value={channelMemberCount}
                onChangeText={(text) => setChannelMemberCount(text.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={10}
              />
              <Text style={[styles.hint, { color: themeColors.textSecondary }]}>
                Number of members in your channel/group
              </Text>
            </View>
          )}

          {/* Interests */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: themeColors.textPrimary }]}>Interests</Text>
              <Text style={[styles.charCount, { color: themeColors.textSecondary }]}>
                {interests.length}/10
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                {
                  backgroundColor: themeColors.background,
                  borderColor: themeColors.divider,
                },
              ]}
              onPress={() => {
                console.log('[ProfileSetup] Opening interests modal - current state:', interests.length, 'interests');
                console.log('[ProfileSetup] userProfile.interests:', userProfile?.interests?.length, 'interests');

                if (isLoadingProfile) {
                  console.log('[ProfileSetup] Still loading profile, waiting...');
                  return;
                }

                setInterestsModalVisible(true);
              }}
              activeOpacity={0.7}
              disabled={isLoadingProfile}
            >
              <Text style={[styles.pickerButtonText, { color: interests.length > 0 ? themeColors.textPrimary : themeColors.textSecondary }]}>
                {interests.length > 0 ? `${interests.length} selected` : 'Select interests...'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={themeColors.textSecondary} />
            </TouchableOpacity>
            {interests.length > 0 && (
              <View style={styles.interestsPreview}>
                {interests.slice(0, 3).map((interestId) => {
                  const interest = ALL_INTERESTS.find((i) => i.id === interestId);
                  if (!interest) return null;
                  return (
                    <View
                      key={interestId}
                      style={[
                        styles.interestTag,
                        {
                          backgroundColor: `${primaryColor}20`,
                          borderColor: `${primaryColor}40`,
                        },
                      ]}
                    >
                      <Ionicons name={interest.icon} size={12} color={primaryColor} />
                      <Text style={[styles.interestTagText, { color: themeColors.textPrimary }]}>
                        {interest.label}
                      </Text>
                    </View>
                  );
                })}
                {interests.length > 3 && (
                  <Text style={[styles.moreText, { color: themeColors.textSecondary }]}>
                    +{interests.length - 3} more
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Links */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: themeColors.textPrimary }]}>Links</Text>
              <Text style={[styles.charCount, { color: themeColors.textSecondary }]}>
                {links.length}/1
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                {
                  backgroundColor: themeColors.background,
                  borderColor: themeColors.divider,
                },
              ]}
              onPress={() => setLinksModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pickerButtonText, { color: links.length > 0 ? themeColors.textPrimary : themeColors.textSecondary }]}>
                {links.length > 0 ? `${links.length} link${links.length > 1 ? 's' : ''} added` : 'Add links...'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={themeColors.textSecondary} />
            </TouchableOpacity>
            {links.length > 0 && (
              <View style={styles.linksPreview}>
                {links.map((link) => {
                  const linkType = LINK_TYPES.find((t) => t.id === link.type);
                  return (
                    <View key={link.id} style={styles.linkPreviewItem}>
                      <Ionicons
                        name={linkType?.icon || 'link'}
                        size={14}
                        color={linkType?.color || themeColors.textSecondary}
                      />
                      <Text style={[styles.linkPreviewText, { color: themeColors.textPrimary }]} numberOfLines={1}>
                        {link.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* Privacy Settings */}
        <View style={styles.locationSection}>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
            🔒 Privacy Settings
          </Text>
          <Text style={[styles.sectionHint, { color: themeColors.textSecondary }]}>
            Control who can see your professional profile information
          </Text>

          {/* Pronouns Privacy */}
          {pronouns && (
            <View style={styles.privacyRow}>
              <View style={styles.privacyLabel}>
                <Text style={[styles.label, { color: themeColors.textPrimary }]}>
                  Show pronouns publicly
                </Text>
                <Text style={[styles.privacyHint, { color: themeColors.textSecondary }]}>
                  {showPronouns ? 'Everyone can see' : 'Hidden from profile'}
                </Text>
              </View>
              <Switch
                value={showPronouns}
                onValueChange={setShowPronouns}
                trackColor={{ false: themeColors.divider, true: primaryColor }}
                thumbColor={showPronouns ? '#fff' : '#f4f3f4'}
              />
            </View>
          )}

          {/* Profession Privacy */}
          {profession && (
            <View style={styles.privacyRow}>
              <View style={styles.privacyLabel}>
                <Text style={[styles.label, { color: themeColors.textPrimary }]}>
                  Show profession publicly
                </Text>
                <Text style={[styles.privacyHint, { color: themeColors.textSecondary }]}>
                  {showProfession ? 'Everyone can see' : 'Hidden from profile'}
                </Text>
              </View>
              <Switch
                value={showProfession}
                onValueChange={setShowProfession}
                trackColor={{ false: themeColors.divider, true: primaryColor }}
                thumbColor={showProfession ? '#fff' : '#f4f3f4'}
              />
            </View>
          )}

          {/* Company Privacy */}
          {company && (
            <View style={styles.privacyRow}>
              <View style={styles.privacyLabel}>
                <Text style={[styles.label, { color: themeColors.textPrimary }]}>
                  Show company publicly
                </Text>
                <Text style={[styles.privacyHint, { color: themeColors.textSecondary }]}>
                  {showCompany ? 'Everyone can see' : 'Hidden from profile'}
                </Text>
              </View>
              <Switch
                value={showCompany}
                onValueChange={setShowCompany}
                trackColor={{ false: themeColors.divider, true: primaryColor }}
                thumbColor={showCompany ? '#fff' : '#f4f3f4'}
              />
            </View>
          )}

          {/* Interests Privacy */}
          {interests.length > 0 && (
            <View style={styles.privacyRow}>
              <View style={styles.privacyLabel}>
                <Text style={[styles.label, { color: themeColors.textPrimary }]}>
                  Show interests publicly
                </Text>
                <Text style={[styles.privacyHint, { color: themeColors.textSecondary }]}>
                  {showInterests ? 'Everyone can see' : 'Hidden from profile'}
                </Text>
              </View>
              <Switch
                value={showInterests}
                onValueChange={setShowInterests}
                trackColor={{ false: themeColors.divider, true: primaryColor }}
                thumbColor={showInterests ? '#fff' : '#f4f3f4'}
              />
            </View>
          )}

          {/* Links Privacy */}
          {links.length > 0 && (
            <View style={styles.privacyRow}>
              <View style={styles.privacyLabel}>
                <Text style={[styles.label, { color: themeColors.textPrimary }]}>
                  Show links publicly
                </Text>
                <Text style={[styles.privacyHint, { color: themeColors.textSecondary }]}>
                  {showLinks ? 'Everyone can see' : 'Hidden from profile'}
                </Text>
              </View>
              <Switch
                value={showLinks}
                onValueChange={setShowLinks}
                trackColor={{ false: themeColors.divider, true: primaryColor }}
                thumbColor={showLinks ? '#fff' : '#f4f3f4'}
              />
            </View>
          )}

          {/* Category Privacy */}
          {category && (
            <View style={styles.privacyRow}>
              <View style={styles.privacyLabel}>
                <Text style={[styles.label, { color: themeColors.textPrimary }]}>
                  Show category publicly
                </Text>
                <Text style={[styles.privacyHint, { color: themeColors.textSecondary }]}>
                  {showCategory ? 'Everyone can see' : 'Hidden from profile'}
                </Text>
              </View>
              <Switch
                value={showCategory}
                onValueChange={setShowCategory}
                trackColor={{ false: themeColors.divider, true: primaryColor }}
                thumbColor={showCategory ? '#fff' : '#f4f3f4'}
              />
            </View>
          )}

          {/* Contact Email Privacy */}
          {contactEmail && (
            <View style={styles.privacyRow}>
              <View style={styles.privacyLabel}>
                <Text style={[styles.label, { color: themeColors.textPrimary }]}>
                  Show contact email publicly
                </Text>
                <Text style={[styles.privacyHint, { color: themeColors.textSecondary }]}>
                  {showContactEmail ? 'Everyone can see' : 'Hidden from profile'}
                </Text>
              </View>
              <Switch
                value={showContactEmail}
                onValueChange={setShowContactEmail}
                trackColor={{ false: themeColors.divider, true: primaryColor }}
                thumbColor={showContactEmail ? '#fff' : '#f4f3f4'}
              />
            </View>
          )}

          {/* Channel Privacy */}
          {channelName && (
            <View style={styles.privacyRow}>
              <View style={styles.privacyLabel}>
                <Text style={[styles.label, { color: themeColors.textPrimary }]}>
                  Show channel publicly
                </Text>
                <Text style={[styles.privacyHint, { color: themeColors.textSecondary }]}>
                  {showChannel ? 'Everyone can see' : 'Hidden from profile'}
                </Text>
              </View>
              <Switch
                value={showChannel}
                onValueChange={setShowChannel}
                trackColor={{ false: themeColors.divider, true: primaryColor }}
                thumbColor={showChannel ? '#fff' : '#f4f3f4'}
              />
            </View>
          )}

          {(pronouns || profession || company || interests.length > 0 || links.length > 0 || category || contactEmail || channelName) && (
            <Text style={[styles.privacyNote, { color: themeColors.textSecondary }]}>
              Hidden information won't appear on your public profile
            </Text>
          )}
        </View>

        {/* Privacy Info */}
        <View style={[styles.infoCard, { backgroundColor: `${primaryColor}10` }]}>
          <Ionicons name="information-circle" size={20} color={primaryColor} />
          <Text style={[styles.infoText, { color: primaryColor }]}>
            With a public profile, you can post as yourself, build a following, and interact with
            the community. You can always switch to anonymous mode when posting.
          </Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            {
              backgroundColor: primaryColor,
              opacity: isSaving || !isUsernameValid || !displayName ? 0.5 : 1,
            },
          ]}
          onPress={handleSave}
          disabled={isSaving || !isUsernameValid || !displayName}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={24} color="#fff" />
              <Text style={styles.saveButtonText}>
                {isEditing ? 'Save Changes' : 'Create Profile'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {!isEditing && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={[styles.skipButtonText, { color: themeColors.textSecondary }]}>
              Skip for now
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Modals */}
      <PronounsPicker
        visible={pronounsPickerVisible}
        onClose={() => setPronounsPickerVisible(false)}
        selectedPronouns={pronouns}
        onSelect={setPronouns}
      />

      <InterestsSelectorModal
        visible={interestsModalVisible}
        onClose={() => setInterestsModalVisible(false)}
        selectedInterests={interests}
        onSave={setInterests}
      />

      <LinksManagerModal
        visible={linksModalVisible}
        onClose={() => setLinksModalVisible(false)}
        links={links}
        onSave={setLinks}
      />

      <ShareLocationModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        onSelectCity={(cityName, meta) => {
          handleLocationSave(cityName, meta);
          setLocationModalVisible(false);
        }}
        originCity={city}
        initialCountry={country}
        initialProvince={province}
        accentColor={primaryColor}
        title="Choose your location"
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  photoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  photoHint: {
    marginTop: 8,
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  charCount: {
    fontSize: 13,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
  },
  inputPrefix: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  textInput: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  bioInput: {
    height: 100,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  hint: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
  },
  errorText: {
    marginTop: 6,
    fontSize: 13,
    color: '#F44336',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  saveButton: {
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  locationSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  pickerButtonText: {
    fontSize: 15,
    flex: 1,
  },
  interestsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  interestTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  interestTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  moreText: {
    fontSize: 12,
    fontWeight: '500',
    paddingVertical: 6,
  },
  linksPreview: {
    marginTop: 12,
    gap: 8,
  },
  linkPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkPreviewText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  privacyLabel: {
    flex: 1,
    marginRight: 16,
  },
  privacyHint: {
    fontSize: 12,
    marginTop: 2,
  },
  privacyNote: {
    fontSize: 12,
    marginTop: 16,
    fontStyle: 'italic',
  },
});
