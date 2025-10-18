// screens/PostThreadScreen.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePosts } from '../contexts/PostsContext';
import { colors } from '../constants/colors';
import ScreenLayout from '../components/ScreenLayout';
import { useSettings, accentPresets } from '../contexts/SettingsContext';
import { fetchCountries, fetchStates, fetchCities } from '../services/locationService';

/* Simple circular avatar (no arrow/tail) */
function AvatarIcon({ tint, size = 32, style }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" style={style}>
      <Circle cx="32" cy="24" r="12" fill={tint} />
      <Path d="M16 54C16 43.954 24.954 36 35 36H29C39.046 36 48 43.954 48 54" fill={tint} />
    </Svg>
  );
}

export default function PostThreadScreen({ route, navigation }) {
  const { city, postId } = route.params;
  const { addComment, getPostById, sharePost, toggleVote } = usePosts();
  const { accentPreset } = useSettings();
  const insets = useSafeAreaInsets();

  const [reply, setReply] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareSearch, setShareSearch] = useState('');
  const [shareStep, setShareStep] = useState('country');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState('');
  const [countryOptions, setCountryOptions] = useState([]);
  const [provinceCache, setProvinceCache] = useState({});
  const [cityCache, setCityCache] = useState({});
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedProvince, setSelectedProvince] = useState(null);
  const shareFetchTracker = useRef({
    countries: false,
    provinces: new Set(),
    cities: new Set(),
  });

  const loadCountries = useCallback(async () => {
    if (countryOptions.length > 0) {
      return;
    }
    const tracker = shareFetchTracker.current;
    if (tracker.countries) {
      return;
    }
    tracker.countries = true;
    try {
      setShareLoading(true);
      const data = await fetchCountries();
      const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name));
      setCountryOptions(sorted);
      setShareError('');
    } catch (error) {
      setShareError('Unable to load countries right now.');
    } finally {
      tracker.countries = false;
      setShareLoading(false);
    }
  }, [countryOptions.length]);

  const loadProvinces = useCallback(
    async (countryName) => {
      if (!countryName || provinceCache[countryName]) {
        return;
      }
      const tracker = shareFetchTracker.current;
      if (tracker.provinces.has(countryName)) {
        return;
      }
      tracker.provinces.add(countryName);
      try {
        setShareLoading(true);
        const states = await fetchStates(countryName);
        const sorted = [...(states ?? [])].sort((a, b) => a.localeCompare(b));
        setProvinceCache((prev) => ({ ...prev, [countryName]: sorted }));
        setShareError('');
      } catch (error) {
        setShareError('Unable to load provinces right now.');
      } finally {
        tracker.provinces.delete(countryName);
        setShareLoading(false);
      }
    },
    [provinceCache]
  );

  const loadCities = useCallback(
    async (countryName, provinceName) => {
      if (!countryName || !provinceName) {
        return;
      }
      const cacheKey = `${countryName}::${provinceName}`;
      if (cityCache[cacheKey]) {
        return;
      }
      const tracker = shareFetchTracker.current;
      if (tracker.cities.has(cacheKey)) {
        return;
      }
      tracker.cities.add(cacheKey);
      try {
        setShareLoading(true);
        const results = await fetchCities(countryName, provinceName);
        const unique = Array.from(
          new Set((results ?? []).filter((name) => typeof name === 'string' && name.trim().length > 0))
        ).sort((a, b) => a.localeCompare(b));
        setCityCache((prev) => ({ ...prev, [cacheKey]: unique }));
        setShareError('');
      } catch (error) {
        setShareError('Unable to load cities right now.');
      } finally {
        tracker.cities.delete(cacheKey);
        setShareLoading(false);
      }
    },
    [cityCache]
  );

  // UI state: composer height & keyboard offset (so composer sits above keyboard)
  const [composerH, setComposerH] = useState(68);
  const [kbOffset, setKbOffset] = useState(0);

  const post = getPostById(city, postId);
  const comments = useMemo(() => post?.comments ?? [], [post]);

  // --- Keyboard listeners (robust with absolute-positioned composer)
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e) => {
      const h = e?.endCoordinates?.height ?? 0;
      setKbOffset(Math.max(0, h - (insets.bottom || 0)));
    };
    const onHide = () => setKbOffset(0);

    const s1 = Keyboard.addListener(showEvt, onShow);
    const s2 = Keyboard.addListener(hideEvt, onHide);
    return () => {
      s1.remove();
      s2.remove();
    };
  }, [insets.bottom]);

  // Add comment
  const handleAddComment = () => {
    const t = reply.trim();
    if (!t) return;
    addComment(city, postId, t);
    setReply('');
  };

  const openShareModal = useCallback(() => {
    setShareModalVisible(true);
    setShareStep('country');
    setSelectedCountry(null);
    setSelectedProvince(null);
    setShareSearch('');
    setShareError('');
  }, []);

  const closeShareModal = useCallback(() => {
    setShareModalVisible(false);
    setShareSearch('');
    setShareError('');
    setShareLoading(false);
  }, []);

  const handleShareBack = useCallback(() => {
    if (shareStep === 'city') {
      setShareStep('province');
      setSelectedProvince(null);
    } else if (shareStep === 'province') {
      setShareStep('country');
      setSelectedCountry(null);
      setSelectedProvince(null);
    }
    setShareSearch('');
    setShareError('');
  }, [shareStep]);

  const handleSelectShareOption = useCallback(
    async (option) => {
      if (shareStep === 'country') {
        const country = option.data;
        setSelectedCountry(country);
        setSelectedProvince(null);
        setShareStep('province');
        setShareSearch('');
        setShareError('');
        await loadProvinces(country.name);
        return;
      }

      if (shareStep === 'province') {
        const provinceName = option.data;
        setSelectedProvince(provinceName);
        setShareStep('city');
        setShareSearch('');
        setShareError('');
        if (selectedCountry) {
          await loadCities(selectedCountry.name, provinceName);
        }
        return;
      }

      if (shareStep === 'city') {
        const targetCity = option.data;
        sharePost(city, postId, targetCity);
        setShareMessage(`Shared to ${targetCity}`);
        closeShareModal();
      }
    },
    [city, closeShareModal, loadCities, loadProvinces, postId, selectedCountry, sharePost, shareStep]
  );

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

  // Palette pulled from the post's preset, falling back to the screen preset
  const postPreset = accentPresets.find((p) => p.key === post.colorKey) ?? accentPreset;
  const headerColor = postPreset.background;
  const headerTitleColor = postPreset.onPrimary ?? (postPreset.isDark ? '#fff' : colors.textPrimary);
  const headerMetaColor =
    postPreset.metaColor ?? (postPreset.isDark ? 'rgba(255,255,255,0.75)' : colors.textSecondary);
  const badgeBackground = postPreset.badgeBackground ?? colors.primaryLight;
  const badgeTextColor = postPreset.badgeTextColor ?? '#fff';
  const linkColor = postPreset.linkColor ?? colors.primaryDark;
  const dividerColor = postPreset.isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.08)';
  const commentHighlight = `${linkColor}1A`;
  const replyButtonBackground = accentPreset.buttonBackground ?? colors.primaryDark;
  const replyButtonForeground = accentPreset.buttonForeground ?? '#fff';

  const showViewOriginal =
    post.sourceCity && post.sourcePostId && !(post.sourceCity === city && post.sourcePostId === post.id);

  useEffect(() => {
    if (!shareMessage) return;
    const t = setTimeout(() => setShareMessage(''), 2000);
    return () => clearTimeout(t);
  }, [shareMessage]);

  useEffect(() => {
    if (!shareModalVisible) {
      return;
    }
    if (shareStep === 'country') {
      loadCountries();
    } else if (shareStep === 'province' && selectedCountry) {
      loadProvinces(selectedCountry.name);
    } else if (shareStep === 'city' && selectedCountry && selectedProvince) {
      loadCities(selectedCountry.name, selectedProvince);
    }
  }, [
    loadCities,
    loadCountries,
    loadProvinces,
    selectedCountry,
    selectedProvince,
    shareModalVisible,
    shareStep,
  ]);

  const shareSearchPlaceholder =
    shareStep === 'country'
      ? 'Search countries'
      : shareStep === 'province'
      ? 'Search provinces or states'
      : 'Search cities';

  const shareStepTitle =
    shareStep === 'country'
      ? 'Choose a country'
      : shareStep === 'province'
      ? `Choose a province in ${selectedCountry?.name ?? 'this country'}`
      : `Choose a city in ${selectedProvince ?? 'this province'}`;

  const currentOptions = useMemo(() => {
    if (shareStep === 'country') {
      return countryOptions.map((item) => ({
        key: item.iso2 ?? item.name,
        label: item.name,
        subtitle: 'Country',
        data: item,
      }));
    }

    if (shareStep === 'province' && selectedCountry) {
      const provinces = provinceCache[selectedCountry.name] ?? [];
      return provinces.map((name) => ({
        key: name,
        label: name,
        subtitle: 'Province',
        data: name,
      }));
    }

    if (shareStep === 'city' && selectedCountry && selectedProvince) {
      const cacheKey = `${selectedCountry.name}::${selectedProvince}`;
      const cities = cityCache[cacheKey] ?? [];
      return cities
        .filter((name) => name !== city)
        .map((name) => ({
          key: name,
          label: name,
          subtitle: 'City',
          data: name,
        }));
    }

    return [];
  }, [city, cityCache, countryOptions, provinceCache, selectedCountry, selectedProvince, shareStep]);

  const filteredOptions = useMemo(() => {
    const trimmed = shareSearch.trim().toLowerCase();
    if (!trimmed) {
      return currentOptions;
    }
    return currentOptions.filter((option) => option.label.toLowerCase().includes(trimmed));
  }, [currentOptions, shareSearch]);

  const emptyMessage =
    shareStep === 'country'
      ? 'No countries match your search yet.'
      : shareStep === 'province'
      ? 'No provinces match your search yet.'
      : 'No cities match your search yet.';

  const sharePathLabel = useMemo(() => {
    if (!selectedCountry) {
      return '';
    }
    if (!selectedProvince) {
      return selectedCountry.name;
    }
    return `${selectedCountry.name} · ${selectedProvince}`;
  }, [selectedCountry, selectedProvince]);

  /** ---------- Sticky Post Header (ListHeaderComponent) ---------- */
  const Header = (
    <View style={styles.stickyHeaderWrap}>
      <View style={[styles.postCard, { backgroundColor: headerColor }]}>
        <View style={styles.postHeaderRow}>
          <View style={styles.postHeader}>
            <View style={[styles.avatar, { backgroundColor: badgeBackground }]}>
              <View style={styles.avatarRing} />
              <Ionicons name="person" size={22} color="#fff" />
            </View>

            <View>
              <Text style={[styles.postBadge, { color: badgeTextColor }]}>Anonymous</Text>
              {post.sourceCity && post.sourceCity !== city ? (
                <Text style={[styles.postCity, { color: headerMetaColor }]}>{post.sourceCity} Room</Text>
              ) : null}
              {post.sharedFrom?.city ? (
                <Text style={[styles.sharedBanner, { color: headerMetaColor }]}>
                  Shared from {post.sharedFrom.city}
                </Text>
              ) : null}
            </View>
          </View>

          {showViewOriginal ? (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('PostThread', { city: post.sourceCity, postId: post.sourcePostId })
              }
              style={styles.viewOriginalButton}
              activeOpacity={0.75}
            >
              <Text style={[styles.viewOriginalTop, { color: linkColor }]}>View original</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={[styles.postMessage, { color: headerTitleColor }]}>{post.message}</Text>
        <Text style={[styles.postMeta, { color: headerMetaColor }]}>
          {comments.length === 1 ? '1 comment' : `${comments.length} comments`}
        </Text>

        <View style={[styles.actionsFooter, { borderTopColor: dividerColor }]}>
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

            <TouchableOpacity style={styles.actionButton} onPress={openShareModal} activeOpacity={0.7}>
              <Ionicons name="paper-plane-outline" size={20} color={linkColor} />
              <Text style={[styles.actionLabel, { color: linkColor }]}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <ScreenLayout
      title="Thread"
      subtitle={`${city} Room`}
      onBack={() => navigation.goBack()}
      navigation={navigation}
      activeTab="home"
      showFooter={false}
    >
      {/* Comments list with sticky header. Padding grows with composer+keyboard */}
      <FlatList
        data={comments}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={Header}
        stickyHeaderIndices={[0]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const mine = item.createdByMe;
          return (
            <View style={[styles.commentRow, mine && styles.commentRowMine]}>
              {/* left avatar only for others */}
              {!mine && <AvatarIcon tint={badgeBackground} style={styles.commentAvatarLeft} />}

              {/* bubble */}
              <View
                style={[
                  styles.commentBubble,
                  mine && { backgroundColor: commentHighlight, borderColor: linkColor, borderWidth: 1 },
                ]}
              >
                <Text style={[styles.commentMessage, mine && { color: linkColor }]}>{item.message}</Text>
                {mine ? <Text style={[styles.commentMeta, { color: linkColor }]}>You replied</Text> : null}
              </View>

              {/* right avatar only for me */}
              {mine && <AvatarIcon tint={badgeBackground} style={styles.commentAvatarRight} />}
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.emptyState}>No comments yet. Be the first to reply.</Text>}
        contentContainerStyle={{
          paddingHorizontal: 0,
          paddingBottom: composerH + kbOffset + (insets.bottom || 8) + 12,
        }}
      />

      {/* Fixed bottom composer pinned above the keyboard */}
      <View
        style={[
          styles.composerWrap,
          { bottom: kbOffset, paddingBottom: insets.bottom || 8 },
        ]}
        onLayout={(e) => setComposerH(e.nativeEvent.layout.height)}
      >
        <View style={styles.composerInner}>
          <TextInput
            value={reply}
            onChangeText={setReply}
            placeholder="Share your thoughts…"
            placeholderTextColor={colors.textSecondary}
            style={styles.composerInput}
            autoCapitalize="sentences"
            autoCorrect
            returnKeyType="send"
            onSubmitEditing={handleAddComment}
            clearButtonMode="while-editing"
          />
          <TouchableOpacity
            onPress={handleAddComment}
            disabled={!reply.trim()}
            activeOpacity={0.9}
            style={[
              styles.sendBtn,
              { backgroundColor: replyButtonBackground, opacity: reply.trim() ? 1 : 0.5 },
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="send" size={18} color={replyButtonForeground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Toast */}
      {shareMessage ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{shareMessage}</Text>
        </View>
      ) : null}

      {/* Share modal with cascading country → province → city flow */}
      <Modal
        visible={shareModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeShareModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Share to another room</Text>
            <Text style={styles.modalSubtitle}>{shareStepTitle}</Text>
            {shareStep !== 'country' ? (
              <TouchableOpacity
                onPress={handleShareBack}
                style={styles.modalBackButton}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={16} color={linkColor} />
                <Text style={[styles.modalBackText, { color: linkColor }]}>Back</Text>
              </TouchableOpacity>
            ) : null}
            {sharePathLabel ? (
              <Text style={styles.modalPath}>Selected: {sharePathLabel}</Text>
            ) : null}
            <TextInput
              placeholder={shareSearchPlaceholder}
              value={shareSearch}
              onChangeText={setShareSearch}
              style={styles.modalInput}
              placeholderTextColor={colors.textSecondary}
            />
            {shareError ? <Text style={styles.modalError}>{shareError}</Text> : null}
            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalOption}
                  activeOpacity={0.75}
                  onPress={() => handleSelectShareOption(item)}
                >
                  <Text style={styles.modalOptionLabel}>{item.label}</Text>
                  <Text style={styles.modalOptionType}>{item.subtitle}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                shareLoading ? (
                  <View style={styles.modalEmptyState}>
                    <ActivityIndicator size="small" color={linkColor} />
                  </View>
                ) : (
                  <Text style={styles.modalEmpty}>{emptyMessage}</Text>
                )
              }
              style={styles.modalList}
              keyboardShouldPersistTaps="handled"
            />
            <TouchableOpacity style={styles.modalClose} onPress={closeShareModal}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
}


const styles = StyleSheet.create({
  /* Sticky header wrapper so the pinned card blends with background */
  stickyHeaderWrap: { backgroundColor: colors.background, paddingTop: 8, paddingBottom: 12 },

  /* Post card (wider) */
  postCard: {
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 8,           // tighter margins → wider card
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },

  /* Header */
  postHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginRight: 12, flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12, overflow: 'hidden' },
  avatarRing: { ...StyleSheet.absoluteFillObject, borderRadius: 22, borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },
  postBadge: { fontSize: 16, fontWeight: '700' },
  postCity: { fontSize: 12, marginTop: 4 },
  sharedBanner: { fontSize: 12, marginTop: 6 },
  postMessage: { fontSize: 20, marginBottom: 18, fontWeight: '500' },
  postMeta: { fontSize: 13, marginBottom: 12 },
  actionsFooter: { marginTop: 4, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  actionsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 0 },
  actionButton: { flexDirection: 'row', alignItems: 'center', marginRight: 24 },
  actionCount: { fontSize: 12, marginLeft: 6 },
  actionLabel: { fontSize: 12, fontWeight: '600', marginLeft: 6 },
  viewOriginalButton: { marginLeft: 12, paddingVertical: 4, paddingRight: 4 },
  viewOriginalTop: { fontSize: 12, fontWeight: '600', textAlign: 'right' },

  /* Comments (wider) */
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 14,
    paddingHorizontal: 8,          // tighter margins → wider bubbles
  },
  // push my messages to the right (so avatar sits on the right)
  commentRowMine: { justifyContent: 'flex-end' },
  commentAvatarLeft: { marginRight: 10 },
  commentAvatarRight: { marginLeft: 10 },
  commentBubble: {
    maxWidth: '92%',               // was 88% → wider
    flexShrink: 1,                 // so it won’t overflow when the avatar is present
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  commentMessage: { fontSize: 16, color: colors.textPrimary },
  commentMeta: { marginTop: 6, fontSize: 12, fontWeight: '600' },
  emptyState: { paddingHorizontal: 12, paddingVertical: 40, color: colors.textSecondary, textAlign: 'center' },

  /* Fixed bottom composer */
  composerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    paddingTop: 8,
    paddingHorizontal: 8,          // align with wider look
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  composerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  composerInput: {
    flex: 1,
    height: 38,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: 6,
  },
  sendBtn: {
    marginLeft: 8,
    borderRadius: 16,
    height: 32,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },

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
  modalSubtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
  modalBackButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 8 },
  modalBackText: { fontSize: 13, fontWeight: '600', marginLeft: 4 },
  modalPath: { fontSize: 12, color: colors.textSecondary, marginBottom: 12 },
  modalInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  modalError: { color: colors.primaryDark, fontSize: 12, marginBottom: 8 },
  modalList: { maxHeight: 240 },
  modalOption: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider },
  modalOptionLabel: { fontSize: 14, color: colors.textPrimary, fontWeight: '600' },
  modalOptionType: { fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase' },
  modalEmptyState: { paddingVertical: 24, alignItems: 'center', justifyContent: 'center' },
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
