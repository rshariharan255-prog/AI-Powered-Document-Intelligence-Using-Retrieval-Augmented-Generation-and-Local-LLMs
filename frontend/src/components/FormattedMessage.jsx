import React from 'react';
import { Rocket, Sparkles, CheckCircle2, ChevronRight, Pin, Lightbulb, UserCheck, Target, Zap } from 'lucide-react';

/**
 * FormattedMessage Component
 * Converts LLM response text into clean, professional HTML without raw star (*) symbols.
 * Renders interactive icons (Rocket, Sparkles, Pins, Key Insights) like ChatGPT.
 */
export default function FormattedMessage({ content }) {
  if (!content) return null;

  // 1. Sanitize any residual star symbols (* or **)
  const cleanText = content
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove **bold**
    .replace(/\*(.*?)\*/g, '$1')     // Remove *italic*
    .replace(/^[ \t]*\*+[ \t]*/gm, '• '); // Replace leading star bullets with bullet symbol for splitting

  // Split lines
  const lines = cleanText.split('\n');

  // Helper to determine icon for section headers or bullet lines
  const getLineIcon = (lineText) => {
    const lower = lineText.lowerCase || lineText.toLowerCase();
    if (lower.includes('project') || lower.includes('about') || lower.includes('overview') || lower.includes('title')) {
      return <Rocket size={16} className="msg-icon text-rocket" />;
    }
    if (lower.includes('team') || lower.includes('author') || lower.includes('guide') || lower.includes('member') || lower.includes('supervisor')) {
      return <UserCheck size={16} className="msg-icon text-team" />;
    }
    if (lower.includes('objective') || lower.includes('goal') || lower.includes('aim') || lower.includes('target')) {
      return <Target size={16} className="msg-icon text-target" />;
    }
    if (lower.includes('highlight') || lower.includes('key') || lower.includes('insight') || lower.includes('important')) {
      return <Lightbulb size={16} className="msg-icon text-insight" />;
    }
    if (lower.includes('progress') || lower.includes('milestone') || lower.includes('phase') || lower.includes('status')) {
      return <Zap size={16} className="msg-icon text-zap" />;
    }
    return <Sparkles size={15} className="msg-icon text-sparkle" />;
  };

  const parsedElements = [];
  let listBuffer = [];

  const flushListBuffer = (keyPrefix) => {
    if (listBuffer.length > 0) {
      parsedElements.push(
        <ul key={`ul-${keyPrefix}`} className="formatted-list">
          {listBuffer.map((item, idx) => (
            <li key={idx} className="formatted-list-item">
              <span className="bullet-icon-wrapper">
                {getLineIcon(item)}
              </span>
              <span className="list-text">{renderInlineFormatting(item)}</span>
            </li>
          ))}
        </ul>
      );
      listBuffer = [];
    }
  };

  // Helper to format inline key-value pairs (e.g., "Project Name: FreshPulse")
  const renderInlineFormatting = (text) => {
    // If line contains colon (e.g. "Key Feature: Details..."), highlight title part
    const colonIndex = text.indexOf(':');
    if (colonIndex > 0 && colonIndex < 40 && !text.slice(0, colonIndex).includes('http')) {
      const title = text.substring(0, colonIndex).trim();
      const rest = text.substring(colonIndex + 1);
      return (
        <>
          <strong className="formatted-highlight">{title}:</strong>
          {rest}
        </>
      );
    }
    return text;
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushListBuffer(index);
      return;
    }

    // Check if line is a bullet point (starts with •, -, +, or numbered list like 1., 2.)
    const isBullet = /^(?:[•\-+]\s*|\d+[\.\)]\s*)/.test(trimmed);

    if (isBullet) {
      const cleanedItem = trimmed.replace(/^(?:[•\-+]\s*|\d+[\.\)]\s*)/, '').trim();
      if (cleanedItem) {
        listBuffer.push(cleanedItem);
      }
    } else {
      flushListBuffer(index);

      // Check if header line (ends with ':' or short standalone header title)
      const isHeader = (trimmed.endsWith(':') && trimmed.length < 60) || 
                       (trimmed.length < 45 && !trimmed.endsWith('.') && lines[index + 1]?.trim().startsWith('•'));

      if (isHeader) {
        const headerTitle = trimmed.replace(/:$/, '');
        parsedElements.push(
          <div key={`head-${index}`} className="formatted-section-header">
            {getLineIcon(headerTitle)}
            <h4 className="formatted-header-title">{headerTitle}</h4>
          </div>
        );
      } else {
        parsedElements.push(
          <p key={`p-${index}`} className="formatted-paragraph">
            {renderInlineFormatting(trimmed)}
          </p>
        );
      }
    }
  });

  flushListBuffer('end');

  return (
    <div className="formatted-message-container">
      {parsedElements}
    </div>
  );
}
