'use client';

import { useState } from 'react';

interface Props {
  videoSrc: string;
  imageSrc: string;
  minHeight?: number;
}

export default function VideoOrImage({ videoSrc, imageSrc, minHeight = 260 }: Props) {
  const [showImage, setShowImage] = useState(false);

  return (
    <div
      className="rounded-xl border border-white/10 overflow-hidden mb-6"
      style={{ height: minHeight }}
    >
      <div className="relative w-full h-full">
        {/* Video — hidden once ended */}
        <video
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          style={{ opacity: showImage ? 0 : 1 }}
          autoPlay
          muted
          playsInline
          onEnded={() => setShowImage(true)}
          onError={() => setShowImage(true)}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>

        {/* Image — fades in when video ends */}
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{
            opacity: showImage ? 1 : 0,
            backgroundImage: `url(${imageSrc})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#0A1628',
          }}
        />
      </div>
    </div>
  );
}
