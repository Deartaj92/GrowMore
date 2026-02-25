// eslint-disable-next-line
import React, { useEffect, useState, useRef, useId, CSSProperties, ReactNode } from 'react';
import './GlassSurface.css';

export interface GlassSurfaceProps {
    children?: ReactNode;
    width?: number | string;
    height?: number | string;
    borderRadius?: number;
    borderWidth?: number;
    brightness?: number;
    opacity?: number;
    blur?: number;
    displace?: number;
    backgroundOpacity?: number;
    saturation?: number;
    distortionScale?: number;
    redOffset?: number;
    greenOffset?: number;
    blueOffset?: number;
    xChannel?: string;
    yChannel?: string;
    mixBlendMode?: "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "color" | "luminosity";
    className?: string;
    style?: CSSProperties;
}

const GlassSurface: React.FC<GlassSurfaceProps> = ({
    children,
    width = '100%',
    height = '100%',
    borderRadius = 20,
    borderWidth = 0.07,
    brightness = 50,
    opacity = 0.93,
    blur = 11,
    displace = 0,
    backgroundOpacity = 0,
    saturation = 1,
    distortionScale = 180,
    xChannel = 'R',
    yChannel = 'G',
    className = '',
    style = {}
}) => {
    const uniqueId = useId().replace(/:/g, '-');
    const filterId = `glass-filter-${uniqueId}`;
    const redGradId = `red-grad-${uniqueId}`;
    const greenGradId = `green-grad-${uniqueId}`;

    const [svgSupported, setSvgSupported] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const feImageRef = useRef<SVGFEImageElement>(null);
    const displacementRef = useRef<SVGFEDisplacementMapElement>(null);
    const gaussianBlurRef = useRef<SVGFEGaussianBlurElement>(null);

    const generateDisplacementMap = () => {
        const rect = containerRef.current?.getBoundingClientRect();
        const actualWidth = rect?.width || (typeof width === 'number' ? width : 1200);
        const actualHeight = rect?.height || (typeof height === 'number' ? height : 48);

        // Edge size matches the border radius precisely for natural glass bevel
        const bevelWidth = Math.min((typeof borderRadius === 'number' ? borderRadius : 24) * 1.5, actualWidth / 2);
        const bevelHeight = Math.min((typeof borderRadius === 'number' ? borderRadius : 24) * 1.5, actualHeight / 2);

        // SVG math: 128 is neutral. > 128 shifts left/up, < 128 shifts right/down.
        // We want the viewport content behind to shift INWARDS toward the glass normal.
        const svgContent = `
      <svg viewBox="0 0 ${actualWidth} ${actualHeight}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="edgeLeft" x1="0%" y1="0%" x2="100%" y2="0%">
            <!-- X=left pushes right (R < 128) -->
            <stop offset="0%" stop-color="rgb(64, 128, 128)"/>
            <stop offset="100%" stop-color="rgb(128, 128, 128)"/>
          </linearGradient>
          <linearGradient id="edgeRight" x1="0%" y1="0%" x2="100%" y2="0%">
            <!-- X=right pushes left (R > 128) -->
            <stop offset="0%" stop-color="rgb(128, 128, 128)"/>
            <stop offset="100%" stop-color="rgb(192, 128, 128)"/>
          </linearGradient>
          <linearGradient id="edgeTop" x1="0%" y1="0%" x2="0%" y2="100%">
            <!-- Y=top pushes down (G < 128) -->
            <stop offset="0%" stop-color="rgb(128, 64, 128)"/>
            <stop offset="100%" stop-color="rgb(128, 128, 128)"/>
          </linearGradient>
          <linearGradient id="edgeBottom" x1="0%" y1="0%" x2="0%" y2="100%">
            <!-- Y=bottom pushes up (G > 128) -->
            <stop offset="0%" stop-color="rgb(128, 128, 128)"/>
            <stop offset="100%" stop-color="rgb(128, 192, 128)"/>
          </linearGradient>
        </defs>
        
        <!-- Base Center Canvas: Absolutely 100% neutral zero-distortion -->
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" fill="rgb(128,128,128)" />
        
        <!-- Render 4 perimeter bevels precisely -->
        <rect x="0" y="0" width="${bevelWidth}" height="${actualHeight}" fill="url(#edgeLeft)" />
        <rect x="${actualWidth - bevelWidth}" y="0" width="${bevelWidth}" height="${actualHeight}" fill="url(#edgeRight)" />
        <rect x="0" y="0" width="${actualWidth}" height="${bevelHeight}" fill="url(#edgeTop)" />
        <rect x="0" y="${actualHeight - bevelHeight}" width="${actualWidth}" height="${bevelHeight}" fill="url(#edgeBottom)" />
      </svg>
    `;

        return `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
    };

    const updateDisplacementMap = () => {
        feImageRef.current?.setAttribute('href', generateDisplacementMap());
    };

    useEffect(() => {
        updateDisplacementMap();

        if (displacementRef.current) {
            displacementRef.current.setAttribute('scale', distortionScale.toString());
            displacementRef.current.setAttribute('xChannelSelector', xChannel);
            displacementRef.current.setAttribute('yChannelSelector', yChannel);
        }

        gaussianBlurRef.current?.setAttribute('stdDeviation', displace.toString());
    }, [
        width,
        height,
        borderRadius,
        borderWidth,
        brightness,
        opacity,
        blur,
        displace,
        distortionScale,
        xChannel,
        yChannel
    ]);

    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver(() => {
            setTimeout(updateDisplacementMap, 0);
        });

        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    useEffect(() => {
        setTimeout(updateDisplacementMap, 0);
    }, [width, height]);

    useEffect(() => {
        setSvgSupported(supportsSVGFilters());
    }, []);

    const supportsSVGFilters = () => {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return false;
        }

        const isWebkit = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
        const isFirefox = /Firefox/.test(navigator.userAgent);

        if (isWebkit || isFirefox) {
            return false;
        }

        const div = document.createElement('div');
        div.style.backdropFilter = `url(#${filterId})`;

        return div.style.backdropFilter !== '';
    };

    const containerStyle: React.CSSProperties = {
        ...style,
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: `${borderRadius}px`,
        '--glass-frost': backgroundOpacity,
        '--glass-saturation': saturation,
        '--filter-id': `url(#${filterId})`
    } as React.CSSProperties;

    // Notice there is exactly *ONE* displacement map now.
    // The previous 3 separate maps and feColorMatrix node arrays have been completely destroyed.
    // This removes the "3 reflections" visual breakdown entirely!
    return (
        <div
            ref={containerRef}
            className={`glass-surface ${svgSupported ? 'glass-surface--svg' : 'glass-surface--fallback'} ${className}`}
            style={containerStyle}
        >
            <svg className="glass-surface__filter" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <filter id={filterId} colorInterpolationFilters="sRGB" x="0%" y="0%" width="100%" height="100%">
                        <feImage ref={feImageRef} x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map" />

                        <feDisplacementMap
                            ref={displacementRef}
                            in="SourceGraphic"
                            in2="map"
                            id="displacement"
                            result="displaced"
                        />

                        <feGaussianBlur ref={gaussianBlurRef} in="displaced" stdDeviation="0.7" />
                    </filter>
                </defs>
            </svg>

            <div className="glass-surface__content">{children}</div>
        </div>
    );
};

export default GlassSurface;
