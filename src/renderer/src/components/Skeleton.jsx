import React from 'react';

const Skeleton = ({ width, height, variant = 'text', className = '' }) => {
    const style = {
        width,
        height,
        borderRadius: variant === 'circular' ? '50%' : '4px',
    };

    return (
        <div
            className={`skeleton ${className}`}
            style={style}
        />
    );
};

export default Skeleton;
