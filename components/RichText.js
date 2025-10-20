import React, { memo, useMemo } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { parseRichTextBlocks } from '../utils/textFormatting';

function renderSegments(segments, textStyle, linkStyle) {
  return segments.map((segment, index) => {
    if (segment.type === 'email') {
      const handlePress = () => {
        const address = segment.address?.trim();
        if (!address) {
          return;
        }
        Linking.openURL(`mailto:${address}`).catch(() => {});
      };
      return (
        <Text
          key={`seg-${index}`}
          style={[textStyle, segment.bold && styles.bold, styles.link, linkStyle]}
          onPress={handlePress}
        >
          {segment.label}
        </Text>
      );
    }

    return (
      <Text key={`seg-${index}`} style={[textStyle, segment.bold && styles.bold]}>
        {segment.content}
      </Text>
    );
  });
}

function RichText({
  text,
  textStyle,
  linkStyle,
  containerStyle,
}) {
  const blocks = useMemo(() => parseRichTextBlocks(text ?? ''), [text]);

  if (!text) {
    return null;
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {blocks.map((block, blockIndex) => {
        const isLast = blockIndex === blocks.length - 1;

        if (block.type === 'list') {
          return (
            <View
              key={`block-${blockIndex}`}
              style={[styles.list, !isLast && styles.blockSpacing]}
            >
              {block.items.map((itemSegments, itemIndex) => {
                const lastItem = itemIndex === block.items.length - 1;
                return (
                  <View
                    key={`block-${blockIndex}-item-${itemIndex}`}
                    style={[styles.listItem, !lastItem && styles.listItemSpacing]}
                  >
                    <Text style={[textStyle, styles.bullet]}>•</Text>
                    <Text style={[textStyle, styles.listItemText]}>
                      {renderSegments(itemSegments, textStyle, linkStyle)}
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        }

        if (!block.segments.length) {
          return (
            <View
              key={`block-${blockIndex}`}
              style={!isLast ? styles.emptyLine : styles.emptyLineLast}
            />
          );
        }

        return (
          <Text
            key={`block-${blockIndex}`}
            style={[textStyle, !isLast && styles.blockSpacing]}
          >
            {renderSegments(block.segments, textStyle, linkStyle)}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexShrink: 1,
  },
  blockSpacing: {
    marginBottom: 8,
  },
  list: {
    paddingLeft: 2,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  listItemSpacing: {
    marginBottom: 6,
  },
  bullet: {
    marginRight: 8,
  },
  listItemText: {
    flex: 1,
  },
  bold: {
    fontWeight: '700',
  },
  link: {
    textDecorationLine: 'underline',
  },
  emptyLine: {
    height: 8,
  },
  emptyLineLast: {
    height: 0,
  },
});

export default memo(RichText);
