const MAILTO_MARKER_REGEX = /\[([^\]]+)\]\(mailto:([^\)]+)\)/gi;
const BOLD_MARKER_REGEX = /\*\*(.+?)\*\*/g;
const BULLET_LINE_REGEX = /^\s*[-*•]\s+/m;
const PLAIN_EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

const MAILTO_PREFIX = 'mailto:';

export function hasRichFormatting(value = '') {
  if (!value) {
    return false;
  }
  BOLD_MARKER_REGEX.lastIndex = 0;
  MAILTO_MARKER_REGEX.lastIndex = 0;
  return (
    BOLD_MARKER_REGEX.test(value) ||
    MAILTO_MARKER_REGEX.test(value) ||
    BULLET_LINE_REGEX.test(value)
  );
}

export function stripRichFormatting(value = '') {
  if (!value) {
    return '';
  }
  let output = value;
  output = output.replace(MAILTO_MARKER_REGEX, (_, label) => label);
  output = output.replace(BOLD_MARKER_REGEX, (_, inner) => inner);
  output = output.replace(/^[\t ]*[-*•]\s+(.*)$/gm, (_, item) => `• ${item}`);
  return output;
}

export function parseRichTextBlocks(value = '') {
  if (!value) {
    return [];
  }
  const normalized = value.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const blocks = [];
  let listBuffer = [];

  const flushList = () => {
    if (listBuffer.length) {
      blocks.push({
        type: 'list',
        items: listBuffer.map((item) => buildInlineSegments(item))
      });
      listBuffer = [];
    }
  };

  lines.forEach((line) => {
    if (/^\s*[-*•]\s+/.test(line)) {
      const itemText = line.replace(/^\s*[-*•]\s+/, '');
      listBuffer.push(itemText);
      return;
    }

    flushList();

    if (!line.trim()) {
      blocks.push({ type: 'paragraph', segments: [] });
      return;
    }

    blocks.push({ type: 'paragraph', segments: buildInlineSegments(line) });
  });

  flushList();

  return blocks;
}

function buildInlineSegments(text) {
  if (!text) {
    return [];
  }

  const segments = [];
  let lastIndex = 0;
  const mailtoRegex = new RegExp(MAILTO_MARKER_REGEX.source, MAILTO_MARKER_REGEX.flags);
  let match = mailtoRegex.exec(text);

  while (match) {
    const [fullMatch, label, address] = match;
    const index = match.index;
    if (index > lastIndex) {
      const chunk = text.slice(lastIndex, index);
      segments.push(...splitBoldMarkers(chunk));
    }

    segments.push({
      type: 'email',
      label,
      address,
      bold: false
    });

    lastIndex = index + fullMatch.length;
    mailtoRegex.lastIndex = lastIndex;
    match = mailtoRegex.exec(text);
  }

  if (lastIndex < text.length) {
    const remainder = text.slice(lastIndex);
    segments.push(...splitBoldMarkers(remainder));
  }

  return segments;
}

function splitBoldMarkers(text) {
  if (!text) {
    return [];
  }

  const segments = [];
  let lastIndex = 0;
  const regex = new RegExp(BOLD_MARKER_REGEX.source, BOLD_MARKER_REGEX.flags);
  let match = regex.exec(text);

  while (match) {
    const [fullMatch, inner] = match;
    const index = match.index;
    if (index > lastIndex) {
      const chunk = text.slice(lastIndex, index);
      segments.push(...splitPlainEmails(chunk, false));
    }

    segments.push(...splitPlainEmails(inner, true));

    lastIndex = index + fullMatch.length;
    regex.lastIndex = lastIndex;
    match = regex.exec(text);
  }

  if (lastIndex < text.length) {
    const remainder = text.slice(lastIndex);
    segments.push(...splitPlainEmails(remainder, false));
  }

  return segments;
}

function splitPlainEmails(text, bold) {
  if (!text) {
    return [];
  }

  const pieces = [];
  let lastIndex = 0;
  const regex = new RegExp(PLAIN_EMAIL_REGEX.source, PLAIN_EMAIL_REGEX.flags);
  let match = regex.exec(text);

  while (match) {
    const [email] = match;
    const index = match.index;
    if (index > lastIndex) {
      const chunk = text.slice(lastIndex, index);
      pieces.push({ type: 'text', content: chunk, bold });
    }

    pieces.push({ type: 'email', label: email, address: email, bold });

    lastIndex = index + email.length;
    regex.lastIndex = lastIndex;
    match = regex.exec(text);
  }

  if (lastIndex < text.length) {
    const remainder = text.slice(lastIndex);
    pieces.push({ type: 'text', content: remainder, bold });
  }

  return pieces;
}

export const MAILTO_PREFIX_LENGTH = MAILTO_PREFIX.length;
export const MAILTO_PREFIX_STRING = MAILTO_PREFIX;
export const EMAIL_PLACEHOLDER = 'email@example.com';
export const EMAIL_LABEL_PLACEHOLDER = 'Email';
export const EMAIL_ADDRESS_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
