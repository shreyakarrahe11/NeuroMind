class WhisperService:
    def __init__(self,model_name='base'): self.model_name=model_name; self.model=None
    def transcribe(self,path:str):
        try:
            import whisper
        except ImportError: raise RuntimeError('openai-whisper is required for transcription')
        if self.model is None: self.model=whisper.load_model(self.model_name)
        return self.model.transcribe(path)
