# OpenAI Services for Toilet App

This directory contains all OpenAI-powered features for the Toilet community discussion app.

## 🎯 Features Overview

### 1. **Content Moderation** (FREE)
**File:** `moderationService.js`
**Cost:** FREE (unlimited)
**Status:** ✅ Integrated

Automatically detects harmful content in posts:
- Hate speech & harassment
- Violence & graphic content
- Sexual content
- Self-harm content

**Usage:**
```javascript
import { analyzePostContent } from './services/openai/moderationService';

const result = await analyzePostContent({ title, message });
// result.action: 'approve', 'review', or 'block'
```

---

### 2. **Auto-Tagging**
**File:** `autoTaggingService.js`
**Cost:** ~$0.002 per post
**Status:** ✅ Integrated

Automatically categorizes posts into 27 relevant topics:
- Life domains: relationships, money, work, school, family, health, housing
- Emotions: rant, advice, celebration, question, story, joke
- Issues: crime, safety, corruption, transport
- Activities: food, entertainment, sports, politics, tech

**Usage:**
```javascript
import { autoTagPost } from './services/openai/autoTaggingService';

const result = await autoTagPost(title, message);
// result.tags: ['money', 'work', 'advice']
```

---

### 3. **AI Summarization**
**File:** `summarizationService.js`
**Cost:** ~$0.002 per summary
**Status:** ✅ Integrated

Generates high-quality summaries of long posts:
- Three quality levels: fast, balanced, best
- Automatic fallback to extractive summary
- Used in CreatePostModal

**Usage:**
```javascript
import { smartSummarize } from './services/openai/summarizationService';

const result = await smartSummarize(text, { quality: 'best' });
// result.summary: "AI-generated summary..."
```

---

### 4. **Thread Summarization** 🆕
**File:** `threadSummarizationService.js`
**Cost:** ~$0.0035 per thread summary
**Status:** ⏳ Ready to integrate

Summarizes long comment threads:
- Includes original post context
- Summarizes all comments
- Perfect for catching up on active discussions

**Usage:**
```javascript
import { summarizeThread } from './services/openai/threadSummarizationService';

const result = await summarizeThread(comments, post);
// result.summary: "Thread discusses..."
```

**Integration ideas:**
- Add "Summarize Thread" button on posts with 10+ comments
- Show summary at top of long threads
- Cache summaries to avoid repeat costs

---

### 5. **Smart Comment Suggestions** 🆕
**File:** `commentSuggestionService.js`
**Cost:** ~$0.002 per suggestion
**Status:** ⏳ Ready to integrate

Helps users write better comments:
- 5 suggestion types: thoughtful, advice, question, support, perspective
- Context-aware responses
- Encourages quality engagement

**Usage:**
```javascript
import { suggestComment, SUGGESTION_TYPES } from './services/openai/commentSuggestionService';

const result = await suggestComment(post, SUGGESTION_TYPES.ADVICE);
// result.suggestion: "AI-generated comment..."
```

**Integration ideas:**
- Add "Suggest Response" button on post threads
- Show multiple suggestion options
- User can edit before posting

---

### 6. **Language Translation** 🆕
**File:** `translationService.js`
**Cost:** ~$0.003 per translation
**Status:** ⏳ Ready to integrate

Translates content between South African languages:
- Supports 11 official languages (English, Afrikaans, Zulu, Xhosa, etc.)
- Auto-detect source language
- Maintains tone and cultural context

**Usage:**
```javascript
import { translateText, translatePost, LANGUAGES } from './services/openai/translationService';

// Translate text
const result = await translateText(text, 'af'); // to Afrikaans

// Translate entire post
const translated = await translatePost(post, 'zu'); // to Zulu
```

**Integration ideas:**
- "Translate" button on posts
- Auto-detect language and offer translation
- Support multilingual communities

---

### 7. **Content Warnings & Sentiment Analysis** 🆕 (FREE!)
**File:** `contentAnalysisService.js`
**Cost:** FREE (uses existing moderation data)
**Status:** ⏳ Ready to integrate

Extracts additional insights from FREE moderation API:
- Content warnings (violence, mental health, sexual, hate, graphic)
- Sentiment detection (positive, negative, neutral, urgent, celebratory, seeking advice)
- Zero additional cost!

**Usage:**
```javascript
import { analyzeContent } from './services/openai/contentAnalysisService';

const result = await analyzeContent(title, message);
// result.warnings: [{ label: 'Violence', icon: '⚠️', ... }]
// result.sentiment: { label: 'Seeking Advice', icon: '❓', ... }
```

**Integration ideas:**
- Show content warning overlays before viewing
- Display sentiment badges on posts
- Filter by sentiment type

---

### 8. **Post Title Generation** 🆕
**File:** `titleGenerationService.js`
**Cost:** ~$0.001 per title
**Status:** ⏳ Ready to integrate

Auto-generates catchy titles from post content:
- 5 title styles: catchy, descriptive, question, emotional, direct
- Max 60 characters
- Helps users create better titles

**Usage:**
```javascript
import { generateTitle, TITLE_STYLES } from './services/openai/titleGenerationService';

const result = await generateTitle(message, TITLE_STYLES.CATCHY);
// result.title: "AI-generated title"
```

**Integration ideas:**
- "Generate Title" button in CreatePostModal
- Show 3 title options to choose from
- Use as placeholder suggestion

---

### 9. **Duplicate Post Detection** 🆕
**File:** `embeddingsService.js`
**Cost:** ~$0.00002 per check (very cheap!)
**Status:** ⏳ Ready to integrate

Detects similar/duplicate posts using semantic search:
- Uses OpenAI embeddings for semantic similarity
- Much cheaper than GPT models
- Finds conceptually similar posts (not just keyword matches)

**Usage:**
```javascript
import { checkDuplicate } from './services/openai/embeddingsService';

const result = await checkDuplicate(newPostText, recentPosts);
// result.isDuplicate: true/false
// result.similarPosts: [...]
```

**Integration ideas:**
- Check before publishing post
- Show "Similar posts found" with links
- Prevent spam/duplicate content

---

### 10. **Semantic Search** 🆕
**File:** `embeddingsService.js`
**Cost:** ~$0.00002 per search
**Status:** ⏳ Ready to integrate

Search by meaning, not just keywords:
- Find "posts about money problems" even if they don't mention "money"
- Much better than keyword search
- Very cost-effective

**Usage:**
```javascript
import { semanticSearch } from './services/openai/embeddingsService';

const result = await semanticSearch(query, posts);
// result.results: [matching posts sorted by relevance]
```

**Integration ideas:**
- Replace or enhance existing search
- "Related posts" suggestions
- Better content discovery

---

### 11. **Post Quality Scoring** 🆕
**File:** `qualityScoringService.js`
**Cost:** ~$0.001 per score
**Status:** ⏳ Ready to integrate

Rates posts on 4 dimensions (0-10 scale):
- Clarity: How clear and easy to understand
- Completeness: How much detail provided
- Helpfulness: How useful to community
- Engagement: Likely to generate discussion

**Usage:**
```javascript
import { scorePostQuality } from './services/openai/qualityScoringService';

const result = await scorePostQuality(post);
// result.overall: 7.5
// result.tier: { label: 'Good', icon: '👍', ... }
```

**Integration ideas:**
- Boost high-quality posts in feed
- Show quality badges on posts
- Help users improve their posts
- Sort by quality score

---

## 💰 Cost Breakdown

| Feature | Cost per Use | Monthly Estimate* |
|---------|--------------|-------------------|
| Moderation | **FREE** | $0 |
| Content Warnings | **FREE** | $0 |
| Sentiment Analysis | **FREE** | $0 |
| Auto-Tagging | $0.002 | $2.00 |
| Summarization | $0.002 | $0.50 |
| Thread Summary | $0.0035 | $0.70 |
| Comment Suggestions | $0.002 | $0.40 |
| Translation | $0.003 | $0.60 |
| Title Generation | $0.001 | $0.20 |
| Duplicate Check | $0.00002 | $0.02 |
| Semantic Search | $0.00002 | $0.04 |
| Quality Scoring | $0.001 | $1.00 |
| **TOTAL** | | **~$5.46/month** |

*Based on: 1000 posts/month, 250 summaries, 200 suggestions, 200 translations, 200 titles, 1000 duplicate checks, 2000 searches, 1000 quality scores

---

## 🚀 Quick Integration Guide

### Step 1: Import the service
```javascript
import { featureName } from './services/openai';
```

### Step 2: Call the function
```javascript
const result = await featureName(params);
```

### Step 3: Handle the result
```javascript
if (result.error) {
  // Handle error - fallbacks are built in
}
// Use result data
```

---

## 📊 Feature Priority Recommendations

### Implement First (Highest Value):
1. ✅ **Moderation** - Already done (FREE, essential)
2. ✅ **Auto-Tagging** - Already done (great for discovery)
3. ✅ **Summarization** - Already done (helps users)
4. 🆕 **Content Warnings** - FREE extraction from moderation
5. 🆕 **Sentiment Analysis** - FREE extraction from moderation

### Implement Next (High Impact, Low Cost):
6. 🆕 **Thread Summarization** - Very useful for active threads
7. 🆕 **Smart Comment Suggestions** - Improves engagement
8. 🆕 **Title Generation** - Helps content quality

### Implement Later (Nice to Have):
9. 🆕 **Language Translation** - Great for multilingual communities
10. 🆕 **Duplicate Detection** - Prevents spam
11. 🆕 **Semantic Search** - Better discovery
12. 🆕 **Quality Scoring** - Feed optimization

---

## 🔧 Configuration

All services use the same API key from `.env`:
```
EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-...
```

---

## 🛡️ Error Handling

All services include:
- ✅ Timeout handling
- ✅ Automatic fallbacks
- ✅ Clear error messages
- ✅ Graceful degradation

Your app will keep working even if OpenAI is down!

---

## 📝 Notes

- All costs are estimates based on GPT-3.5-turbo pricing
- Embeddings (duplicate detection, semantic search) are extremely cheap
- Moderation API is completely FREE
- Content warnings and sentiment analysis are FREE (extracted from moderation data)
- All services have fallback mechanisms built in

---

## 🎉 Summary

You now have 11 powerful AI features ready to use:
- ✅ 3 already integrated
- 🆕 8 new features ready to integrate
- 💰 Total cost: ~$5-6/month
- 🎁 3 features completely FREE
- 🛡️ All with automatic fallbacks

Each service is standalone and can be integrated independently as needed!
