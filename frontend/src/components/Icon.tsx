import React from 'react';
import { ICONS } from '../constants';

interface IconProps {
  name: string;
  cls?: string;
  style?: React.CSSProperties;
}

export const Icon: React.FC<IconProps> = ({ name, cls = '', style }) => {
  const content = ICONS[name] || ICONS.info || '';
  return (
    <svg
      className={`icon ${cls}`.trim()}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={style}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};
