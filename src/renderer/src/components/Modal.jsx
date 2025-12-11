import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, useDragControls } from 'framer-motion';

const Modal = ({ isOpen, onClose, title, children, isDark }) => {
    const dragControls = useDragControls();

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const bgColor = isDark ? '#252526' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#000000';
    const borderColor = isDark ? '#3e3e42' : '#d4d4d4';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
                drag
                dragListener={false}
                dragControls={dragControls}
                dragMomentum={false}
                className="relative w-full max-w-md rounded-lg shadow-xl"
                style={{ backgroundColor: bgColor, color: textColor, border: `1px solid ${borderColor}` }}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", duration: 0.5 }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between p-4 border-b cursor-move"
                    style={{ borderColor }}
                    onPointerDown={(e) => dragControls.start(e)}
                >
                    <h3 className="text-lg font-semibold select-none">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4">
                    {children}
                </div>
            </motion.div>
        </div>
    );
};

export default Modal;
