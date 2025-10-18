import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import PostItem from '../components/PostItem';
import { usePosts } from '../contexts/PostsContext';
import { colors } from '../constants/colors';
import ScreenLayout from '../components/ScreenLayout';
import { useSettings, accentPresets } from '../contexts/SettingsContext';
import ShareLocationModal from '../components/ShareLocationModal';

export default function RoomScreen({ navigation, route }) {
  const { city } = route.params;
  const { addPost, getPostsForCity, sharePost, toggleVote } = usePosts();
  const { accentPreset, accentKey, userProfile } = useSettings();
  const posts = getPostsForCity(city);

  const [message, setMessage] = useState('');
  const [selectedColorKey, setSelectedColorKey] = useState(accentKey);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [postToShare, setPostToShare] = useState(null);
  const [shareToast, setShareToast] = useState('');

  useEffect(() => {
    setSelectedColorKey(accentKey);
  }, [accentKey]);

  useEffect(() => {
    if (!shareToast) {
      return;
    }
    const timeout = setTimeout(() => setShareToast(''), 2000);
    return () => clearTimeout(timeout);
  }, [shareToast]);

  const { totalPosts, totalComments, averageReplies } = useMemo(() => {
    const postCount = posts.length;
    const commentCount = posts.reduce(
      (sum, post) => sum + (post.comments?.length ?? 0),
      0
    );

    const average =
      postCount === 0 ? 0 : Number((commentCount / postCount).toFixed(1));

    return {
      totalPosts: postCount,
      totalComments: commentCount,
      averageReplies: average
    };
  }, [posts]);

  const listData = useMemo(
    () => [{ type: 'composer', key: 'composer' }, ...posts.map((post) => ({ type: 'post', key: post.id, data: post }))],
    [posts]
  );

  const subtitleColor = accentPreset.subtitleColor ?? (accentPreset.isDark ? 'rgba(255,255,255,0.8)' : colors.textSecondary);
  const titleColor = accentPreset.onPrimary ?? (accentPreset.isDark ? '#fff' : colors.textPrimary);
  const metaColor = accentPreset.metaColor ?? (accentPreset.isDark ? 'rgba(255,255,255,0.75)' : colors.textSecondary);
  const statCardBackground = accentPreset.statCardBackground ?? (accentPreset.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(108,77,244,0.12)');
  const statValueColor = accentPreset.statValue ?? (accentPreset.isDark ? '#fff' : colors.primaryDark);
  const statLabelColor = accentPreset.statLabel ?? (accentPreset.isDark ? 'rgba(255,255,255,0.8)' : colors.textSecondary);
  const buttonBackground = accentPreset.buttonBackground ?? colors.primaryDark;
  const buttonForeground = accentPreset.buttonForeground ?? '#fff';
  const shareAccentColor = accentPreset.linkColor ?? colors.primaryDark;

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
      sharePost(city, postToShare.id, targetCity, userProfile);
      setShareToast(`Shared to ${targetCity}`);
      closeShareModal();
    },
    [city, closeShareModal, postToShare, sharePost, userProfile]
  );

  const handleAddPost = () => {
    if (message.trim() === '') return;
    addPost(city, message, selectedColorKey, userProfile);
    setMessage('');
  };

  const handleOpenPost = (postId) => {
    navigation.navigate('PostThread', { city, postId });
  };


  const renderStickyHeader = () => (
    <View style={[styles.stickyHeaderWrapper, { backgroundColor: accentPreset.background }]}>
      <View style={[styles.headerCard, { backgroundColor: accentPreset.background }]}>
        <View style={styles.headerTitleRow}>
          <Text style={[styles.headerSubtitle, { color: subtitleColor }]}>Anonymous room</Text>
          <Text style={[styles.headerTitle, { color: titleColor }]}>{city}</Text>
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
                  borderColor: isActive ? colors.textPrimary : 'transparent'
                }
              ]}
            />
          );
        })}
      </View>
      <TextInput
        placeholder="What's happening in this room?"
        value={message}
        onChangeText={setMessage}
        multiline
        style={styles.input}
        placeholderTextColor={colors.textSecondary}
      />
      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: buttonBackground }, message.trim() === '' && styles.primaryButtonDisabled]}
        onPress={handleAddPost}
        activeOpacity={0.85}
        disabled={message.trim() === ''}
      >
        <Text style={[styles.primaryButtonText, { color: buttonForeground }]}>Post</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }) => {
    if (item.type === 'composer') {
      return renderComposer();
    }

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

const styles = StyleSheet.create({
  screenContent: {
    paddingTop: 0,
    paddingHorizontal: 0,
    backgroundColor: colors.background
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
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6
  },
  headerTitleRow: {
    marginBottom: 20,
    flexDirection: 'column'
  },
  headerSubtitle: {
    fontSize: 14,
    marginBottom: 4
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600'
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
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  composerLabel: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12
  },
  composerHint: {
    fontSize: 12,
    color: colors.textSecondary,
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
  input: {
    minHeight: 70,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    textAlignVertical: 'top',
    color: colors.textPrimary,
    marginBottom: 12
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
