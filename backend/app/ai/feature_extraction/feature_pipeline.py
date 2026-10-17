from .librosa_features import extract_librosa_features

def extract(audio,sample_rate:int): return extract_librosa_features(audio,sample_rate)
