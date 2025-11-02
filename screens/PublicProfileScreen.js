import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/ScreenLayout';
import ProgressiveImage from '../components/ProgressiveImage';
import ProfileSkeleton from '../components/ProfileSkeleton';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile } from '../services/userProfileService';
import { followUser, unfollowUser, isFollowing } from '../services/followService';
import { getUserPosts } from '../services/publicPostsService';
import { ENGAGEMENT_POINT_RULES } from '../constants/authConfig';
import { getThumbnailUrl, getBlurhash } from '../utils/imageUtils';
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
  const [albumLayout, setAlbumLayout] = useState('masonry'); // 'grid' or 'masonry' - default to masonry
  const [masonryColumns, setMasonryColumns] = useState(3); // Number of columns for masonry layout
  const [albumUploading, setAlbumUploading] = useState(false);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [photoPreviewSource, setPhotoPreviewSource] = useState(null);
  const [showAlbumSettings, setShowAlbumSettings] = useState(false);

  // Track original values for change detection
  const [originalAlbumColumns, setOriginalAlbumColumns] = useState(3);
  const [originalAlbumShape, setOriginalAlbumShape] = useState('square');
  const [originalAlbumLayout, setOriginalAlbumLayout] = useState('masonry');
  const [originalMasonryColumns, setOriginalMasonryColumns] = useState(3);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Store the pending navigation action when user tries to leave with unsaved changes
  const pendingNavigationRef = useRef(null);

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

      // Only check follow status if user is authenticated
      if (!isOwnProfile && user?.uid) {
        try {
          const following = await isFollowing(user.uid, userId);
          setIsFollowingUser(following);
        } catch (error) {
          console.warn('[PublicProfile] Could not check follow status (user may not be signed in):', error.code);
          setIsFollowingUser(false);
        }
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

  // Prevent navigation if there are unsaved changes
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Only prevent if user has unsaved changes
      if (!hasUnsavedChanges()) {
        // Clear any pending navigation
        pendingNavigationRef.current = null;
        return;
      }

      // Prevent default behavior of leaving the screen
      e.preventDefault();

      // Store the navigation action so we can retry it after save/discard
      pendingNavigationRef.current = e.data.action;

      // Show save confirmation modal
      setShowSaveModal(true);
    });

    return unsubscribe;
  }, [navigation, hasUnsavedChanges]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!userId) {
      setAlbumPhotos([]);
      setAlbumLoading(false);
      return;
    }

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
      const preferredLayoutType = profile.albumLayoutType || 'masonry';
      const preferredMasonryColumns = Number(profile.albumMasonryColumns) || 3;

      const columns = [2, 3, 4].includes(preferredColumns) ? preferredColumns : 3;
      const shape = ['square', 'portrait'].includes(preferredShape) ? preferredShape : 'square';
      const layoutType = ['grid', 'masonry'].includes(preferredLayoutType) ? preferredLayoutType : 'masonry';
      const masonryCols = [2, 3, 4].includes(preferredMasonryColumns) ? preferredMasonryColumns : 3;

      setAlbumColumns(columns);
      setAlbumShape(shape);
      setAlbumLayout(layoutType);
      setMasonryColumns(masonryCols);

      // Set original values
      setOriginalAlbumColumns(columns);
      setOriginalAlbumShape(shape);
      setOriginalAlbumLayout(layoutType);
      setOriginalMasonryColumns(masonryCols);
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

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    return (
      albumColumns !== originalAlbumColumns ||
      albumShape !== originalAlbumShape ||
      albumLayout !== originalAlbumLayout ||
      masonryColumns !== originalMasonryColumns
    );
  }, [albumColumns, originalAlbumColumns, albumShape, originalAlbumShape, albumLayout, originalAlbumLayout, masonryColumns, originalMasonryColumns]);

  // Save all preferences
  const handleSavePreferences = useCallback(async () => {
    if (!isOwnProfile) return;

    try {
      await updateAlbumPreferences(userId, {
        columns: albumColumns,
        shape: albumShape,
        layoutType: albumLayout,
        masonryColumns: masonryColumns
      });

      // Update original values after successful save
      setOriginalAlbumColumns(albumColumns);
      setOriginalAlbumShape(albumShape);
      setOriginalAlbumLayout(albumLayout);
      setOriginalMasonryColumns(masonryColumns);
      setShowSaveModal(false);
      setShowAlbumSettings(false);

      // If there was a pending navigation, execute it now
      if (pendingNavigationRef.current) {
        navigation.dispatch(pendingNavigationRef.current);
        pendingNavigationRef.current = null;
      }
    } catch (error) {
      console.warn('[PublicProfile] save preferences failed', error);
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    }
  }, [isOwnProfile, userId, albumColumns, albumShape, albumLayout, masonryColumns, navigation]);

  // Discard changes and revert to original values
  const handleDiscardChanges = useCallback(() => {
    setAlbumColumns(originalAlbumColumns);
    setAlbumShape(originalAlbumShape);
    setAlbumLayout(originalAlbumLayout);
    setMasonryColumns(originalMasonryColumns);
    setShowSaveModal(false);
    setShowAlbumSettings(false);

    // If there was a pending navigation, execute it now
    if (pendingNavigationRef.current) {
      navigation.dispatch(pendingNavigationRef.current);
      pendingNavigationRef.current = null;
    }
  }, [originalAlbumColumns, originalAlbumShape, originalAlbumLayout, originalMasonryColumns, navigation]);

  // Handle closing settings - check for unsaved changes
  const handleCloseSettings = useCallback(() => {
    if (hasUnsavedChanges()) {
      setShowSaveModal(true);
    } else {
      setShowAlbumSettings(false);
    }
  }, [hasUnsavedChanges]);

  const handleChangeAlbumColumns = useCallback((columns) => {
    if (![2, 3, 4].includes(columns)) {
      return;
    }
    setAlbumColumns(columns);
  }, []);

  const handleChangeMasonryColumns = useCallback((columns) => {
    if (![2, 3, 4].includes(columns)) {
      return;
    }
    setMasonryColumns(columns);
  }, []);

  const handleChangeAlbumShape = useCallback((shape) => {
    if (!['square', 'portrait'].includes(shape)) {
      return;
    }
    setAlbumShape(shape);
  }, []);

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
                onPress={() => showAlbumSettings ? handleCloseSettings() : setShowAlbumSettings(true)}
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
              <View style={[styles.albumSettingsContainer, { backgroundColor: themeColors.card, borderColor: themeColors.divider }]}>
                {/* Layout Type */}
                <View style={styles.settingsSection}>
                  <Text style={[styles.settingsSectionTitle, { color: themeColors.textPrimary }]}>Layout</Text>
                  <View style={styles.layoutOptionsRow}>
                    {[
                      { key: 'grid', label: 'Grid', icon: 'grid-outline' },
                      { key: 'masonry', label: 'Masonry', icon: 'albums-outline' }
                    ].map((layoutOption) => (
                      <TouchableOpacity
                        key={`layout-${layoutOption.key}`}
                        style={[
                          styles.layoutOptionCard,
                          {
                            borderColor: themeColors.divider,
                            backgroundColor: themeColors.background
                          },
                          albumLayout === layoutOption.key && {
                            borderColor: primaryColor,
                            borderWidth: 2,
                            backgroundColor: withAlpha(primaryColor, 0.08)
                          }
                        ]}
                        onPress={() => setAlbumLayout(layoutOption.key)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={layoutOption.icon}
                          size={24}
                          color={albumLayout === layoutOption.key ? primaryColor : themeColors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.layoutOptionLabel,
                            { color: themeColors.textSecondary },
                            albumLayout === layoutOption.key && { color: primaryColor, fontWeight: '700' }
                          ]}
                        >
                          {layoutOption.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Number of Columns (Grid only) */}
                {albumLayout === 'grid' && (
                  <View style={styles.settingsSection}>
                    <Text style={[styles.settingsSectionTitle, { color: themeColors.textPrimary }]}>Number of columns</Text>
                    <View style={styles.columnsGrid}>
                      {[2, 3, 4].map((cols) => (
                        <TouchableOpacity
                          key={`cols-${cols}`}
                          style={[
                            styles.columnVisualOption,
                            {
                              borderColor: themeColors.divider,
                              backgroundColor: themeColors.background
                            },
                            albumColumns === cols && {
                              borderColor: primaryColor,
                              borderWidth: 3
                            }
                          ]}
                          onPress={() => handleChangeAlbumColumns(cols)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.columnVisual}>
                            {Array.from({ length: cols }).map((_, i) => (
                              <View
                                key={i}
                                style={[
                                  styles.columnBar,
                                  {
                                    backgroundColor: albumColumns === cols ? primaryColor : themeColors.textSecondary,
                                    opacity: albumColumns === cols ? 1 : 0.3
                                  }
                                ]}
                              />
                            ))}
                          </View>
                          <Text style={[styles.columnNumber, { color: albumColumns === cols ? primaryColor : themeColors.textSecondary }]}>
                            {cols}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Number of Columns (Masonry only) */}
                {albumLayout === 'masonry' && (
                  <View style={styles.settingsSection}>
                    <Text style={[styles.settingsSectionTitle, { color: themeColors.textPrimary }]}>Number of columns</Text>
                    <View style={styles.columnsGrid}>
                      {[2, 3, 4].map((cols) => (
                        <TouchableOpacity
                          key={`masonry-cols-${cols}`}
                          style={[
                            styles.columnVisualOption,
                            {
                              borderColor: themeColors.divider,
                              backgroundColor: themeColors.background
                            },
                            masonryColumns === cols && {
                              borderColor: primaryColor,
                              borderWidth: 3
                            }
                          ]}
                          onPress={() => handleChangeMasonryColumns(cols)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.columnVisual}>
                            {Array.from({ length: cols }).map((_, i) => (
                              <View
                                key={i}
                                style={[
                                  styles.columnBar,
                                  {
                                    backgroundColor: masonryColumns === cols ? primaryColor : themeColors.textSecondary,
                                    opacity: masonryColumns === cols ? 1 : 0.3
                                  }
                                ]}
                              />
                            ))}
                          </View>
                          <Text style={[styles.columnNumber, { color: masonryColumns === cols ? primaryColor : themeColors.textSecondary }]}>
                            {cols}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {hasPhotos ? (
          albumLayout === 'masonry' ? (
            // Masonry layout - dynamic columns with varying heights
            <View style={styles.masonryContainer}>
              {Array.from({ length: masonryColumns }).map((_, columnIndex) => (
                <View key={`column-${columnIndex}`} style={styles.masonryColumn}>
                  {photoItems
                    .filter((_, index) => index % masonryColumns === columnIndex)
                    .map((photo, indexInColumn) => {
                      // Varied aspect ratios for Pinterest-style masonry
                      // Pattern: tall, medium, short, medium, tall...
                      const aspectRatios = [0.65, 0.85, 1.1, 0.75, 0.95];
                      const aspectRatio = aspectRatios[indexInColumn % aspectRatios.length];

                      return (
                        <TouchableOpacity
                          key={photo.id}
                          style={styles.masonryItem}
                          activeOpacity={0.8}
                          onPress={() => handlePreviewPhoto(photo.downloadUrl)}
                          onLongPress={() => isOwnProfile && handleDeleteAlbumPhoto(photo)}
                          delayLongPress={250}
                        >
                          <ProgressiveImage
                            source={photo.downloadUrl}
                            thumbnail={getThumbnailUrl(photo.downloadUrl, 200, 60)}
                            blurhash={photo.blurhash || getBlurhash(photo.downloadUrl)}
                            style={[styles.masonryImage, { aspectRatio }]}
                            contentFit="cover"
                            transition={200}
                          />
                        </TouchableOpacity>
                      );
                    })}
                </View>
              ))}
            </View>
          ) : (
            // Grid layout - uniform size
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
                  <ProgressiveImage
                    source={photo.downloadUrl}
                    thumbnail={getThumbnailUrl(photo.downloadUrl, 200, 60)}
                    blurhash={photo.blurhash || getBlurhash(photo.downloadUrl)}
                    style={[styles.albumImage, { aspectRatio }]}
                    contentFit="cover"
                    transition={200}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )
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
    albumLayout,
    albumUploading,
    showAlbumSettings,
    masonryColumns,
    handleAddAlbumPhotos,
    handleDeleteAlbumPhoto,
    handleChangeAlbumColumns,
    handleChangeMasonryColumns,
    handleChangeAlbumShape,
    handleCloseSettings,
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
        <ProfileSkeleton />
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
      rightIcon={isOwnProfile ? "settings-outline" : null}
      onRightPress={isOwnProfile ? () => navigation.navigate('Settings') : null}
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
          >
            <TouchableOpacity
              style={styles.photoModalClose}
              onPress={closePhotoPreview}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={40} color="#fff" />
            </TouchableOpacity>
            {photoPreviewSource ? (
              <ProgressiveImage
                source={photoPreviewSource}
                style={styles.photoModalImage}
                contentFit="contain"
                transition={150}
                priority="high"
              />
            ) : null}
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Save Confirmation Modal */}
      <Modal
        visible={showSaveModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowSaveModal(false)}
      >
        <View style={styles.saveModalBackdrop}>
          <View style={[styles.saveModalContent, { backgroundColor: themeColors.card }]}>
            <View style={styles.saveModalHeader}>
              <Ionicons name="alert-circle-outline" size={48} color={primaryColor} />
              <Text style={[styles.saveModalTitle, { color: themeColors.textPrimary }]}>
                Save Changes?
              </Text>
              <Text style={[styles.saveModalMessage, { color: themeColors.textSecondary }]}>
                You have unsaved changes to your album layout. Would you like to save them?
              </Text>
            </View>
            <View style={styles.saveModalButtons}>
              <TouchableOpacity
                style={[styles.saveModalButton, styles.saveModalButtonDiscard, { borderColor: themeColors.divider }]}
                onPress={handleDiscardChanges}
                activeOpacity={0.7}
              >
                <Text style={[styles.saveModalButtonText, { color: themeColors.textSecondary }]}>
                  Discard
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveModalButton, styles.saveModalButtonSave, { backgroundColor: primaryColor }]}
                onPress={handleSavePreferences}
                activeOpacity={0.7}
              >
                <Text style={[styles.saveModalButtonText, { color: '#fff', fontWeight: '700' }]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
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
                <ProgressiveImage
                  source={profile.profilePhoto}
                  thumbnail={getThumbnailUrl(profile.profilePhoto, 100, 70)}
                  blurhash={profile.blurhash || getBlurhash(profile.profilePhoto)}
                  style={styles.photo}
                  contentFit="cover"
                  transition={200}
                  priority="high"
                />
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
    paddingHorizontal: 0,
  },
  albumControls: {
    gap: 12,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 20,
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
    flexDirection: 'row',
    alignItems: 'center',
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
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  settingsSection: {
    marginBottom: 20,
  },
  settingsSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  layoutOptionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  layoutOptionCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  layoutOptionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  columnsGrid: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-start',
  },
  columnVisualOption: {
    width: 90,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  columnVisual: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'flex-end',
  },
  columnBar: {
    width: 8,
    height: 24,
    borderRadius: 2,
  },
  columnNumber: {
    fontSize: 16,
    fontWeight: '700',
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
    borderRadius: 12,
    backgroundColor: '#ccc',
  },
  masonryContainer: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 0,
  },
  masonryColumn: {
    flex: 1,
    gap: 4,
  },
  masonryItem: {
    width: '100%',
  },
  masonryImage: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#ccc',
  },
  photoModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalBackdropTouchable: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalContent: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    padding: 16,
    overflow: 'hidden',
  },
  photoModalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 30,
  },
  photoModalImage: {
    width: '100%',
    height: '100%',
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
  // Save Modal Styles
  saveModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  saveModalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  saveModalHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  saveModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  saveModalMessage: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  saveModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  saveModalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveModalButtonDiscard: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  saveModalButtonSave: {
    // backgroundColor set dynamically
  },
  saveModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
