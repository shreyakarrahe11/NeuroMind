import React, { useState } from 'react';
import { Image as ImageIcon, Volume2, Music, Video } from 'lucide-react';

interface MediaStimulusProps {
  type: 'image' | 'audio' | 'video' | 'music';
  src: string;
  alt?: string;
  caption?: string;
  autoPlay?: boolean;
}

export const MediaStimulus: React.FC<MediaStimulusProps> = ({
  type,
  src,
  alt = 'Stimulus Item',
  caption,
  autoPlay = false,
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const audioMimeType = src.toLowerCase().endsWith('.wav') ? 'audio/wav' : 'audio/mpeg';
  const videoMimeType = src.toLowerCase().endsWith('.webm') ? 'video/webm' : 'video/mp4';

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden text-slate-800">
      {type === 'image' && (
        <div className="relative w-full max-w-md aspect-4/3 rounded-lg overflow-hidden bg-slate-200 border border-slate-300 flex items-center justify-center shadow-inner">
          {imageFailed ? (
            <div className="flex flex-col items-center justify-center p-6 text-slate-400">
              <ImageIcon className="mb-2 h-12 w-12" aria-hidden="true" />
              <span className="text-xs font-medium">{alt}</span>
            </div>
          ) : (
            <img
              src={src}
              alt={alt}
              className="w-full h-full object-cover"
              onError={() => setImageFailed(true)}
            />
          )}
        </div>
      )}

      {type === 'audio' && (
        <div className="w-full max-w-md p-4 bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <Volume2 className="w-6 h-6" />
          </div>
          <audio controls autoPlay={autoPlay} preload="auto" className="w-full">
            <source src={src} type={audioMimeType} />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      {type === 'music' && (
        <div className="w-full max-w-md p-4 bg-purple-50 rounded-lg border border-purple-200 shadow-xs flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
            <Music className="w-6 h-6" />
          </div>
          <p className="text-xs text-purple-900 font-medium text-center">Audio Sequence Stimulus</p>
          <audio controls autoPlay={autoPlay} preload="auto" className="w-full">
            <source src={src} type={audioMimeType} />
            Your browser does not support the music element.
          </audio>
        </div>
      )}

      {type === 'video' && (
        <div className="w-full max-w-md aspect-video rounded-lg overflow-hidden bg-black border border-slate-800">
          <video controls autoPlay={autoPlay} playsInline preload="auto" className="w-full h-full object-contain">
            <source src={src} type={videoMimeType} />
            Your browser does not support video play.
          </video>
        </div>
      )}

      {caption && <p className="mt-2 text-xs text-slate-500 font-medium text-center">{caption}</p>}
    </div>
  );
};
