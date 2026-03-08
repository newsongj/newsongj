import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TooltipHoverProps } from './TooltipHover.types';
import * as S from './TooltipHover.styles';

const TooltipHover: React.FC<TooltipHoverProps> = ({ 
  children, 
  content, 
  placement = 'top',
  disabled = false 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
    }
  }, [isVisible]);

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <>
      <S.StyledTooltipContainer
        ref={containerRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </S.StyledTooltipContainer>
      {isVisible && createPortal(
        <S.StyledTooltipContent 
          $placement={placement}
          style={{
            position: 'absolute',
            top: position.top,
            left: position.left,
          }}
        >
          {content}
          <S.StyledTooltipArrow $placement={placement} />
        </S.StyledTooltipContent>,
        document.body
      )}
    </>
  );
};

export default TooltipHover;
