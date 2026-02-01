import { useMemo } from 'react';

interface MiniSparklineProps {
    data: number[];
    width?: number;
    height?: number;
    color?: string;
    strokeWidth?: number;
    className?: string;
}

export const MiniSparkline = ({
    data,
    width = 100,
    height = 40,
    color = '#00FF88',
    strokeWidth = 2,
    className = ''
}: MiniSparklineProps) => {
    const points = useMemo(() => {
        if (!data || data.length === 0) return '';

        const max = Math.max(...data);
        const min = Math.min(...data);
        const range = max - min || 1;

        return data.map((val, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - ((val - min) / range) * height; // Invert y for SVG
            return `${x},${y}`;
        }).join(' ');
    }, [data, width, height]);

    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className={`overflow-visible ${className}`}
            style={{ opacity: 0.6 }}
        >
            <polyline
                points={points}
                fill="none"
                stroke={color === 'currentColor' ? 'currentColor' : color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};
