def extract_librosa_features(audio,sample_rate:int):
    try:
        import librosa, numpy as np
        return {'mfcc_mean':float(np.mean(librosa.feature.mfcc(y=audio,sr=sample_rate))), 'rms_mean':float(np.mean(librosa.feature.rms(y=audio)))}
    except ImportError: raise RuntimeError('librosa is required for feature extraction')
