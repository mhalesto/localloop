import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { usePosts } from '../contexts/PostsContext';
import { colors } from '../constants/colors';
import ScreenLayout from '../components/ScreenLayout';
import { useSettings } from '../contexts/SettingsContext';

function AvatarIcon({ tint, size = 32, style }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" style={style}>
      <Circle cx="32" cy="24" r="12" fill={tint} />
      <Path d="M16 54C16 43.954 24.954 36 35 36H29C39.046 36 48 43.954 48 54" fill={tint} />
    </Svg>
  );
}

function BubbleTail({ fill, direction }) {
  const transform = direction === 'left' ? 'rotate(180 20 20)' : undefined;
  return (
    <Svg
      width={18}
      height={18}
      viewBox="0 0 40 40"
      style={direction === 'right' ? styles.commentTailRight : styles.commentTailLeft}
    >
      <Path d="M0 20L28 0V40L0 20Z" fill={fill} transform={transform} />
    </Svg>
  );
}

export default function PostThreadScreen({ route, navigation }) {
  const { city, postId } = route.params;
  const { addComment, getPostById } = usePosts();
  const { accentPreset } = useSettings();

  const [reply, setReply] = useState('');

  const post = getPostById(city, postId);
  const comments = useMemo(() => post?.comments ?? [], [post]);

  const handleAddComment = () => {
    if (reply.trim() === '') {
      return;
    }

    addComment(city, postId, reply);
    setReply('');
  };

  const headerColor = accentPreset.background;
  const headerTitleColor =
    accentPreset.onPrimary ?? (accentPreset.isDark ? '#fff' : colors.textPrimary);
  const headerMetaColor =
    accentPreset.metaColor ?? (accentPreset.isDark ? 'rgba(255,255,255,0.75)' : colors.textSecondary);
  const badgeBackground = accentPreset.badgeBackground ?? colors.primaryLight;
  const badgeTextColor = accentPreset.badgeTextColor ?? '#fff';
  const buttonBackground = accentPreset.buttonBackground ?? colors.primaryDark;
  const buttonForeground = accentPreset.buttonForeground ?? '#fff';
  const linkColor = accentPreset.linkColor ?? colors.primaryDark;
  const commentHighlight = `${linkColor}1A`;

  if (!post) {
    return (
      <ScreenLayout
        title="Thread"
        subtitle={`${city} Room`}
        onBack={() => navigation.goBack()}
      >
        <View style={styles.missingWrapper}>
          <View style={styles.missingCard}>
            <Text style={styles.notice}>This post is no longer available.</Text>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.primaryButton, { backgroundColor: buttonBackground }]}
              activeOpacity={0.85}
            >
              <Text style={[styles.primaryButtonText, { color: buttonForeground }]}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenLayout>
    );
  }

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
        <ScrollView
          contentContainerStyle={styles.threadContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.postCard, { backgroundColor: headerColor }]}
          >
            <View style={styles.postHeader}>
              <AvatarIcon tint={badgeBackground} size={36} style={styles.headerAvatarIcon} />
              <View>
                <Text style={[styles.postBadge, { color: badgeTextColor }]}>Anonymous</Text>
                <Text style={[styles.postCity, { color: headerMetaColor }]}>{city} Room</Text>
              </View>
            </View>
            <Text style={[styles.postMessage, { color: headerTitleColor }]}>{post.message}</Text>
            <Text style={[styles.postMeta, { color: headerMetaColor }]}>
              {comments.length === 1 ? '1 comment' : `${comments.length} comments`}
            </Text>
          </View>

          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View
                style={[styles.commentRow, item.createdByMe && styles.commentRowRight]}
              >
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
                    direction={item.createdByMe ? 'right' : 'left'}
                  />
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyState}>
                No comments yet. Be the first to reply.
              </Text>
            }
            scrollEnabled={false}
            contentContainerStyle={[
              styles.commentsContainer,
              comments.length === 0 && styles.commentsContainerEmpty
            ]}
          />

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
                { backgroundColor: buttonBackground },
                reply.trim() === '' && styles.primaryButtonDisabled
              ]}
              onPress={handleAddComment}
              disabled={reply.trim() === ''}
              activeOpacity={0.85}
            >
              <Text style={[styles.primaryButtonText, { color: buttonForeground }]}>Reply</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    paddingBottom: 20,
    paddingHorizontal: 0
  },
  threadContent: {
    paddingHorizontal: 20,
    paddingBottom: 40
  },
  postCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerAvatarIcon: {
    marginRight: 12
  },
  postBadge: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3
  },
  postCity: {
    fontSize: 12,
    marginTop: 4
  },
  postMessage: {
    fontSize: 20,
    marginBottom: 18,
    fontWeight: '500'
  },
  postMeta: {
    fontSize: 13
  },
  commentsContainer: {
    paddingBottom: 40
  },
  commentsContainerEmpty: {
    flexGrow: 1,
    justifyContent: 'center'
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16
  },
  commentRowRight: {
    flexDirection: 'row-reverse'
  },
  commentAvatarLeft: {
    marginRight: 10
  },
  commentAvatarRight: {
    marginLeft: 10
  },
  commentBubbleWrapper: {
    flex: 1,
    paddingHorizontal: 4
  },
  commentBubble: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  commentTailLeft: {
    alignSelf: 'flex-start',
    marginLeft: -10,
    marginTop: -8
  },
  commentTailRight: {
    alignSelf: 'flex-end',
    marginRight: -10,
    marginTop: -8
  },
  commentMessage: {
    fontSize: 16,
    color: colors.textPrimary
  },
  commentMeta: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600'
  },
  emptyState: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
    paddingVertical: 40
  },
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
    elevation: 3
  },
  replyLabel: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12
  },
  input: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    minHeight: 50,
    textAlignVertical: 'top',
    backgroundColor: colors.background,
    color: colors.textPrimary
  },
  primaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
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
  missingWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 40
  },
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
    elevation: 4
  },
  notice: {
    fontSize: 16,
    marginBottom: 16,
    color: colors.textPrimary,
    textAlign: 'center'
  }
});
