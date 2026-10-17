def normalize(audio):
    import numpy as np
    x=np.asarray(audio,dtype=float); m=float(np.max(np.abs(x))) if x.size else 0
    return x/m if m else x
