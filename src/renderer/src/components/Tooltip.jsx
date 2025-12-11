import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Tooltip Component
 * Provides contextual help for UI elements
 */

const Tooltip = ({
    children,
    content,
    placement = 'top',
    trigger = 'hover', // 'hover' or 'click'
    isDark = false
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const triggerRef = useRef(null);
    const tooltipRef = useRef(null);

    const bgColor = isDark ? '#2d2d30' : '#333333';
    const textColor = '#ffffff';

    useEffect(() => {
        if (isVisible && triggerRef.current && tooltipRef.current) {
            calculatePosition();
        }
    }, [isVisible, placement]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                trigger === 'click' &&
                tooltipRef.current &&
                triggerRef.current &&
                !tooltipRef.current.contains(event.target) &&
                !triggerRef.current.contains(event.target)
            ) {
                setIsVisible(false);
            }
        };

        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                setIsVisible(false);
            }
        };

        if (isVisible) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEsc);
            window.addEventListener('resize', calculatePosition);
            window.addEventListener('scroll', calculatePosition, true);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEsc);
            window.removeEventListener('resize', calculatePosition);
            window.removeEventListener('scroll', calculatePosition, true);
        };
    }, [isVisible, trigger]);

    const calculatePosition = () => {
        if (!triggerRef.current || !tooltipRef.current) return;

        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const offset = 8;

        let top, left;

        switch (placement) {
            case 'top':
                top = triggerRect.top - tooltipRect.height - offset;
                left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
                break;
            case 'bottom':
                top = triggerRect.bottom + offset;
                left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
                break;
            case 'left':
                top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
                left = triggerRect.left - tooltipRect.width - offset;
                break;
            case 'right':
                top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
                left = triggerRect.right + offset;
                break;
            default:
                top = triggerRect.top - tooltipRect.height - offset;
                left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
        }

        // Keep tooltip within viewport
        const padding = 8;
        top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));
        left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));

        setPosition({ top, left });
    };

    const handleMouseEnter = () => {
        if (trigger === 'hover') {
            setIsVisible(true);
        }
    };

    const handleMouseLeave = () => {
        if (trigger === 'hover') {
            setIsVisible(false);
        }
    };

    const handleClick = () => {
        if (trigger === 'click') {
            setIsVisible(!isVisible);
        }
    };

    return (
        <>
            <div
                ref={triggerRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
                style={{ display: 'inline-block', cursor: trigger === 'click' ? 'pointer' : 'default' }}
            >
                {children}
            </div>

            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        ref={tooltipRef}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.15 }}
                        style={{
                            position: 'fixed',
                            top: position.top,
                            left: position.left,
                            backgroundColor: bgColor,
                            color: textColor,
                            padding: '8px 12px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            lineHeight: '1.4',
                            maxWidth: '250px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                            zIndex: 10001,
                            pointerEvents: trigger === 'click' ? 'auto' : 'none'
                        }}
                    >
                        {content}

                        {/* Arrow */}
                        <div
                            style={{
                                position: 'absolute',
                                width: 0,
                                height: 0,
                                borderStyle: 'solid',
                                ...getArrowStyle(placement, bgColor)
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

/**
 * Get arrow styling based on placement
 */
function getArrowStyle(placement, bgColor) {
    const arrowSize = 6;

    switch (placement) {
        case 'top':
            return {
                bottom: -arrowSize,
                left: '50%',
                transform: 'translateX(-50%)',
                borderWidth: `${arrowSize}px ${arrowSize}px 0 ${arrowSize}px`,
                borderColor: `${bgColor} transparent transparent transparent`
            };
        case 'bottom':
            return {
                top: -arrowSize,
                left: '50%',
                transform: 'translateX(-50%)',
                borderWidth: `0 ${arrowSize}px ${arrowSize}px ${arrowSize}px`,
                borderColor: `transparent transparent ${bgColor} transparent`
            };
        case 'left':
            return {
                right: -arrowSize,
                top: '50%',
                transform: 'translateY(-50%)',
                borderWidth: `${arrowSize}px 0 ${arrowSize}px ${arrowSize}px`,
                borderColor: `transparent transparent transparent ${bgColor}`
            };
        case 'right':
            return {
                left: -arrowSize,
                top: '50%',
                transform: 'translateY(-50%)',
                borderWidth: `${arrowSize}px ${arrowSize}px ${arrowSize}px 0`,
                borderColor: `transparent ${bgColor} transparent transparent`
            };
        default:
            return {};
    }
}

/**
 * Help Icon Component (commonly used with Tooltip)
 */
export const HelpIcon = ({ size = 16, color = '#888' }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
        <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
        <path
            d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <circle cx="12" cy="17" r="0.5" fill={color} stroke={color} strokeWidth="2" />
    </svg>
);

export default Tooltip;
