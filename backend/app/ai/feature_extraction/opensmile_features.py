def extract_opensmile_features(path:str):
    try:
        import opensmile
        smile=opensmile.Smile(feature_set=opensmile.FeatureSet.eGeMAPSv02,feature_level=opensmile.FeatureLevel.Functionals)
        df=smile.process_file(path); return df.iloc[0].to_dict()
    except ImportError: raise RuntimeError('opensmile is required for OpenSMILE extraction')
