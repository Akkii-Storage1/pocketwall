import React, { useState } from 'react';

const AttachmentViewer = ({ attachments, initialIndex = 0, onClose, isDark }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [zoom, setZoom] = useState(1);

    if (!attachments || attachments.length === 0) return null;

    const currentAttachment = attachments[currentIndex];
    const bgColor = isDark ? '#1e1e1e' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#000000';
    const borderColor = isDark ? '#007acc' : '#0078d4';

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setZoom(1);
        }
    };

    const handleNext = () => {
        if (currentIndex < attachments.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setZoom(1);
        }
    };

    const handleZoomIn = () => {
        setZoom(prev => Math.min(prev + 0.25, 3));
    };

    const handleZoomOut = () => {
        setZoom(prev => Math.max(prev - 0.25, 0.5));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
        if (e.key === 'ArrowLeft') handlePrevious();
        if (e.key === 'ArrowRight') handleNext();
        if (e.key === '+' || e.key === '=') handleZoomIn();
        if (e.key === '-') handleZoomOut();
    };

    React.useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex]);

    const openExternal = async () => {
        if (window.api && window.api.getAttachmentPath && currentAttachment) {
            const path = await window.api.getAttachmentPath(currentAttachment.id, currentAttachment.filename);
            if (path) {
                window.api.shell?.openPath(path);
            }
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex flex-col"
            style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
            onClick={onClose}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between p-4 border-b"
                style={{ backgroundColor: bgColor, borderColor }}
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="font-bold text-sm" style={{ color: textColor }}>
                    Receipt Viewer
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleZoomOut}
                        className="px-2 py-1 text-xs border"
                        style={{ backgroundColor: isDark ? '#3e3e42' : '#f0f0f0', color: textColor }}
                        title="Zoom Out (-)"
                    >
                        🔍−
                    </button>
                    <span className="text-xs" style={{ color: textColor }}>{Math.round(zoom * 100)}%</span>
                    <button
                        onClick={handleZoomIn}
                        className="px-2 py-1 text-xs border"
                        style={{ backgroundColor: isDark ? '#3e3e42' : '#f0f0f0', color: textColor }}
                        title="Zoom In (+)"
                    >
                        🔍+
                    </button>
                    <button
                        onClick={openExternal}
                        className="px-3 py-1 text-xs border"
                        style={{ backgroundColor: isDark ? '#3e3e42' : '#f0f0f0', color: textColor }}
                        title="Open in External App"
                    >
                        ↗ Open
                    </button>
                    <button
                        onClick={onClose}
                        className="px-3 py-1 text-xs border font-bold"
                        style={{ backgroundColor: isDark ? '#3e3e42' : '#f0f0f0', color: textColor }}
                        title="Close (ESC)"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Image Display */}
            <div
                className="flex-1 flex items-center justify-center p-4 overflow-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative">
                    {currentAttachment.filename.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <img
                            src={`file://${currentAttachment.path}`}
                            alt={currentAttachment.filename}
                            style={{
                                maxWidth: '90vw',
                                maxHeight: '70vh',
                                transform: `scale(${zoom})`,
                                transition: 'transform 0.2s'
                            }}
                        />
                    ) : (
                        <div
                            className="flex flex-col items-center justify-center p-8 border rounded"
                            style={{ backgroundColor: bgColor, borderColor, minWidth: '300px' }}
                        >
                            <span style={{ fontSize: '48px' }}>📄</span>
                            <p className="mt-4 text-sm" style={{ color: textColor }}>{currentAttachment.filename}</p>
                            <p className="mt-2 text-xs opacity-70" style={{ color: textColor }}>
                                Preview not available
                            </p>
                            <button
                                onClick={openExternal}
                                className="mt-4 px-4 py-2 text-sm border"
                                style={{
                                    backgroundColor: isDark ? '#0e639c' : '#0078d4',
                                    color: '#ffffff',
                                    borderColor: isDark ? '#1177bb' : '#005a9e'
                                }}
                            >
                                Open in Default App
                            </button>
                        </div>
                    )}
                </div>

                {/* Navigation Arrows */}
                {attachments.length > 1 && (
                    <>
                        <button
                            onClick={handlePrevious}
                            disabled={currentIndex === 0}
                            className="absolute left-4 top-1/2 transform -translate-y-1/2 px-4 py-8 text-2xl border"
                            style={{
                                backgroundColor: bgColor,
                                color: textColor,
                                opacity: currentIndex === 0 ? 0.3 : 0.8,
                                cursor: currentIndex === 0 ? 'not-allowed' : 'pointer'
                            }}
                            title="Previous (←)"
                        >
                            ←
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={currentIndex === attachments.length - 1}
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 px-4 py-8 text-2xl border"
                            style={{
                                backgroundColor: bgColor,
                                color: textColor,
                                opacity: currentIndex === attachments.length - 1 ? 0.3 : 0.8,
                                cursor: currentIndex === attachments.length - 1 ? 'not-allowed' : 'pointer'
                            }}
                            title="Next (→)"
                        >
                            →
                        </button>
                    </>
                )}
            </div>

            {/* Thumbnail Strip */}
            {attachments.length > 1 && (
                <div
                    className="flex items-center justify-center gap-2 p-4 border-t"
                    style={{ backgroundColor: bgColor, borderColor }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {attachments.map((att, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                setCurrentIndex(index);
                                setZoom(1);
                            }}
                            className="border-2 p-1"
                            style={{
                                borderColor: index === currentIndex ? borderColor : 'transparent',
                                opacity: index === currentIndex ? 1 : 0.6
                            }}
                            title={att.filename}
                        >
                            {att.filename.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                <img
                                    src={`file://${att.path}`}
                                    alt={att.filename}
                                    className="w-16 h-16 object-cover"
                                />
                            ) : (
                                <div className="w-16 h-16 flex items-center justify-center" style={{ backgroundColor: isDark ? '#2a2a2d' : '#f0f0f0' }}>
                                    <span style={{ fontSize: '24px' }}>📄</span>
                                </div>
                            )}
                        </button>
                    ))}
                    <span className="ml-2 text-xs" style={{ color: textColor }}>
                        {currentIndex + 1} of {attachments.length}
                    </span>
                </div>
            )}
        </div>
    );
};

export default AttachmentViewer;
