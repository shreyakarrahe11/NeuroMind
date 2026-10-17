def resample(audio, source_rate:int, target_rate:int=16000):
    try:
        import librosa
        return librosa.resample(audio, orig_sr=source_rate, target_sr=target_rate)
    except ImportError: raise RuntimeError('librosa is required for audio resampling')
