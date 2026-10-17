def remove_silence(audio, sample_rate:int):
    try:
        import librosa
        trimmed,_=librosa.effects.trim(audio)
        return trimmed
    except ImportError: raise RuntimeError('librosa is required for silence removal')
