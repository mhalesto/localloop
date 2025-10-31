import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PostItem from '../components/PostItem';
import { usePosts } from '../contexts/PostsContext';
import ScreenLayout from '../components/ScreenLayout';
import { useSettings, accentPresets } from '../contexts/SettingsContext';
import { getAvatarConfig } from '../constants/avatars';
import ShareLocationModal from '../components/ShareLocationModal';
import { useAuth } from '../contexts/AuthContext';
import AccentBackground from '../components/AccentBackground';
import { analyzePostContent } from '../services/moderationService';

export default function RoomScreen({ navigation, route }) {
  const { city } = route.params;
  const { addPost, getPostsForCity, sharePost, toggleVote } = usePosts();
  const { accentPreset, accentKey, userProfile, themeColors, isDarkMode, themeDarkness = 0 } = useSettings();
  const { user: firebaseUser } = useAuth();
  const posts = getPostsForCity(city);
  const styles = useMemo(() => createStyles(themeColors, { isDarkMode }), [themeColors, isDarkMode]);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedColorKey, setSelectedColorKey] = useState(accentKey);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [postToShare, setPostToShare] = useState(null);
  const [shareToast, setShareToast] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const selectedPreset = useMemo(
    () => accentPresets.find((preset) => preset.key === selectedColorKey) ?? accentPresets[0],
    [selectedColorKey]
  );
  const authorAvatarConfig = useMemo(
    () => getAvatarConfig(userProfile?.avatarKey),
    [userProfile?.avatarKey]
  );

  useEffect(() => {
    setSelectedColorKey(accentKey);
  }, [accentKey]);

  useEffect(() => {
    if (!shareToast) return;
    const timeout = setTimeout(() => setShareToast(''), 2000);
    return () => clearTimeout(timeout);
  }, [shareToast]);

  const { totalPosts, totalComments, averageReplies } = useMemo(() => {
    const postCount = posts.length;
    const commentCount = posts.reduce((sum, post) => sum + (post.comments?.length ?? 0), 0);
    const average = postCount === 0 ? 0 : Number((commentCount / postCount).toFixed(1));
    return { totalPosts: postCount, totalComments: commentCount, averageReplies: average };
  }, [posts]);

  const listData = useMemo(
    () => [{ type: 'composer', key: 'composer' }, ...posts.map((post) => ({ type: 'post', key: post.id, data: post }))],
    [posts]
  );

  const metaColor = accentPreset.metaColor ?? (accentPreset.isDark ? 'rgba(255,255,255,0.75)' : themeColors.textSecondary);
  const statCardBackground = accentPreset.statCardBackground ?? (accentPreset.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(108,77,244,0.12)');
  const statValueColor = accentPreset.statValue ?? (accentPreset.isDark ? '#fff' : themeColors.primaryDark);
  const statLabelColor = accentPreset.statLabel ?? (accentPreset.isDark ? 'rgba(255,255,255,0.8)' : themeColors.textSecondary);
  const buttonBackground = accentPreset.buttonBackground ?? themeColors.primaryDark;
  const buttonForeground = accentPreset.buttonForeground ?? '#fff';
  const shareAccentColor = accentPreset.linkColor ?? themeColors.primaryDark;

  const openShareModal = useCallback((post) => {
    setPostToShare(post);
    setShareModalVisible(true);
  }, []);

  const closeShareModal = useCallback(() => {
    setShareModalVisible(false);
    setPostToShare(null);
  }, []);

  const handleShareCity = useCallback(
    (targetCity) => {
      if (!postToShare || !targetCity || targetCity === city) {
        closeShareModal();
        return;
      }
      if (!firebaseUser?.uid) {
        Alert.alert('Sign in required', 'Sign in to share posts to another room.');
        closeShareModal();
        return;
      }
      const shared = sharePost(city, postToShare.id, targetCity, userProfile);
      if (shared) {
        setShareToast(`Shared to ${targetCity}`);
      } else {
        Alert.alert('Unable to share', 'We could not share that post right now. Please try again soon.');
      }
      closeShareModal();
    },
    [city, closeShareModal, firebaseUser?.uid, postToShare, sharePost, userProfile]
  );

  const handleAddPost = useCallback(async () => {
    if (isPublishing) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    if (!firebaseUser?.uid) {
      Alert.alert('Sign in required', 'Sign in to publish posts to this room.');
      return;
    }
    setIsPublishing(true);
    try {
      let moderation = null;
      try {
        moderation = await analyzePostContent({ title: trimmedTitle, message });
      } catch (error) {
        console.warn('[RoomScreen] moderation analyze failed', error);
      }

      if (moderation?.action === 'block') {
        const reasons = (moderation.matchedLabels ?? []).join(', ') || 'policy violation';
        Alert.alert('Post blocked', `This post appears to contain ${reasons}. Please revise and try again.`);
        return;
      }
      if (moderation?.action === 'review') {
        const reasons = (moderation.matchedLabels ?? []).join(', ') || 'sensitive content';
        Alert.alert('Pending review', `This post contains ${reasons}. It will be submitted for review before being visible to others.`);
      }

      const created = addPost(
        city,
        trimmedTitle,
        message,
        selectedColorKey,
        {
          ...userProfile,
          nickname: userProfile?.nickname ?? '',
          city,
          province: userProfile?.province ?? '',
          country: userProfile?.country ?? '',
          avatarKey: userProfile?.avatarKey ?? 'default',
          uid: firebaseUser.uid
        },
        false,
        moderation ?? null
      );
      if (!created) {
        Alert.alert('Unable to publish', 'We could not create that post. Please try again in a moment.');
        return;
      }
      setTitle('');
      setMessage('');
      navigation.navigate('MyPosts', { focusPostId: created.id, pendingPost: { ...created, city } });
    } finally {
      setIsPublishing(false);
    }
  }, [
    addPost,
    navigation,
    city,
    firebaseUser?.uid,
    isPublishing,
    message,
    selectedColorKey,
    title,
    userProfile
  ]);

  const handleOpenPost = (postId) => {
    navigation.navigate('PostThread', { city, postId });
  };

  const renderStickyHeader = () => (
    <View style={[styles.stickyHeaderWrapper, { backgroundColor: accentPreset.background }]}>
      <View style={[styles.headerCard, { backgroundColor: accentPreset.background }]}>
        <AccentBackground accent={accentPreset} style={styles.headerCardBackground} darkness={themeDarkness} />
        <View style={styles.headerTitleRow}>
          <Text style={[styles.headerMeta, { color: metaColor }]}>Today&apos;s pulse</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={[styles.statCardBase, styles.statCardLeft, { backgroundColor: statCardBackground }]}>
            <Text style={[styles.statValue, { color: statValueColor }]}>{totalPosts}</Text>
            <Text style={[styles.statLabel, { color: statLabelColor }]}>Posts</Text>
          </View>
          <View style={[styles.statCardBase, styles.statCardMiddle, { backgroundColor: statCardBackground }]}>
            <Text style={[styles.statValue, { color: statValueColor }]}>{totalComments}</Text>
            <Text style={[styles.statLabel, { color: statLabelColor }]}>Comments</Text>
          </View>
          <View style={[styles.statCardBase, styles.statCardRight, { backgroundColor: statCardBackground }]}>
            <Text style={[styles.statValue, { color: statValueColor }]}>{averageReplies}</Text>
            <Text style={[styles.statLabel, { color: statLabelColor }]}>Avg Replies</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const previewPrimary = selectedPreset.onPrimary ?? (selectedPreset.isDark ? '#fff' : themeColors.textPrimary);
  const previewMeta = selectedPreset.metaColor ?? (selectedPreset.isDark ? 'rgba(255,255,255,0.75)' : themeColors.textSecondary);

  const renderComposer = () => (
    <View style={styles.composerCard}>
      <Text style={styles.composerLabel}>Drop a new post</Text>
      <Text style={styles.composerHint}>Pick a vibe for your card</Text>
      <View style={styles.composerSwatches}>
        {accentPresets.map((preset) => {
          const isActive = preset.key === selectedColorKey;
          return (
            <TouchableOpacity
              key={preset.key}
              activeOpacity={0.85}
              onPress={() => setSelectedColorKey(preset.key)}
              style={[
                styles.colorDot,
                {
                  backgroundColor: preset.background,
                  borderColor: isActive ? themeColors.textPrimary : 'transparent'
                }
              ]}
            />
          );
        })}
      </View>
      <View style={[styles.previewCard, { backgroundColor: selectedPreset.background }]}>
        <View style={styles.previewHeaderRow}>
          <View style={[styles.previewAvatar, { backgroundColor: authorAvatarConfig.backgroundColor ?? previewPrimary }]}>
            {authorAvatarConfig.icon ? (
              <Ionicons
                name={authorAvatarConfig.icon.name}
                size={18}
                color={authorAvatarConfig.icon.color ?? '#fff'}
              />
            ) : (
              <Text style={[styles.previewAvatarEmoji, { color: authorAvatarConfig.foregroundColor ?? '#fff' }]}>
                {authorAvatarConfig.emoji ?? '🙂'}
              </Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.previewTitle, { color: previewPrimary }]}>
              {userProfile?.nickname?.trim() || 'Anonymous'}
            </Text>
            <Text style={[styles.previewMeta, { color: previewMeta }]}>{city} Room</Text>
          </View>
        </View>
        <TextInput
          placeholder="Post title"
          value={title}
          onChangeText={setTitle}
          style={[styles.previewTitleInput, { color: previewPrimary }]}
          placeholderTextColor={previewMeta}
          returnKeyType="next"
        />
        <TextInput
          placeholder="What's happening in this room?"
          value={message}
          onChangeText={setMessage}
          multiline
          style={[styles.previewInput, { color: previewPrimary }]}
          placeholderTextColor={previewMeta}
        />
      </View>
      <TouchableOpacity
        style={[
          styles.primaryButton,
          { backgroundColor: buttonBackground },
          (!title.trim() || isPublishing) && styles.primaryButtonDisabled,
        ]}
        onPress={handleAddPost}
        activeOpacity={0.85}
        disabled={!title.trim() || isPublishing}
      >
        <Text style={[styles.primaryButtonText, { color: buttonForeground }]}>Post</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }) => {
    if (item.type === 'composer') return renderComposer();
    return (
      <PostItem
        post={item.data}
        onPress={() => handleOpenPost(item.data.id)}
        roomName={city}
        onReact={(direction) => toggleVote(city, item.data.id, direction)}
        onShare={() => openShareModal(item.data)}
        onViewOriginal={
          item.data.sourcePostId && item.data.sourceCity &&
            !(item.data.sourceCity === city && item.data.sourcePostId === item.data.id)
            ? () =>
              navigation.navigate('PostThread', {
                city: item.data.sourceCity,
                postId: item.data.sourcePostId
              })
            : undefined
        }
      />
    );
  };

  return (
    <ScreenLayout
      title={city}
      subtitle="Anonymous room"
      onBack={() => navigation.goBack()}
      navigation={navigation}
      activeTab="home"
      contentStyle={styles.screenContent}
      headerStyle={styles.flatHeader}
    >
      <FlatList
        style={styles.postsListWrapper}
        data={listData}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        ListHeaderComponent={renderStickyHeader}
        stickyHeaderIndices={[0]}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
      <ShareLocationModal
        visible={shareModalVisible}
        onClose={closeShareModal}
        onSelectCity={(destinationCity) => handleShareCity(destinationCity)}
        originCity={city}
        accentColor={shareAccentColor}
        initialCountry={userProfile.country || undefined}
        initialProvince={userProfile.province || undefined}
      />
      {shareToast ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{shareToast}</Text>
        </View>
      ) : null}
    </ScreenLayout>
  );
}

const createStyles = (palette, { isDarkMode } = {}) =>
  StyleSheet.create({
    screenContent: {
      paddingTop: 0,
      paddingHorizontal: 0,
      backgroundColor: palette.background
    },
    flatHeader: {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
      elevation: 0
    },
    listContainer: {
      paddingBottom: 80
    },
    stickyHeaderWrapper: {
      backgroundColor: 'transparent',
      paddingBottom: 24
    },
    headerCard: {
      backgroundColor: palette.card,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 24,
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.25 : 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
      overflow: 'hidden'
    },
    headerCardBackground: {
      ...StyleSheet.absoluteFillObject
    },
    headerTitleRow: {
      marginBottom: 20,
      flexDirection: 'column'
    },
    headerMeta: {
      fontSize: 14,
      marginTop: 6
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between'
    },
    statCardBase: {
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 12,
      alignItems: 'center',
      flex: 1
    },
    statCardLeft: {
      marginRight: 12
    },
    statCardMiddle: {
      marginHorizontal: 6
    },
    statCardRight: {
      marginLeft: 12
    },
    statValue: {
      fontSize: 20,
      fontWeight: '600'
    },
    statLabel: {
      fontSize: 12,
      marginTop: 4
    },
    composerCard: {
      backgroundColor: palette.card,
      borderRadius: 16,
      padding: 18,
      marginHorizontal: 20,
      marginTop: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.18 : 0.05,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2
    },
    composerLabel: {
      color: palette.textPrimary,
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 12
    },
    composerHint: {
      fontSize: 12,
      color: palette.textSecondary,
      marginBottom: 12
    },
    composerSwatches: {
      flexDirection: 'row',
      marginBottom: 12
    },
    colorDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      marginRight: 10,
      borderWidth: 2
    },
    previewCard: {
      borderRadius: 18,
      padding: 18,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.18 : 0.05,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2
    },
    previewHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12
    },
    previewAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10
    },
    previewAvatarEmoji: {
      fontSize: 18
    },
    previewTitle: {
      fontSize: 16,
      fontWeight: '700'
    },
    previewMeta: {
      fontSize: 12,
      marginTop: 4
    },
    previewTitleInput: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 10,
    },
    previewInput: {
      minHeight: 80,
      fontSize: 16,
      fontWeight: '500',
      textAlignVertical: 'top'
    },
    primaryButton: {
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center'
    },
    primaryButtonDisabled: {
      opacity: 0.6
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: '600'
    },
    postsListWrapper: {
      flex: 1
    },
    toast: {
      position: 'absolute',
      bottom: 140,
      left: 20,
      right: 20,
      backgroundColor: 'rgba(0,0,0,0.75)',
      paddingVertical: 10,
      borderRadius: 12,
      alignItems: 'center'
    },
    toastText: {
      color: '#fff',
      fontSize: 12
    }
  });
