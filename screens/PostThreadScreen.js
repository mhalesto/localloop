import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { usePosts } from '../contexts/PostsContext';
import { colors } from '../constants/colors';
import ScreenLayout from '../components/ScreenLayout';
import { useSettings, accentPresets } from '../contexts/SettingsContext';
import { shareDestinations } from '../constants/shareDestinations';

/* Avatar used for comments; header uses a visual badge with Ionicons instead */
function AvatarIcon({ tint, size = 32, style }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" style={style}>
      <Circle cx="32" cy="24" r="12" fill={tint} />
      <Path d="M16 54C16 43.954 24.954 36 35 36H29C39.046 36 48 43.954 48 54" fill={tint} />
    </Svg>
  );
}

function BubbleTail({ fill, align }) {
  return (
    <Svg
      width={18}
      height={18}
      viewBox="0 0 40 40"
      style={align === 'right' ? styles.commentTailRight : styles.commentTailLeft}
    >
      <Path d="M0 20L28 0V40L0 20Z" fill={fill} transform={align === 'left' ? 'rotate(180 20 20)' : undefined} />
    </Svg>
  );
}

export default function PostThreadScreen({ route, navigation }) {
  const { city, postId } = route.params;
  const { addComment, getPostById, sharePost, toggleVote } = usePosts();
  const { accentPreset } = useSettings();

  const [reply, setReply] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareSearch, setShareSearch] = useState('');

  const post = getPostById(city, postId);
  const comments = useMemo(() => post?.comments ?? [], [post]);

  const handleAddComment = () => {
    if (reply.trim() === '') return;
    addComment(city, postId, reply);
    setReply('');
  };

  if (!post) {
    return (
      <ScreenLayout title="Thread" subtitle={`${city} Room`} onBack={() => navigation.goBack()}>
        <View style={styles.missingWrapper}>
          <View style={styles.missingCard}>
            <Text style={styles.notice}>This post is no longer available.</Text>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.primaryButton, { backgroundColor: accentPreset.buttonBackground }]}
              activeOpacity={0.85}
            >
              <Text style={[styles.primaryButtonText, { color: accentPreset.buttonForeground }]}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenLayout>
    );
  }

  const postPreset =
    accentPresets.find((preset) => preset.key === post.colorKey) ?? accentPreset;

  const headerColor = postPreset.background;
  const headerTitleColor = postPreset.onPrimary ?? (postPreset.isDark ? '#fff' : colors.textPrimary);
  const headerMetaColor = postPreset.metaColor ?? (postPreset.isDark ? 'rgba(255,255,255,0.75)' : colors.textSecondary);
  const badgeBackground = postPreset.badgeBackground ?? colors.primaryLight;
  const badgeTextColor = postPreset.badgeTextColor ?? '#fff';
  const linkColor = postPreset.linkColor ?? colors.primaryDark;

  const commentHighlight = `${linkColor}1A`;
  const replyButtonBackground = accentPreset.buttonBackground ?? colors.primaryDark;
  const replyButtonForeground = accentPreset.buttonForeground ?? '#fff';
  const commentCount = post.comments?.length ?? 0;

  useEffect(() => {
    if (!shareMessage) return;
    const t = setTimeout(() => setShareMessage(''), 2000);
    return () => clearTimeout(t);
  }, [shareMessage]);

  return (
    <ScreenLayout
      title="Thread"
      subtitle={`${city} Room`}
      onBack={() => navigation.goBack()}
      navigation={navigation}
      activeTab="home"
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView contentContainerStyle={styles.threadContent} showsVerticalScrollIndicator={false}>
          {/* POST CARD */}
          <View style={[styles.postCard, { backgroundColor: headerColor }]}>
            {/* Header with avatar + identity */}
            <View style={styles.postHeader}>
              <View style={[styles.avatar, { backgroundColor: badgeBackground }]}>
                <View style={styles.avatarRing} />
                <Ionicons name="person" size={22} color="#fff" />
              </View>

              <View>
                <Text style={[styles.postBadge, { color: badgeTextColor }]}>Anonymous</Text>

                {/* Hide room line if it's the same as the header room */}
                {post.sourceCity && post.sourceCity !== city ? (
                  <Text style={[styles.postCity, { color: headerMetaColor }]}>
                    {post.sourceCity} Room
                  </Text>
                ) : null}

                {/* Show only when available */}
                {post.sharedFrom?.city ? (
                  <Text style={[styles.sharedBanner, { color: headerMetaColor }]}>
                    Shared from {post.sharedFrom.city}
                  </Text>
                ) : null}
              </View>
            </View>

            <Text style={[styles.postMessage, { color: headerTitleColor }]}>{post.message}</Text>

            <Text style={[styles.postMeta, { color: headerMetaColor }]}>
              {comments.length === 1 ? '1 comment' : `${comments.length} comments`}
            </Text>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => toggleVote(city, postId, 'up')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={post.userVote === 'up' ? 'arrow-up-circle' : 'arrow-up-circle-outline'}
                  size={20}
                  color={post.userVote === 'up' ? linkColor : headerMetaColor}
                />
                <Text style={[styles.actionCount, { color: headerMetaColor }]}>{post.upvotes ?? 0}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => toggleVote(city, postId, 'down')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={post.userVote === 'down' ? 'arrow-down-circle' : 'arrow-down-circle-outline'}
                  size={20}
                  color={post.userVote === 'down' ? linkColor : headerMetaColor}
                />
                <Text style={[styles.actionCount, { color: headerMetaColor }]}>{post.downvotes ?? 0}</Text>
              </TouchableOpacity>

              <View style={[styles.actionButton, styles.commentButton]}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={headerMetaColor} />
                <Text style={[styles.actionCount, { color: headerMetaColor }]}>{commentCount}</Text>
              </View>

              <TouchableOpacity
                style={[styles.actionButton, styles.shareButton]}
                onPress={() => {
                  setShareModalVisible(true);
                  setShareSearch('');
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="paper-plane-outline" size={20} color={linkColor} />
                <Text style={[styles.actionLabel, { color: linkColor }]}>Share</Text>
              </TouchableOpacity>
            </View>

            {post.sourceCity && post.sourcePostId &&
              !(post.sourceCity === city && post.sourcePostId === post.id) ? (
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('PostThread', {
                    city: post.sourceCity,
                    postId: post.sourcePostId
                  })
                }
                activeOpacity={0.75}
              >
                <Text style={[styles.viewOriginal, { color: headerMetaColor }]}>
                  View original thread
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* COMMENTS */}
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={[styles.commentRow, item.createdByMe && styles.commentRowRight]}>
                <AvatarIcon
                  tint={badgeBackground}
                  style={item.createdByMe ? styles.commentAvatarRight : styles.commentAvatarLeft}
                />
                <View style={styles.commentBubbleWrapper}>
                  <View
                    style={[
                      styles.commentBubble,
                      item.createdByMe && {
                        backgroundColor: commentHighlight,
                        borderColor: linkColor,
                        borderWidth: 1
                      }
                    ]}
                  >
                    <Text
                      style={[
                        styles.commentMessage,
                        item.createdByMe && { color: linkColor }
                      ]}
                    >
                      {item.message}
                    </Text>
                    {item.createdByMe ? (
                      <Text style={[styles.commentMeta, { color: linkColor }]}>You replied</Text>
                    ) : null}
                  </View>
                  <BubbleTail
                    fill={item.createdByMe ? commentHighlight : colors.card}
                    align={item.createdByMe ? 'right' : 'left'}
                  />
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyState}>
                No comments yet. Be the first to reply.
              </Text>
            }
            contentContainerStyle={[
              styles.commentsContainer,
              comments.length === 0 && styles.commentsContainerEmpty
            ]}
          />

          {/* REPLY */}
          <View style={styles.replyBox}>
            <Text style={styles.replyLabel}>Add a reply</Text>
            <TextInput
              value={reply}
              onChangeText={setReply}
              placeholder="Share your thoughts..."
              style={styles.input}
              multiline
              placeholderTextColor={colors.textSecondary}
            />
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: replyButtonBackground },
                reply.trim() === '' && styles.primaryButtonDisabled
              ]}
              onPress={handleAddComment}
              disabled={reply.trim() === ''}
              activeOpacity={0.85}
            >
              <Text style={[styles.primaryButtonText, { color: replyButtonForeground }]}>Reply</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* TOAST */}
      {shareMessage ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{shareMessage}</Text>
        </View>
      ) : null}

      {/* SHARE MODAL */}
      <Modal
        visible={shareModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setShareModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Share to another room</Text>
            <TextInput
              placeholder="Search city, province, or country"
              value={shareSearch}
              onChangeText={setShareSearch}
              style={styles.modalInput}
              placeholderTextColor={colors.textSecondary}
            />
            <FlatList
              data={shareDestinations.filter(
                (option) =>
                  option.value !== city &&
                  option.label.toLowerCase().includes(shareSearch.toLowerCase())
              )}
              keyExtractor={(item) => `${item.type}-${item.label}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalOption}
                  activeOpacity={0.75}
                  onPress={() => {
                    sharePost(city, postId, item.value);
                    setShareMessage(`Shared to ${item.label}`);
                    setShareModalVisible(false);
                  }}
                >
                  <Text style={styles.modalOptionLabel}>{item.label}</Text>
                  <Text style={styles.modalOptionType}>{item.type}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.modalEmpty}>No matches found.</Text>}
              style={styles.modalList}
              keyboardShouldPersistTaps="handled"
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setShareModalVisible(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, paddingBottom: 20 },
  threadContent: { paddingHorizontal: 20, paddingBottom: 40 },

  postCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },

  /* Header */
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  // Avatar badge for post header
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },

  postBadge: { fontSize: 16, fontWeight: '700' },
  postCity: { fontSize: 12, marginTop: 4 },
  sharedBanner: { fontSize: 12, marginTop: 6 },

  postMessage: { fontSize: 20, marginBottom: 18, fontWeight: '500' },
  postMeta: { fontSize: 13, marginBottom: 12 },

  actionsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  actionButton: { flexDirection: 'row', alignItems: 'center', marginRight: 24 },
  actionCount: { fontSize: 12, marginLeft: 6 },
  actionLabel: { fontSize: 12, fontWeight: '600', marginLeft: 6 },
  commentButton: { marginRight: 24 },
  shareButton: { marginRight: 0 },

  viewOriginal: { fontSize: 12, fontWeight: '600', marginTop: 12 },

  /* Comments */
  commentsContainer: { paddingBottom: 40 },
  commentsContainerEmpty: { flexGrow: 1, justifyContent: 'center' },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
  commentRowRight: { flexDirection: 'row-reverse' },
  commentAvatarLeft: { marginRight: 10 },
  commentAvatarRight: { marginLeft: 10 },
  commentBubbleWrapper: { flex: 1, paddingHorizontal: 4 },
  commentBubble: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  commentTailLeft: { alignSelf: 'flex-start', marginLeft: -12, marginTop: -8 },
  commentTailRight: { alignSelf: 'flex-end', marginRight: -12, marginTop: -8 },
  commentMessage: { fontSize: 16, color: colors.textPrimary },
  commentMeta: { marginTop: 8, fontSize: 12, fontWeight: '600' },

  /* Reply box */
  replyBox: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    marginTop: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  replyLabel: { color: colors.textPrimary, fontSize: 16, fontWeight: '500', marginBottom: 12 },
  input: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    minHeight: 50,
    textAlignVertical: 'top',
    backgroundColor: colors.background,
    color: colors.textPrimary,
  },
  primaryButton: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center' },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { fontSize: 16, fontWeight: '600' },

  /* Toast */
  toast: {
    position: 'absolute',
    bottom: 140,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  toastText: { color: '#fff', fontSize: 12 },

  /* Share modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 24 },
  modalCard: {
    borderRadius: 20,
    backgroundColor: colors.card,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 12 },
  modalInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  modalList: { maxHeight: 240 },
  modalOption: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider },
  modalOptionLabel: { fontSize: 14, color: colors.textPrimary, fontWeight: '600' },
  modalOptionType: { fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase' },
  modalEmpty: { textAlign: 'center', color: colors.textSecondary, fontSize: 13, paddingVertical: 20 },
  modalClose: { marginTop: 12, alignSelf: 'center' },
  modalCloseText: { color: colors.textPrimary, fontWeight: '600', fontSize: 14 },

  /* Missing state */
  missingWrapper: { flex: 1, justifyContent: 'center', paddingBottom: 40 },
  missingCard: {
    margin: 20,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  notice: { fontSize: 16, marginBottom: 16, color: colors.textPrimary, textAlign: 'center' },
});
