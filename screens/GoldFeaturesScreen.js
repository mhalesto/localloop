/**
 * Gold Features Showcase Screen
 *
 * Detailed showcase of all Gold GPT-4o features
 * Use this to educate users about Gold benefits
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';

const GOLD_FEATURES = [
  {
    icon: '✨',
    title: 'GPT-4o Powered AI',
    subtitle: 'Same AI as ChatGPT Plus',
    description: 'Access OpenAI\'s most advanced AI model for all your content needs.',
    benefits: [
      'Significantly smarter than free AI tools',
      'Natural, context-aware responses',
      'Professional-quality output',
    ],
  },
  {
    icon: '🎨',
    title: 'Vision-Personalized Cartoons',
    subtitle: '20 per month + HD quality',
    description: 'GPT-4o Vision analyzes your photo to create cartoons that actually look like you.',
    benefits: [
      'AI analyzes your unique features',
      'HD quality (1024×1024)',
      'Custom text prompts supported',
      'Truly personalized results',
    ],
  },
  {
    icon: '✍️',
    title: 'Smart Post Composer',
    subtitle: 'AI writing assistant',
    description: 'Write engaging posts in seconds with AI assistance.',
    benefits: [
      '4 tone options: Friendly, Professional, Excited, Thoughtful',
      '3 length options: Short, Medium, Long',
      'Smart hashtag suggestions',
      'Include/exclude emojis',
    ],
  },
  {
    icon: '📝',
    title: 'GPT-4o Summaries',
    subtitle: '4 style options',
    description: 'Summarize long posts with style and precision.',
    benefits: [
      'Professional: Clear and concise',
      'Casual: Friendly and conversational',
      'Emoji: Fun and engaging',
      'Formal: Academic and precise',
    ],
  },
  {
    icon: '💬',
    title: 'Smart Comment Suggestions',
    subtitle: 'Context-aware replies',
    description: 'Generate thoughtful comments that fit the conversation.',
    benefits: [
      'Understands post context',
      '4 tone options',
      'Multiple suggestions at once',
      'Save time, stay engaged',
    ],
  },
  {
    icon: '🌍',
    title: 'Cultural Translation',
    subtitle: '11 South African languages',
    description: 'Translate with cultural awareness and natural phrasing.',
    benefits: [
      'isiZulu, isiXhosa, Afrikaans + 8 more',
      'Culturally appropriate expressions',
      'Natural phrasing for SA speakers',
      'Respects local customs',
    ],
  },
];

export default function GoldFeaturesScreen({ navigation }) {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Section */}
      <View style={styles.hero}>
        <Text style={styles.heroIcon}>✨</Text>
        <Text style={styles.heroTitle}>Gold Tier</Text>
        <Text style={styles.heroSubtitle}>Powered by GPT-4o</Text>
        <Text style={styles.heroDescription}>
          Get the same AI that powers ChatGPT Plus, now integrated into LocalLoop.
        </Text>
      </View>

      {/* Price Card */}
      <View style={styles.priceCard}>
        <View style={styles.priceHeader}>
          <Text style={styles.price}>R150</Text>
          <Text style={styles.priceDetail}>per month</Text>
        </View>
        <View style={styles.priceBenefits}>
          <Text style={styles.priceBenefit}>✓ All Premium features</Text>
          <Text style={styles.priceBenefit}>✓ 6 GPT-4o powered features</Text>
          <Text style={styles.priceBenefit}>✓ Unlimited AI summaries</Text>
          <Text style={styles.priceBenefit}>✓ 20 personalized cartoons/month</Text>
        </View>
        <TouchableOpacity
          style={styles.subscribeButton}
          onPress={() => navigation.navigate('Subscription')}
        >
          <Text style={styles.subscribeButtonText}>Get Gold Now</Text>
        </TouchableOpacity>
      </View>

      {/* Features */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>What You Get</Text>

        {GOLD_FEATURES.map((feature, index) => (
          <View key={index} style={styles.featureCard}>
            <View style={styles.featureHeader}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <View style={styles.featureHeaderText}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
              </View>
            </View>

            <Text style={styles.featureDescription}>{feature.description}</Text>

            <View style={styles.featureBenefits}>
              {feature.benefits.map((benefit, bIndex) => (
                <View key={bIndex} style={styles.benefitRow}>
                  <Text style={styles.benefitIcon}>•</Text>
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      {/* Value Proposition */}
      <View style={styles.valueSection}>
        <Text style={styles.sectionTitle}>Why Gold?</Text>

        <View style={styles.valueCard}>
          <Text style={styles.valueIcon}>🚀</Text>
          <Text style={styles.valueTitle}>Better Than Free AI Tools</Text>
          <Text style={styles.valueDescription}>
            GPT-4o outperforms free AI tools by a significant margin. Get professional-quality results every time.
          </Text>
        </View>

        <View style={styles.valueCard}>
          <Text style={styles.valueIcon}>⚡</Text>
          <Text style={styles.valueTitle}>Save Time</Text>
          <Text style={styles.valueDescription}>
            Write posts in seconds, get instant summaries, generate comments - all with one click.
          </Text>
        </View>

        <View style={styles.valueCard}>
          <Text style={styles.valueIcon}>🎯</Text>
          <Text style={styles.valueTitle}>Truly Personalized</Text>
          <Text style={styles.valueDescription}>
            Vision AI analyzes your photos for personalized cartoons. Context-aware suggestions that match your style.
          </Text>
        </View>

        <View style={styles.valueCard}>
          <Text style={styles.valueIcon}>💎</Text>
          <Text style={styles.valueTitle}>Incredible Value</Text>
          <Text style={styles.valueDescription}>
            ChatGPT Plus costs $20/month for similar AI. Get it integrated into LocalLoop for just R150/month.
          </Text>
        </View>
      </View>

      {/* Comparison */}
      <View style={styles.comparisonSection}>
        <Text style={styles.sectionTitle}>Gold vs ChatGPT Plus</Text>

        <View style={styles.comparisonTable}>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>Price</Text>
            <Text style={styles.comparisonBasic}>$20/mo</Text>
            <Text style={styles.comparisonGold}>R150/mo (~$8)</Text>
          </View>

          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>GPT-4o Access</Text>
            <Text style={styles.comparisonBasic}>✓</Text>
            <Text style={styles.comparisonGold}>✓</Text>
          </View>

          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>Vision AI</Text>
            <Text style={styles.comparisonBasic}>✓</Text>
            <Text style={styles.comparisonGold}>✓</Text>
          </View>

          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>Integrated in App</Text>
            <Text style={styles.comparisonBasic}>—</Text>
            <Text style={styles.comparisonGold}>✓</Text>
          </View>

          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>Cartoon Generation</Text>
            <Text style={styles.comparisonBasic}>—</Text>
            <Text style={styles.comparisonGold}>✓ 20/month</Text>
          </View>

          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>Community Features</Text>
            <Text style={styles.comparisonBasic}>—</Text>
            <Text style={styles.comparisonGold}>✓</Text>
          </View>
        </View>
      </View>

      {/* Testimonials (Mock) */}
      <View style={styles.testimonialsSection}>
        <Text style={styles.sectionTitle}>What Gold Users Say</Text>

        <View style={styles.testimonialCard}>
          <Text style={styles.testimonialText}>
            "The AI Post Composer saves me so much time! I can write engaging posts in seconds instead of minutes."
          </Text>
          <Text style={styles.testimonialAuthor}>— Sarah M., Gold Member</Text>
        </View>

        <View style={styles.testimonialCard}>
          <Text style={styles.testimonialText}>
            "The Vision-personalized cartoons are amazing! They actually look like me, not just generic cartoons."
          </Text>
          <Text style={styles.testimonialAuthor}>— David L., Gold Member</Text>
        </View>

        <View style={styles.testimonialCard}>
          <Text style={styles.testimonialText}>
            "GPT-4o summaries are way better than the free tools I was using. Totally worth the upgrade!"
          </Text>
          <Text style={styles.testimonialAuthor}>— Lisa K., Gold Member</Text>
        </View>
      </View>

      {/* FAQ */}
      <View style={styles.faqSection}>
        <Text style={styles.sectionTitle}>Common Questions</Text>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>Is there a free trial?</Text>
          <Text style={styles.faqAnswer}>
            Yes! Try Gold free for 7 days. No credit card required.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>Can I cancel anytime?</Text>
          <Text style={styles.faqAnswer}>
            Absolutely! Cancel anytime from settings. No commitments.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>What happens if I downgrade?</Text>
          <Text style={styles.faqAnswer}>
            You lose access to Gold features, but your existing content remains. You can upgrade again anytime.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>How is this different from ChatGPT Plus?</Text>
          <Text style={styles.faqAnswer}>
            Same GPT-4o AI, but integrated directly into LocalLoop. No need to switch apps. Plus, you get personalized cartoons and community features.
          </Text>
        </View>
      </View>

      {/* Final CTA */}
      <View style={styles.finalCTA}>
        <Text style={styles.finalCTATitle}>Ready to unlock GPT-4o?</Text>
        <Text style={styles.finalCTASubtitle}>
          Join hundreds of Gold members already using the power of AI
        </Text>
        <TouchableOpacity
          style={styles.finalCTAButton}
          onPress={() => navigation.navigate('Subscription')}
        >
          <Text style={styles.finalCTAButtonText}>Start Free Trial</Text>
        </TouchableOpacity>
        <Text style={styles.finalCTANote}>7-day free trial • Cancel anytime</Text>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  hero: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
  },
  heroIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 24,
    color: '#ffd700',
    fontWeight: '600',
    marginBottom: 16,
  },
  heroDescription: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    maxWidth: 300,
  },
  priceCard: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: '#ffd700',
  },
  priceHeader: {
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  price: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#ffd700',
  },
  priceDetail: {
    fontSize: 16,
    color: '#6c757d',
  },
  priceBenefits: {
    marginBottom: 16,
  },
  priceBenefit: {
    fontSize: 14,
    color: '#212529',
    marginBottom: 8,
  },
  subscribeButton: {
    backgroundColor: '#ffd700',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  subscribeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  featuresSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 16,
    paddingLeft: 8,
  },
  featureCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  featureHeaderText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  featureSubtitle: {
    fontSize: 14,
    color: '#ffd700',
    fontWeight: '500',
  },
  featureDescription: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 12,
    lineHeight: 24,
  },
  featureBenefits: {
    marginTop: 8,
  },
  benefitRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  benefitIcon: {
    fontSize: 16,
    color: '#ffd700',
    marginRight: 8,
    width: 20,
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    color: '#495057',
  },
  valueSection: {
    padding: 16,
    paddingTop: 0,
  },
  valueCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  valueIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  valueTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  valueDescription: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 20,
  },
  comparisonSection: {
    padding: 16,
    paddingTop: 0,
  },
  comparisonTable: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  comparisonRow: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  comparisonLabel: {
    flex: 2,
    fontSize: 14,
    color: '#212529',
    fontWeight: '500',
  },
  comparisonBasic: {
    flex: 1,
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
  comparisonGold: {
    flex: 1,
    fontSize: 14,
    color: '#ffd700',
    fontWeight: '600',
    textAlign: 'center',
  },
  testimonialsSection: {
    padding: 16,
    paddingTop: 0,
  },
  testimonialCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
  },
  testimonialText: {
    fontSize: 16,
    color: '#212529',
    fontStyle: 'italic',
    marginBottom: 12,
    lineHeight: 24,
  },
  testimonialAuthor: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  faqSection: {
    padding: 16,
    paddingTop: 0,
  },
  faqItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
  },
  finalCTA: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  finalCTATitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
    textAlign: 'center',
  },
  finalCTASubtitle: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 24,
    textAlign: 'center',
  },
  finalCTAButton: {
    backgroundColor: '#ffd700',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    marginBottom: 12,
  },
  finalCTAButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  finalCTANote: {
    fontSize: 12,
    color: '#6c757d',
  },
  bottomPadding: {
    height: 40,
  },
});
