import React, { useState, useRef } from 'react';
import { UploadCloud, FileAudio, CheckCircle2, Trash2, Volume2 } from 'lucide-react';

interface AudioUploaderProps {
  onAudioUploaded: (file: File, url: string) => void;
  onClearAudio: () => void;
  uploadedFileName?: string;
  uploadedAudioUrl?: string;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  onAudioUploaded,
  onClearAudio,
  uploadedFileName,
  uploadedAudioUrl,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    const validFormats = ['audio/wav', 'audio/x-wav', 'audio/mp3', 'audio/mpeg', 'audio/flac', 'audio/x-flac', 'audio/x-m4a', 'audio/m4a', 'audio/mp4', 'audio/webm', 'audio/ogg'];
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (validFormats.includes(file.type) || ['wav', 'mp3', 'flac', 'm4a', 'webm', 'ogg'].includes(ext || '')) {
      const url = URL.createObjectURL(file);
      onAudioUploaded(file, url);
    } else {
      alert('Please upload a valid audio file (WAV, MP3, FLAC, M4A, WebM, or OGG).');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
      <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
        <UploadCloud className="w-4 h-4 text-cyan-600" />
        Upload Speech Audio File
      </h4>

      {uploadedAudioUrl ? (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center">
                <FileAudio className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900 truncate max-w-xs">
                  {uploadedFileName || 'Uploaded Speech File'}
                </p>
                <p className="text-[10px] text-slate-500">Formats supported: WAV, MP3, FLAC, M4A, WebM, OGG</p>
              </div>
            </div>
            <button
              onClick={onClearAudio}
              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              title="Remove File"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <audio controls src={uploadedAudioUrl} className="w-full">
            Your browser does not support the audio element.
          </audio>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            isDragOver
              ? 'border-cyan-500 bg-cyan-50/50'
              : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
            <UploadCloud className="w-6 h-6" />
          </div>
          <p className="text-xs font-semibold text-slate-800">
            Click to upload or drag & drop audio file
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Supported formats: <strong>.WAV, .MP3, .FLAC, .M4A, .WEBM, .OGG</strong>
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".wav,.mp3,.flac,.m4a,.webm,.ogg,audio/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
};
