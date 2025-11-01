import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  Modal,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/ScreenLayout';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile } from '../services/userProfileService';
import { followUser, unfollowUser, isFollowing } from '../services/followService';
import { getUserPosts } from '../services/publicPostsService';
import { ENGAGEMENT_POINT_RULES } from '../constants/authConfig';
import * as ImagePicker from 'expo-image-picker';
import * as ScreenCapture from 'expo-screen-capture';
import {
  ALBUM_MAX_ITEMS,
  listenToAlbum,
  uploadAlbumPhoto,
  deleteAlbumPhoto,
  updateAlbumPreferences
} from '../services/albumService';

const withAlpha = (color, alpha) => {
  const clamped = Math.min(Math.max(alpha, 0), 1);
  if (typeof color === 'string' && color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((char) => `${char}${char}`)
        .join('');
    }
    if (hex.length === 6) {
      const value = parseInt(hex, 16);
      if (!Number.isNaN(value)) {
        const r = (value >> 16) & 255;
        const g = (value >> 8) & 255;
        const b = value & 255;
        return `rgba(${r},${g},${b},${clamped})`;
      }
    }
  }
  return `rgba(108,77,244,${clamped})`;
};

export default function PublicProfileScreen({ navigation, route }) {
  const { userId, username } = route.params;
  const { themeColors, accentPreset, userProfile: currentUserProfile } = useSettings();
  const { user, profile: authProfile, hasActivePremium, pointsToNextPremium, premiumDayCost, premiumAccessDurationMs } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('album'); // 'album', 'posts', 'statuses'
  const [albumPhotos, setAlbumPhotos] = useState([]);
  const [albumLoading, setAlbumLoading] = useState(true);
  const [albumColumns, setAlbumColumns] = useState(3);
  const [albumShape, setAlbumShape] = useState('square');
  const [albumUploading, setAlbumUploading] = useState(false);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [photoPreviewSource, setPhotoPreviewSource] = useState(null);
  const [showAlbumSettings, setShowAlbumSettings] = useState(false);

  const primaryColor = accentPreset?.buttonBackground || themeColors.primary;
  const isOwnProfile = user?.uid === userId;

  const loadProfile = useCallback(async () => {
    try {
      const [profileData, userPosts] = await Promise.all([
        getUserProfile(userId),
        getUserPosts(userId, 50),
      ]);

      setProfile(profileData);
      setPosts(userPosts);

      if (!isOwnProfile && user?.uid) {
        const following = await isFollowing(user.uid, userId);
        setIsFollowingUser(following);
      }
    } catch (error) {
      console.error('[PublicProfile] Error loading profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, isOwnProfile, user?.uid]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Reload profile when screen comes into focus (after editing)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadProfile();
    });
    return unsubscribe;
  }, [navigation, loadProfile]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    const unsubscribe = listenToAlbum(userId, (items) => {
      setAlbumPhotos(items);
      setAlbumLoading(false);
    });
    return () => {
      unsubscribe?.();
    };
  }, [userId]);

  useEffect(() => {
    if (profile) {
      const preferredColumns = Number(profile.albumLayout);
      const preferredShape = typeof profile.albumShape === 'string' ? profile.albumShape : null;
      setAlbumColumns([2, 3].includes(preferredColumns) ? preferredColumns : 3);
      setAlbumShape(['square', 'portrait'].includes(preferredShape) ? preferredShape : 'square');
    }
  }, [profile]);

  useEffect(() => () => {
    ScreenCapture.allowScreenCaptureAsync().catch(() => {});
  }, []);

  useEffect(() => {
    if (!photoModalVisible) {
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
    }
  }, [photoModalVisible]);

  const handlePreviewPhoto = useCallback(async (uri) => {
    if (!uri) return;
    try {
      await ScreenCapture.preventScreenCaptureAsync();
    } catch (error) {
      console.warn('[PublicProfile] prevent screen capture failed', error);
    }
    setPhotoPreviewSource({ uri });
    setPhotoModalVisible(true);
  }, []);

  const closePhotoPreview = useCallback(async () => {
    setPhotoModalVisible(false);
    setPhotoPreviewSource(null);
    try {
      await ScreenCapture.allowScreenCaptureAsync();
    } catch {}
  }, []);

  const handleOpenInbox = useCallback(() => {
    if (!user?.uid) {
      navigation.navigate('Settings');
      return;
    }
    navigation.navigate('DirectMessage', {
      userId,
      username: profile?.username,
      displayName: profile?.displayName || profile?.username,
      profilePhoto: profile?.profilePhoto || null
    });
  }, [navigation, profile, user?.uid, userId]);

  const handleAddAlbumPhotos = useCallback(async () => {
    if (!isOwnProfile || albumUploading) {
      return;
    }
    if (!user?.uid) {
      navigation.navigate('Settings');
      return;
    }
    const remaining = Math.max(ALBUM_MAX_ITEMS - albumPhotos.length, 0);
    if (remaining <= 0) {
      Alert.alert('Album is full', 'You can upload up to 10 photos. Remove a photo to add a new one.');
      return;
    }
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      selectionLimit: Math.min(remaining, 10),
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8
    });

    if (pickerResult.canceled) {
      return;
    }

    const assets = pickerResult.assets ?? [];
    if (!assets.length) {
      return;
    }

    setAlbumUploading(true);
    try {
      const allowedAssets = assets.slice(0, remaining);
      for (const asset of allowedAssets) {
        if (asset?.uri) {
          await uploadAlbumPhoto(user.uid, asset.uri);
        }
      }
    } catch (error) {
      console.error('[PublicProfile] album upload failed', error);
      Alert.alert('Upload failed', 'We could not upload the selected photos. Please try again.');
    } finally {
      setAlbumUploading(false);
    }
  }, [albumPhotos.length, albumUploading, isOwnProfile, navigation, user?.uid]);

  const handleDeleteAlbumPhoto = useCallback((photo) => {
    if (!isOwnProfile || !user?.uid || !photo?.id) {
      return;
    }
    Alert.alert('Remove photo', 'Do you want to remove this photo from your album?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          deleteAlbumPhoto(user.uid, photo).catch((error) => {
            console.warn('[PublicProfile] delete album photo failed', error);
          });
        }
      }
    ]);
  }, [isOwnProfile, user?.uid]);

  const handleChangeAlbumColumns = useCallback((columns) => {
    if (![2, 3].includes(columns)) {
      return;
    }
    setAlbumColumns(columns);
    if (isOwnProfile) {
      updateAlbumPreferences(userId, { columns });
    }
  }, [isOwnProfile, userId]);

  const handleChangeAlbumShape = useCallback((shape) => {
    if (!['square', 'portrait'].includes(shape)) {
      return;
    }
    setAlbumShape(shape);
    if (isOwnProfile) {
      updateAlbumPreferences(userId, { shape });
    }
  }, [isOwnProfile, userId]);

  const renderAlbumTab = useCallback(() => {
    if (albumLoading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      );
    }

    const photoItems = albumPhotos.filter((item) => item?.downloadUrl);
    const hasPhotos = photoItems.length > 0;
    const aspectRatio = albumShape === 'portrait' ? 0.75 : 1;

    return (
      <View style={styles.albumContainer}>
        {isOwnProfile && (
          <View
            style={[
              styles.albumControls,
              {
                backgroundColor: themeColors.card,
                borderColor: themeColors.divider,
                shadowColor: '#00000022'
              }
            ]}
          >
            <TouchableOpacity
              style={[styles.albumActionButton, { backgroundColor: primaryColor }]}
              onPress={handleAddAlbumPhotos}
              activeOpacity={0.75}
              disabled={albumUploading}
            >
              {albumUploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                  <Text style={styles.albumActionText}>Upload photos</Text>
                </>
              )}
            </TouchableOpacity>
            <View style={styles.albumHeaderRow}>
              <Text style={[styles.albumHint, { color: themeColors.textSecondary, marginBottom: 0 }]}>
                {`You can add up to ${ALBUM_MAX_ITEMS} photos (${Math.max(ALBUM_MAX_ITEMS - albumPhotos.length, 0)} slots left).`}
              </Text>
              <TouchableOpacity
                onPress={() => setShowAlbumSettings(!showAlbumSettings)}
                style={styles.settingsIconButton}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showAlbumSettings ? "close-circle" : "options-outline"}
                  size={22}
                  color={showAlbumSettings ? primaryColor : themeColors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {showAlbumSettings && (
              <View style={[styles.albumSettingsContainer, { backgroundColor: withAlpha(primaryColor, 0.06), borderColor: withAlpha(primaryColor, 0.15) }]}>
                <View style={styles.albumSettingsRow}>
                  <Text style={[styles.albumSettingsLabel, { color: themeColors.textSecondary }]}>Grid</Text>
                  {[2, 3].map((columns) => (
                    <TouchableOpacity
                      key={`columns-${columns}`}
                      style={[
                        styles.albumOption,
                        {
                          borderColor: themeColors.divider,
                          backgroundColor: themeColors.card
                        },
                        albumColumns === columns && [
                          styles.albumOptionActive,
                          {
                            borderColor: primaryColor,
                            backgroundColor: withAlpha(primaryColor, 0.12)
                          }
                        ]
                      ]}
                      onPress={() => handleChangeAlbumColumns(columns)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.albumOptionText,
                          { color: themeColors.textSecondary },
                          albumColumns === columns && [
                            styles.albumOptionTextActive,
                            { color: primaryColor }
                          ]
                        ]}
                      >
                        {columns} columns
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.albumSettingsRow}>
                  <Text style={[styles.albumSettingsLabel, { color: themeColors.textSecondary }]}>Shape</Text>
                  {['square', 'portrait'].map((shapeKey) => (
                    <TouchableOpacity
                      key={`shape-${shapeKey}`}
                      style={[
                        styles.albumOption,
                        {
                          borderColor: themeColors.divider,
                          backgroundColor: themeColors.card
                        },
                        albumShape === shapeKey && [
                          styles.albumOptionActive,
                          {
                            borderColor: primaryColor,
                            backgroundColor: withAlpha(primaryColor, 0.12)
                          }
                        ]
                      ]}
                      onPress={() => handleChangeAlbumShape(shapeKey)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.albumOptionText,
                          { color: themeColors.textSecondary },
                          albumShape === shapeKey && [
                            styles.albumOptionTextActive,
                            { color: primaryColor }
                          ]
                        ]}
                      >
                        {shapeKey === 'square' ? 'Square' : 'Portrait'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {hasPhotos ? (
          <View style={styles.albumGrid}>
            {photoItems.map((photo) => (
              <TouchableOpacity
                key={photo.id}
                style={[styles.albumItem, { width: `${100 / albumColumns}%` }]}
                activeOpacity={0.8}
                onPress={() => handlePreviewPhoto(photo.downloadUrl)}
                onLongPress={() => isOwnProfile && handleDeleteAlbumPhoto(photo)}
                delayLongPress={250}
              >
                <Image
                  source={{ uri: photo.downloadUrl }}
                  style={[styles.albumImage, { aspectRatio }]}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="images-outline" size={64} color={themeColors.textSecondary} />
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }] }>
              {isOwnProfile ? 'Build your album' : 'No album photos yet'}
            </Text>
            {isOwnProfile && (
              <Text style={[styles.emptySubtext, { color: themeColors.textSecondary }] }>
                Add up to 10 photos that showcase your vibe. Touch and hold any photo to remove it later.
              </Text>
            )}
          </View>
        )}
      </View>
    );
  }, [
    albumColumns,
    albumLoading,
    albumPhotos,
    albumShape,
    albumUploading,
    showAlbumSettings,
    handleAddAlbumPhotos,
    handleDeleteAlbumPhoto,
    handleChangeAlbumColumns,
    handleChangeAlbumShape,
    handlePreviewPhoto,
    isOwnProfile,
    primaryColor,
    themeColors
  ]);

  const renderPostsTab = useCallback(() => {
    return posts.length > 0 ? (
      <View style={styles.postsGrid}>
        {posts.map((post) => (
          <TouchableOpacity
            key={post.id}
            style={[styles.postCard, { backgroundColor: themeColors.card }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.postTitle, { color: themeColors.textPrimary }]} numberOfLines={2}>
              {post.title}
            </Text>
            {post.message && (
              <Text style={[styles.postMessage, { color: themeColors.textSecondary }]} numberOfLines={3}>
                {post.message}
              </Text>
            )}
            <View style={styles.postStats}>
              <View style={styles.postStat}>
                <Ionicons name="heart-outline" size={14} color={themeColors.textSecondary} />
                <Text style={[styles.postStatText, { color: themeColors.textSecondary }]}>
                  {post.likesCount || 0}
                </Text>
              </View>
              <View style={styles.postStat}>
                <Ionicons name="chatbubble-outline" size={14} color={themeColors.textSecondary} />
                <Text style={[styles.postStatText, { color: themeColors.textSecondary }]}>
                  {post.commentsCount || 0}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    ) : (
      <View style={styles.emptyState}>
        <Ionicons name="document-text-outline" size={64} color={themeColors.textSecondary} />
        <Text style={[styles.emptyText, { color: themeColors.textSecondary }] }>
          {isOwnProfile ? 'No public posts yet' : 'No posts to show'}
        </Text>
        <Text style={[styles.emptySubtext, { color: themeColors.textSecondary }] }>
          {isOwnProfile
            ? 'Posts you create in public mode will appear here.'
            : 'This user hasn\'t posted publicly yet.'}
        </Text>
      </View>
    );
  }, [isOwnProfile, posts, themeColors.card, themeColors.textPrimary, themeColors.textSecondary]);

  const renderStatusesTab = useCallback(() => (
    <View style={styles.emptyState}>
      <Ionicons name="flash-outline" size={64} color={themeColors.textSecondary} />
      <Text style={[styles.emptyText, { color: themeColors.textSecondary }] }>
        {isOwnProfile ? 'No statuses yet' : 'No statuses to show'}
      </Text>
    </View>
  ), [isOwnProfile, themeColors.textSecondary]);

  const handleFollow = async () => {
    if (!user?.uid) {
      navigation.navigate('Settings');
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowingUser) {
        await unfollowUser(user.uid, userId);
        setIsFollowingUser(false);
        setProfile(prev => ({
          ...prev,
          followersCount: Math.max((prev?.followersCount || 0) - 1, 0),
        }));
      } else {
        await followUser(user.uid, userId);
        setIsFollowingUser(true);
        setProfile(prev => ({
          ...prev,
          followersCount: (prev?.followersCount || 0) + 1,
        }));
      }
    } catch (error) {
      console.error('[PublicProfile] Error toggling follow:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  const navigateToFollowers = () => {
    navigation.navigate('Followers', { userId, username: profile?.username });
  };

  const navigateToFollowing = () => {
    navigation.navigate('Following', { userId, username: profile?.username });
  };

  const navigateToEdit = () => {
    navigation.navigate('ProfileSetup', { isEditing: true });
  };

  if (loading) {
    return (
      <ScreenLayout
        title="Profile"
        navigation={navigation}
        onBack={() => navigation.goBack()}
        showFooter={false}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      </ScreenLayout>
    );
  }

  if (!profile) {
    return (
      <ScreenLayout
        title="Profile"
        navigation={navigation}
        onBack={() => navigation.goBack()}
        showFooter={false}
      >
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={themeColors.textSecondary} />
          <Text style={[styles.errorText, { color: themeColors.textSecondary }]}>
            Profile not found
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout
      title={profile.displayName || profile.username}
      subtitle={`@${profile.username}`}
      navigation={navigation}
      onBack={() => navigation.goBack()}
      showFooter={false}
    >
      <Modal
        visible={photoModalVisible}
        animationType="fade"
        transparent
        onRequestClose={closePhotoPreview}
        onDismiss={closePhotoPreview}
      >
        <View style={styles.photoModalBackdrop}>
          <TouchableOpacity
            style={styles.photoModalBackdropTouchable}
            activeOpacity={1}
            onPress={closePhotoPreview}
          />
          <View style={[styles.photoModalContent, { backgroundColor: themeColors.card }]}>
            <TouchableOpacity
              style={styles.photoModalClose}
              onPress={closePhotoPreview}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={themeColors.textPrimary} />
            </TouchableOpacity>
            {photoPreviewSource ? (
              <Image source={photoPreviewSource} style={styles.photoModalImage} resizeMode="contain" />
            ) : null}
          </View>
        </View>
      </Modal>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={primaryColor}
          />
        }
      >
        {/* Profile Header */}
        <View style={[styles.header, { backgroundColor: themeColors.card }]}>
          {/* Profile Photo */}
          <View style={[styles.photoContainer, { borderColor: primaryColor }]}>
            {profile.profilePhoto ? (
              <TouchableOpacity
                style={styles.photoTouchable}
                activeOpacity={0.85}
                onPress={() => handlePreviewPhoto(profile.profilePhoto)}
              >
                <Image source={{ uri: profile.profilePhoto }} style={styles.photo} />
              </TouchableOpacity>
            ) : (
              <View style={[styles.photoPlaceholder, { backgroundColor: withAlpha(primaryColor, 0.12) }]}>
                <Ionicons name="person" size={50} color={primaryColor} />
              </View>
            )}
          </View>

          {/* Display Name & Username */}
          <Text style={[styles.displayName, { color: themeColors.textPrimary }]}>
            {profile.displayName || profile.username}
          </Text>
          <Text style={[styles.username, { color: themeColors.textSecondary }]}>
            @{profile.username}
          </Text>

          {/* Bio */}
          {profile.bio && (
            <Text style={[styles.bio, { color: themeColors.textPrimary }]}>{profile.bio}</Text>
          )}

          {/* Location */}
          {(profile.city || profile.province || profile.country) && (
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color={themeColors.textSecondary} />
              <Text style={[styles.location, { color: themeColors.textSecondary }]}>
                {[profile.city, profile.province, profile.country].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={styles.stat}
              onPress={navigateToFollowers}
              activeOpacity={0.7}
            >
              <Text style={[styles.statNumber, { color: themeColors.textPrimary }]}>
                {profile.followersCount || 0}
              </Text>
              <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>
                Followers
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.stat}
              onPress={navigateToFollowing}
              activeOpacity={0.7}
            >
              <Text style={[styles.statNumber, { color: themeColors.textPrimary }]}>
                {profile.followingCount || 0}
              </Text>
              <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>
                Following
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.stat}
              onPress={() => setActiveTab('album')}
              activeOpacity={0.7}
            >
              <Text style={[styles.statNumber, { color: themeColors.textPrimary }]}>
                {profile.albumCount ?? albumPhotos.length}
              </Text>
              <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>
                Album
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.stat}
              onPress={() => setActiveTab('posts')}
              activeOpacity={0.7}
            >
              <Text style={[styles.statNumber, { color: themeColors.textPrimary }]}>
                {profile.publicPostsCount || posts.length}
              </Text>
              <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Posts</Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            {isOwnProfile ? (
              <TouchableOpacity
                style={[styles.actionButton, { borderColor: primaryColor }]}
                onPress={navigateToEdit}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={20} color={primaryColor} />
                <Text style={[styles.actionButtonText, { color: primaryColor }]}>
                  Edit Profile
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[
                    styles.followButton,
                    {
                      backgroundColor: isFollowingUser ? 'transparent' : primaryColor,
                      borderColor: primaryColor,
                      borderWidth: isFollowingUser ? 1 : 0,
                    },
                  ]}
                  onPress={handleFollow}
                  disabled={followLoading}
                  activeOpacity={0.7}
                >
                  {followLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={isFollowingUser ? primaryColor : '#fff'}
                    />
                  ) : (
                    <>
                      <Ionicons
                        name={isFollowingUser ? 'checkmark' : 'person-add'}
                        size={20}
                        color={isFollowingUser ? primaryColor : '#fff'}
                      />
                      <Text
                        style={[
                          styles.followButtonText,
                          { color: isFollowingUser ? primaryColor : '#fff' },
                        ]}
                      >
                        {isFollowingUser ? 'Following' : 'Follow'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.messageButton, { borderColor: primaryColor }]}
                  activeOpacity={0.7}
                  onPress={handleOpenInbox}
                >
                  <Ionicons name="mail-outline" size={20} color={primaryColor} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabsContainer, { borderBottomColor: themeColors.divider }]}>
          {[
            { key: 'album', label: 'Album', icon: 'images-outline' },
            { key: 'posts', label: 'Posts', icon: 'grid-outline' },
            { key: 'statuses', label: 'Statuses', icon: 'flash-outline' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && {
                  borderBottomColor: primaryColor,
                  borderBottomWidth: 2,
                },
              ]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={tab.icon}
                size={20}
                color={activeTab === tab.key ? primaryColor : themeColors.textSecondary}
              />
              <Text
                style={[
                  styles.tabText,
                  {
                    color: activeTab === tab.key ? primaryColor : themeColors.textSecondary,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Tab Content */}
        <View style={styles.contentContainer}>
          {activeTab === 'album'
            ? renderAlbumTab()
            : activeTab === 'posts'
            ? renderPostsTab()
            : renderStatusesTab()}
        </View>
        {/* Account Overview Section - Only show for own profile */}
        {isOwnProfile && (
          <>
            {/* Reward Points Card */}
            <View style={[styles.accountSection, { backgroundColor: themeColors.primary, marginTop: 20, marginHorizontal: 20 }]}>
              <Text style={styles.pointsLabel}>Reward points</Text>
              <Text style={styles.pointsValue}>{authProfile?.points || 0}</Text>
              <Text style={styles.pointsHint}>
                {hasActivePremium
                  ? 'Premium access is active—enjoy the perks!'
                  : pointsToNextPremium > 0
                  ? `${pointsToNextPremium} pts away from unlocking ${Math.max(Math.round(premiumAccessDurationMs / (60 * 60 * 1000)), 1)} hours of premium.`
                  : `Redeem ${premiumDayCost} pts at any time for ${Math.max(Math.round(premiumAccessDurationMs / (60 * 60 * 1000)), 1)} hours of premium.`}
              </Text>
            </View>

            {/* Account Overview */}
            <View style={[styles.accountSection, { backgroundColor: themeColors.card, marginHorizontal: 20 }]}>
              <Text style={[styles.accountSectionTitle, { color: themeColors.textPrimary }]}>Account overview</Text>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>Display name</Text>
                <Text style={[styles.detailValue, { color: themeColors.textPrimary }]}>
                  {(authProfile?.displayName || user?.displayName || '').trim() || 'Mystery guest'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>Email</Text>
                <Text style={[styles.detailValue, { color: themeColors.textPrimary }]}>
                  {(authProfile?.email || user?.email || '').trim() || 'No email on file'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>Nickname</Text>
                <Text style={[styles.detailValue, { color: themeColors.textPrimary }]}>
                  {currentUserProfile?.nickname?.trim() || 'Not set'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>Home base</Text>
                <Text style={[styles.detailValue, { color: themeColors.textPrimary }]}>
                  {[currentUserProfile?.city, currentUserProfile?.province, currentUserProfile?.country].filter(Boolean).join(', ') || 'Not shared'}
                </Text>
              </View>
            </View>

            {/* Earn More Points */}
            <View style={[styles.accountSection, { backgroundColor: themeColors.card, marginHorizontal: 20 }]}>
              <Text style={[styles.accountSectionTitle, { color: themeColors.textPrimary }]}>Earn more points</Text>
              <Text style={[styles.sectionHint, { color: themeColors.textSecondary }]}>
                Keep the conversation lively—your engagement boosts your balance automatically.
              </Text>
              {[
                {
                  key: 'comment',
                  label: 'Leave a thoughtful comment',
                  points: ENGAGEMENT_POINT_RULES.comment,
                  icon: 'chatbubble-ellipses-outline',
                },
                {
                  key: 'upvote',
                  label: 'Cheer on a post you love',
                  points: ENGAGEMENT_POINT_RULES.upvote,
                  icon: 'arrow-up-circle-outline',
                },
              ].filter((item) => Number(item.points) > 0).map((perk) => (
                <View key={perk.key} style={styles.perkRow}>
                  <View style={[styles.perkIconWrap, { backgroundColor: themeColors.primaryLight || `${primaryColor}20` }]}>
                    <Ionicons name={perk.icon} size={16} color={themeColors.primaryDark || primaryColor} />
                  </View>
                  <View style={styles.perkCopy}>
                    <Text style={[styles.perkLabel, { color: themeColors.textPrimary }]}>{perk.label}</Text>
                    <Text style={[styles.perkMeta, { color: themeColors.primaryDark || primaryColor }]}>+{perk.points} pts</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Premium Status */}
            <View style={[styles.accountSection, { backgroundColor: themeColors.card, marginHorizontal: 20, marginBottom: 40 }]}>
              <Text style={[styles.accountSectionTitle, { color: themeColors.textPrimary }]}>Premium status</Text>
              <View style={[styles.statusCard, { backgroundColor: themeColors.background, borderColor: themeColors.divider }]}>
                <Ionicons
                  name={hasActivePremium ? 'sparkles' : 'lock-closed-outline'}
                  size={20}
                  color={themeColors.primaryDark || primaryColor}
                  style={styles.statusIcon}
                />
                <View style={styles.statusCopy}>
                  <Text style={[styles.statusLabel, { color: themeColors.textPrimary }]}>
                    {hasActivePremium ? 'Premium unlocked' : 'Premium locked'}
                  </Text>
                  <Text style={[styles.statusMeta, { color: themeColors.textSecondary }]}>
                    {hasActivePremium
                      ? 'Enjoy richer themes, typography, and faster replies.'
                      : `Redeem ${premiumDayCost} pts in Settings to unlock the premium toolkit.`}
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    gap: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    marginBottom: 1,
  },
  photoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    overflow: 'hidden',
    marginBottom: 16,
  },
  photoTouchable: {
    flex: 1,
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
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    marginBottom: 12,
  },
  bio: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 20,
  },
  location: {
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  stat: {
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    paddingHorizontal: 20,
  },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  followButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  followButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  messageButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumContainer: {
    gap: 16,
    paddingHorizontal: 20,
  },
  albumControls: {
    gap: 12,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  albumActionButton: {
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
  },
  albumActionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  albumSettingsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  albumSettingsLabel: {
    fontWeight: '600',
    fontSize: 14,
  },
  albumOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  albumOptionActive: {},
  albumOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
  },
  albumOptionTextActive: {},
  albumHint: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.45)',
    marginBottom: 12,
  },
  albumHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  settingsIconButton: {
    padding: 8,
    marginRight: -8,
  },
  albumSettingsContainer: {
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  albumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -3,
  },
  albumItem: {
    paddingHorizontal: 3,
    marginBottom: 6,
    alignItems: 'center',
  },
  albumImage: {
    width: '100%',
    borderRadius: 18,
    backgroundColor: '#ccc',
    borderWidth: StyleSheet.hairlineWidth,
  },
  photoModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  photoModalBackdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  photoModalContent: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    padding: 16,
    overflow: 'hidden',
  },
  photoModalClose: {
    alignSelf: 'flex-end',
    padding: 4,
  },
  photoModalImage: {
    width: '100%',
    height: 340,
    borderRadius: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  // Posts grid
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 8,
  },
  postCard: {
    width: '48.5%',
    borderRadius: 12,
    padding: 14,
    minHeight: 120,
  },
  postTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 6,
  },
  postMessage: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  postStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  postStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postStatText: {
    fontSize: 11,
  },
  // Account overview section styles
  accountSection: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
  },
  accountSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  pointsLabel: {
    color: '#ffffffcc',
    fontSize: 13,
    fontWeight: '600',
  },
  pointsValue: {
    color: '#ffffff',
    fontSize: 40,
    fontWeight: '700',
    marginTop: 4,
  },
  pointsHint: {
    color: '#ffffffcc',
    fontSize: 13,
    marginTop: 12,
    lineHeight: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  sectionHint: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  perkIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  perkCopy: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  perkLabel: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
    marginRight: 12,
  },
  perkMeta: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  statusIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  statusCopy: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusMeta: {
    fontSize: 13,
    lineHeight: 20,
  },
});
