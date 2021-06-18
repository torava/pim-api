import React, {createElement, useState} from 'react';

export function Accordion({
  type,
  title,
  children,
  collapsed
}) {
  const [isExpanded, setIsExpanded] = useState(!collapsed);
  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };
  const titleElement = createElement(
    type || 'div',
    {
      onClick: handleToggle
    },
    isExpanded ?
    <>{title} &#x25BE;</> :
    <>{title} &#x25B4;</>
  );
  return (
    <>
      {titleElement}
      {isExpanded && children}
    </>
  );
}