# New Features Integration Guide

This guide explains how to integrate the three new features added to LocalLoop:

1. **Polls** - Create and vote on community polls
2. **Voice Notes** - Record and send 30-second voice messages in DMs
3. **Screenshot Detection** - Detect and log when users screenshot content

---

## 1. Polls Feature

### Components Created

- **`components/PollComposer.js`** - UI for creating polls
- **`components/PollDisplay.js`** - UI for displaying and voting on polls

### How to Integrate

#### Add Poll to Post Creation

```javascript
import PollComposer from '../components/PollComposer';
import PollDisplay from '../components/PollDisplay';

// In your post composer screen:
const [pollData, setPollData] = useState(null);

// Add poll creation UI
<PollComposer
  onPollCreate={(poll) => {
    setPollData(poll);
    // Optionally close the poll composer modal
  }}
  themeColors={themeColors}
  accentColor={accentColor}
/>

// When creating the post, include poll data:
const postData = {
  title: title,
  message: message,
  poll: pollData, // Include poll if it exists
  // ... other fields
};
```

#### Display Poll in Post

```javascript
// In PostItem or similar component:
{post.poll && (
  <PollDisplay
    poll={post.poll}
    onVote={(optionIndex) => handlePollVote(post.id, optionIndex)}
    currentUserId={currentUser?.uid}
    themeColors={themeColors}
    accentColor={accentColor}
  />
)}
```

#### Handle Poll Voting

```javascript
const handlePollVote = async (postId, optionIndex) => {
  // Update the post's poll data in Firestore
  const postRef = doc(db, 'posts', postId);
  const postSnap = await getDoc(postRef);

  if (!postSnap.exists()) return;

  const poll = postSnap.data().poll;
  const updatedOptions = poll.options.map((opt, idx) => {
    if (idx === optionIndex) {
      return {
        ...opt,
        votes: opt.votes + 1,
        voters: [...(opt.voters || []), currentUser.uid]
      };
    }
    return opt;
  });

  await updateDoc(postRef, {
    'poll.options': updatedOptions,
    'poll.totalVotes': poll.totalVotes + 1
  });
};
```

### Poll Data Structure

```javascript
{
  question: "What's your favorite local spot?",
  options: [
    { text: "Coffee Shop", votes: 5, voters: ["uid1", "uid2", ...] },
    { text: "Park", votes: 3, voters: ["uid3", ...] },
    // ...
  ],
  totalVotes: 8,
  endsAt: 1234567890, // Timestamp
  createdAt: 1234567890
}
```

---

## 2. Voice Notes (30 Second Limit)

### Components Created

- **`components/VoiceRecorder.js`** - Record voice notes (max 30 seconds)
- **`components/VoiceNotePlayer.js`** - Play voice notes with waveform

### How to Integrate into DirectMessageScreen

```javascript
import VoiceRecorder from '../components/VoiceRecorder';
import VoiceNotePlayer from '../components/VoiceNotePlayer';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../api/firebaseClient';

// Add state for voice recording
const [isRecordingVoice, setIsRecordingVoice] = useState(false);

// Add voice note button in message input area
<TouchableOpacity onPress={() => setIsRecordingVoice(true)}>
  <Ionicons name="mic" size={24} color={accentColor} />
</TouchableOpacity>

// Show voice recorder modal
{isRecordingVoice && (
  <Modal
    visible={isRecordingVoice}
    transparent
    animationType="slide"
  >
    <View style={styles.modalContainer}>
      <VoiceRecorder
        onRecordingComplete={async ({ uri, duration }) => {
          await handleSendVoiceNote(uri, duration);
          setIsRecordingVoice(false);
        }}
        onCancel={() => setIsRecordingVoice(false)}
        themeColors={themeColors}
        accentColor={accentColor}
      />
    </View>
  </Modal>
)}
```

#### Upload and Send Voice Note

```javascript
const handleSendVoiceNote = async (uri, duration) => {
  try {
    // Upload to Firebase Storage
    const response = await fetch(uri);
    const blob = await response.blob();

    const filename = `voice_${Date.now()}.m4a`;
    const storageRef = ref(storage, `voiceNotes/${conversationId}/${filename}`);

    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);

    // Send message with voice note
    await sendDirectMessage({
      conversationId,
      senderId: currentUser.uid,
      recipientId: recipientId,
      text: '[Voice Note]',
      voiceNote: {
        url: downloadURL,
        duration: duration
      }
    });
  } catch (error) {
    console.error('Failed to send voice note:', error);
    Alert.alert('Error', 'Failed to send voice note');
  }
};
```

#### Display Voice Note in Messages

```javascript
// In message bubble:
{message.voiceNote ? (
  <VoiceNotePlayer
    uri={message.voiceNote.url}
    duration={message.voiceNote.duration}
    themeColors={themeColors}
    accentColor={accentColor}
    isSent={message.senderId === currentUser.uid}
  />
) : (
  <Text>{message.text}</Text>
)}
```

---

## 3. Screenshot Detection

### Service Created

- **`services/screenshotDetection.js`** - Hook and utilities for screenshot detection

### How to Use

#### Basic Usage in Status Viewer

```javascript
import { useScreenshotDetection } from '../services/screenshotDetection';

function StatusStoryViewerScreen({ route }) {
  const { status } = route.params;
  const currentUser = useAuth();

  // Enable screenshot detection
  useScreenshotDetection({
    contentId: status.id,
    contentType: 'status',
    contentOwnerId: status.authorId,
    currentUserId: currentUser?.uid,
    onScreenshot: () => {
      console.log('User took a screenshot!');
      // Optional: Show a custom message
    }
  });

  return (
    // Your status viewer UI
  );
}
```

#### Prevent Screenshots (Android Only)

```javascript
useScreenshotDetection({
  contentId: message.id,
  contentType: 'message',
  contentOwnerId: message.senderId,
  currentUserId: currentUser?.uid,
  preventScreenshots: true, // Block screenshots on Android
});
```

#### Get Screenshot Events

```javascript
import { getScreenshotEvents } from '../services/screenshotDetection';

const events = await getScreenshotEvents(contentId);
console.log(`${events.length} screenshots taken`);
```

### Firestore Collections Created

#### screenshotEvents
```javascript
{
  contentId: "post123",
  contentType: "post",
  contentOwnerId: "user123",
  screenshotterId: "user456",
  timestamp: serverTimestamp(),
  platform: "ios"
}
```

#### notifications (screenshot type)
```javascript
{
  userId: "user123", // Content owner
  type: "screenshot_taken",
  contentId: "post123",
  contentType: "post",
  actorId: "user456", // Who took screenshot
  createdAt: serverTimestamp(),
  read: false
}
```

---

## Next Steps

1. **Update Firestore Rules** - Add rules for poll voting and voice note storage
2. **Add Firestore Indexes** - Create indexes for screenshot events queries
3. **Test Features** - Test each feature individually
4. **Update UI** - Add toggles in settings for screenshot detection preferences

### Firestore Rules to Add

```javascript
// Allow poll voting (users can update poll vote counts)
match /posts/{postId} {
  allow update: if request.resource.data.diff(resource.data).affectedKeys()
    .hasOnly(['poll']);
}

// Allow reading screenshot events for content owners
match /screenshotEvents/{eventId} {
  allow read: if request.auth.uid == resource.data.contentOwnerId;
  allow create: if request.auth.uid == request.resource.data.screenshotterId;
}
```

### Storage Rules for Voice Notes

```javascript
match /voiceNotes/{conversationId}/{filename} {
  allow write: if request.auth != null;
  allow read: if request.auth != null;
}
```

---

## Feature Highlights

✅ **Polls**: 2-6 options, customizable duration (1h-72h), real-time results
✅ **Voice Notes**: 30-second limit, waveform visualization, playback controls
✅ **Screenshot Detection**: Works on iOS & Android, notifies content owner, optional prevention (Android)

Enjoy your new features! 🎉
