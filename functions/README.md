# LocalLoop Cloud Functions

Firebase Cloud Functions for push notifications and backend automation.

## Setup

### Prerequisites

- Firebase CLI installed: `npm install -g firebase-tools`
- Firebase project initialized
- Node.js 18 or higher

### Installation

```bash
cd functions
npm install
```

## Deployed Functions

### Social Notifications

1. **onPostComment** - Triggers when someone comments on your post
   - Sends notification to post author
   - Includes commenter name and comment preview
   - Channel: `social`

2. **onStatusReply** - Triggers when someone replies to your status
   - Sends notification to status author
   - Includes replier name and reply preview
   - Channel: `social`

3. **onNewFollower** - Triggers when someone follows you
   - Sends notification to followed user
   - Includes follower's name
   - Channel: `social`

4. **onPostReaction** - Triggers when someone reacts to your post
   - Sends notification to post author
   - Includes reactor name and emoji
   - Channel: `social`

5. **onStatusReaction** - Triggers when someone reacts to your status
   - Sends notification to status author
   - Includes reactor name and emoji
   - Channel: `social`

### Achievement Notifications

6. **onEngagementMilestone** - Triggers when user reaches point milestones
   - Milestones: 10, 50, 100, 250, 500, 1000, 2500, 5000 points
   - Custom title and message for each milestone
   - Channel: `default`

### Optional Functions (Commented Out)

7. **onNewNearbyPost** - Notify users of new posts in their area
   - Can be enabled by uncommenting in `index.js`
   - Limited to 50 users per post to prevent spam
   - Channel: `posts`

## Deployment

### First Time Setup

```bash
# Login to Firebase
firebase login

# Initialize project (if not already done)
firebase init functions

# Select your Firebase project
# Choose JavaScript
# Install dependencies: Yes
```

### Deploy Functions

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:onPostComment

# Deploy multiple specific functions
firebase deploy --only functions:onPostComment,functions:onStatusReply
```

### View Logs

```bash
# View all function logs
firebase functions:log

# View specific function logs
firebase functions:log --only onPostComment

# Stream logs in real-time
firebase functions:log --follow
```

## Testing

### Local Testing

```bash
# Start emulators
firebase emulators:start --only functions,firestore

# In another terminal, trigger test events
# You can use the Firestore emulator UI at http://localhost:4000
```

### Test with Firestore Triggers

1. Open Firestore Emulator UI: http://localhost:4000
2. Create test documents that match trigger paths
3. Check function logs for execution

## Notification Channels

The app uses these Android notification channels:

- **default**: General notifications (HIGH importance)
- **posts**: New posts notifications (DEFAULT importance)
- **statuses**: Status updates (DEFAULT importance)
- **social**: Social interactions - likes, comments, follows (HIGH importance)

These are configured in the mobile app at:
`services/notificationsService.js:configureAndroidChannel()`

## Cost Optimization

Firebase Cloud Functions pricing:
- **Free tier**: 2M invocations/month
- **Paid tier**: $0.40 per million invocations

Tips to reduce costs:
1. Debounce high-frequency triggers
2. Batch notifications when possible
3. Use Firestore query limits
4. Filter out self-notifications early
5. Consider adding user notification preferences

## Monitoring

### Firebase Console

1. Go to Firebase Console > Functions
2. View function execution counts, errors, and performance
3. Set up alerts for function failures

### Error Handling

All functions include try-catch blocks and log errors:
```javascript
try {
  // Function logic
} catch (error) {
  console.error("[functionName] Error:", error);
  return null;
}
```

## Environment Variables

Functions automatically have access to Firebase Admin SDK initialized with project credentials.

No additional environment variables are needed for basic operation.

## Troubleshooting

### Functions not triggering

1. Check Firestore trigger paths match exactly
2. Verify functions are deployed: `firebase functions:list`
3. Check function logs: `firebase functions:log`
4. Ensure Firestore has proper data structure

### Notifications not sending

1. Verify push tokens exist in Firestore at `users/{userId}/pushTokens`
2. Check Expo push token validity
3. Review function logs for Expo API errors
4. Test with Expo Push Notification Tool: https://expo.dev/notifications

### Deploy errors

1. Ensure Node.js version matches (18+)
2. Delete node_modules and reinstall: `rm -rf node_modules && npm install`
3. Check Firebase project permissions
4. Verify firebase.json configuration

## Development

### Adding New Functions

1. Add function to `index.js`
2. Import notification helper if needed
3. Test locally with emulators
4. Deploy to Firebase
5. Monitor logs

### Modifying Existing Functions

1. Update function code
2. Test with emulators
3. Deploy updated function
4. Monitor for errors

## Security

- Functions run with Firebase Admin SDK privileges
- Always validate user IDs and data
- Don't send sensitive data in notifications (visible on lock screen)
- Check authorization before sending notifications
- Rate limit expensive operations

## Performance

- Keep functions fast (<60 seconds)
- Use async/await properly
- Batch database reads when possible
- Return quickly from onCreate triggers
- Consider using background functions for heavy work

## Support

For issues or questions:
1. Check function logs
2. Review Firestore trigger documentation
3. Test with Firebase emulators
4. Check Expo server SDK documentation
