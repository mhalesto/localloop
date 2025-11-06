/**
 * MentionTextInput - TextInput with @username autocomplete
 *
 * Features:
 * - Detects @ symbol and shows user autocomplete
 * - Searches users as you type
 * - Inserts selected username
 */

import React, { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, limit as limitQuery, getDocs } from 'firebase/firestore';
import { db } from '../api/firebaseClient';
import { parseMentionsForDisplay } from '../utils/mentionUtils';

const MentionTextInput = forwardRef(({
  value,
  onChangeText,
  placeholder,
  multiline = false,
  style,
  textColor = '#000000',
  placeholderColor = '#999999',
  accentColor = '#6C4DF4',
  backgroundColor = '#ffffff',
  maxLength,
  autoFocus = false,
  onSubmitEditing,
  blurOnSubmit = false,
  returnKeyType = 'send',
  showFormattedPreview = false, // Show formatted text with highlighted mentions below input
  ...otherProps
}, ref) => {
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  const [mentionResults, setMentionResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Expose focus method to parent component
  useImperativeHandle(ref, () => ({
    focus: () => {
      textInputRef.current?.focus();
    },
    setNativeProps: (props) => {
      textInputRef.current?.setNativeProps(props);
    },
  }));

  // Search for users when mention query changes
  useEffect(() => {
    if (!mentionSearchQuery) {
      setMentionResults([]);
      setIsSearching(false);
      return;
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const usersRef = collection(db, 'users');
        const searchLower = mentionSearchQuery.toLowerCase();

        // Search by username
        const q = query(
          usersRef,
          where('username', '>=', searchLower),
          where('username', '<=', searchLower + '\uf8ff'),
          limitQuery(5)
        );

        const snapshot = await getDocs(q);
        const users = snapshot.docs.map((doc) => ({
          id: doc.id,
          username: doc.data().username,
          displayName: doc.data().displayName,
          profilePhoto: doc.data().profilePhoto,
        }));

        setMentionResults(users);
      } catch (error) {
        console.error('[MentionTextInput] Search error:', error);
        setMentionResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [mentionSearchQuery]);

  // Handle text change
  const handleTextChange = useCallback(
    (text) => {
      onChangeText(text);

      // Find the last @ before cursor
      const beforeCursor = text.substring(0, cursorPosition);
      const lastAtIndex = beforeCursor.lastIndexOf('@');

      if (lastAtIndex !== -1) {
        // Check if there's a space after @
        const afterAt = beforeCursor.substring(lastAtIndex + 1);
        if (afterAt && !afterAt.includes(' ')) {
          // We're in a mention
          setMentionSearchQuery(afterAt);
          setShowMentionDropdown(true);
          return;
        }
      }

      // Not in a mention
      setShowMentionDropdown(false);
      setMentionSearchQuery('');
    },
    [onChangeText, cursorPosition]
  );

  // Handle selection change (cursor position)
  const handleSelectionChange = useCallback((event) => {
    const { start } = event.nativeEvent.selection;
    setCursorPosition(start);
  }, []);

  // Insert mention at cursor position
  const insertMention = useCallback(
    (username) => {
      const beforeCursor = value.substring(0, cursorPosition);
      const afterCursor = value.substring(cursorPosition);

      // Find the @ before cursor
      const lastAtIndex = beforeCursor.lastIndexOf('@');
      if (lastAtIndex === -1) return;

      // Replace from @ to cursor with @username
      const before = beforeCursor.substring(0, lastAtIndex);
      const newText = `${before}@${username} ${afterCursor}`;
      const newCursorPos = lastAtIndex + username.length + 2; // +2 for @ and space

      onChangeText(newText);
      setShowMentionDropdown(false);
      setMentionSearchQuery('');

      // Set cursor position after username
      setTimeout(() => {
        if (textInputRef.current) {
          textInputRef.current.focus();
          textInputRef.current.setNativeProps({
            selection: { start: newCursorPos, end: newCursorPos },
          });
        }
      }, 0);
    },
    [value, cursorPosition, onChangeText]
  );

  const renderMentionItem = ({ item, index }) => {
    const isLast = index === mentionResults.length - 1;
    return (
      <TouchableOpacity
        style={[
          styles.mentionItem,
          {
            backgroundColor: backgroundColor,
            borderBottomColor: textColor + '15', // Use theme color with transparency
            borderBottomWidth: isLast ? 0 : 1, // Remove border on last item
          }
        ]}
        onPress={() => insertMention(item.username)}
        activeOpacity={0.7}
      >
        <View style={[styles.mentionAvatar, { backgroundColor: accentColor + '20' }]}>
          {item.profilePhoto ? (
            <Image source={{ uri: item.profilePhoto }} style={styles.mentionAvatarImage} />
          ) : (
            <Ionicons name="person" size={20} color={accentColor} />
          )}
        </View>
        <View style={styles.mentionInfo}>
          <Text style={[styles.mentionUsername, { color: textColor }]}>@{item.username}</Text>
          {item.displayName && (
            <Text style={[styles.mentionDisplayName, { color: placeholderColor }]}>
              {item.displayName}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Parse mentions for preview
  const hasMentions = value && value.includes('@');
  const formattedParts = hasMentions ? parseMentionsForDisplay(value, accentColor) : [];

  return (
    <View style={styles.container}>
      {showFormattedPreview && hasMentions ? (
        // Show formatted preview with highlighted mentions
        <View style={[styles.previewContainer, { backgroundColor }, style]}>
          <Text numberOfLines={1} style={{ flexShrink: 1 }}>
            {formattedParts.map((part, index) => (
              <Text
                key={`part-${index}`}
                style={[
                  part.isMention
                    ? { color: part.color || accentColor, fontWeight: '600' }
                    : { color: textColor }
                ]}
              >
                {part.text}
              </Text>
            ))}
          </Text>
        </View>
      ) : (
        // Show regular TextInput
        <TextInput
          ref={textInputRef}
          value={value}
          onChangeText={handleTextChange}
          onSelectionChange={handleSelectionChange}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          multiline={multiline}
          style={[styles.input, { color: textColor }, style]}
          maxLength={maxLength}
          autoFocus={autoFocus}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={blurOnSubmit}
          returnKeyType={returnKeyType}
          {...otherProps}
        />
      )}

      {showMentionDropdown && (mentionResults.length > 0 || isSearching) && (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: backgroundColor,
              borderWidth: 1,
              borderColor: textColor + '20', // Add subtle border
            }
          ]}
        >
          {isSearching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={accentColor} />
              <Text style={[styles.loadingText, { color: placeholderColor }]}>
                Searching users...
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
            >
              {mentionResults.map((item, index) => (
                <View key={item.id}>
                  {renderMentionItem({ item, index })}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
});

MentionTextInput.displayName = 'MentionTextInput';

export default MentionTextInput;

const styles = StyleSheet.create({
  container: {
    flex: 1, // Take available space in row layout
    position: 'relative',
  },
  input: {
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  previewContainer: {
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 40,
  },
  dropdown: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    maxHeight: 200,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 8,
    overflow: 'hidden', // Ensure rounded corners work
  },
  list: {
    borderRadius: 12,
  },
  mentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    // borderBottomWidth and borderBottomColor set dynamically
  },
  mentionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mentionAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  mentionInfo: {
    flex: 1,
    justifyContent: 'center', // Center text vertically
  },
  mentionUsername: {
    fontSize: 16,
    fontWeight: '600',
  },
  mentionDisplayName: {
    fontSize: 14,
    marginTop: 2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
});
