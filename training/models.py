from __future__ import annotations

import torch
from torch import nn


class SpeechBiLSTMAttention(nn.Module):
    def __init__(
        self,
        input_dim: int,
        hidden_dim: int,
        embedding_dim: int,
        num_classes: int,
        num_layers: int = 2,
        num_heads: int = 4,
        dropout: float = 0.30,
        max_frames: int = 256,
    ):
        super().__init__()
        if max_frames < 1:
            raise ValueError("max_frames must be positive")
        self.max_frames = max_frames
        self.register_buffer("sampling_grid", torch.linspace(0.0, 1.0, max_frames))
        self.bilstm = nn.LSTM(
            input_dim,
            hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=True,
            dropout=dropout if num_layers > 1 else 0.0,
        )
        model_dim = hidden_dim * 2
        self.attention = nn.MultiheadAttention(
            model_dim, num_heads=num_heads, dropout=dropout, batch_first=True
        )
        self.norm = nn.LayerNorm(model_dim)
        self.pool_score = nn.Linear(model_dim, 1)
        self.embedding_head = nn.Sequential(
            nn.Linear(model_dim, embedding_dim),
            nn.GELU(),
            nn.Dropout(dropout),
        )
        self.classifier = nn.Linear(embedding_dim, num_classes)

    def forward(self, hidden_states: torch.Tensor):
        # Zero rows are padding created only by the training collator.  Online
        # inference sends one unpadded recording at a time.
        # Sample each recording's *valid* frames uniformly.  Keeping this in
        # the exported model makes training and website inference identical.
        if hidden_states.size(1) > self.max_frames:
            counts = hidden_states.abs().sum(dim=-1).ne(0).sum(dim=1).clamp(min=1)
            positions = torch.round(
                self.sampling_grid.unsqueeze(0) * (counts - 1).unsqueeze(1)
            ).long()
            hidden_states = hidden_states.gather(
                1, positions.unsqueeze(-1).expand(-1, -1, hidden_states.size(2))
            )
        valid = hidden_states.abs().sum(dim=-1).ne(0)
        lengths = valid.sum(dim=1).clamp(min=1).cpu()
        packed = nn.utils.rnn.pack_padded_sequence(
            hidden_states, lengths, batch_first=True, enforce_sorted=False
        )
        packed_output, _ = self.bilstm(packed)
        encoded, _ = nn.utils.rnn.pad_packed_sequence(
            packed_output, batch_first=True, total_length=hidden_states.size(1)
        )
        attended, _ = self.attention(
            encoded,
            encoded,
            encoded,
            key_padding_mask=~valid,
            need_weights=False,
        )
        encoded = self.norm(encoded + attended)
        scores = self.pool_score(encoded).squeeze(-1).masked_fill(~valid, -1.0e4)
        weights = torch.softmax(scores, dim=1).unsqueeze(-1)
        pooled = torch.sum(encoded * weights, dim=1)
        embedding = self.embedding_head(pooled)
        logits = self.classifier(embedding)
        return logits, embedding


class FusionTransformer(nn.Module):
    def __init__(
        self,
        speech_dim: int,
        tabular_dims: tuple[int, int, int],
        means: torch.Tensor,
        scales: torch.Tensor,
        num_classes: int = 2,
        model_dim: int = 64,
        num_heads: int = 4,
        num_layers: int = 2,
        dropout: float = 0.25,
    ):
        super().__init__()
        self.speech_dim = speech_dim
        self.memory_dim, self.attention_dim, self.lifestyle_dim = tabular_dims
        self.register_buffer("feature_means", means)
        self.register_buffer("feature_scales", scales)
        self.speech_projection = nn.Linear(speech_dim, model_dim)
        self.memory_projection = nn.Linear(self.memory_dim, model_dim)
        self.attention_projection = nn.Linear(self.attention_dim, model_dim)
        self.lifestyle_projection = nn.Linear(self.lifestyle_dim, model_dim)
        self.modality_embedding = nn.Parameter(torch.zeros(1, 4, model_dim))
        nn.init.normal_(self.modality_embedding, std=0.02)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=model_dim,
            nhead=num_heads,
            dim_feedforward=model_dim * 4,
            dropout=dropout,
            activation="gelu",
            batch_first=True,
            norm_first=True,
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        self.head = nn.Sequential(
            nn.LayerNorm(model_dim),
            nn.Linear(model_dim, model_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(model_dim, num_classes),
        )

    def forward(self, features: torch.Tensor):
        x = (features - self.feature_means) / self.feature_scales
        offset = self.speech_dim
        speech = x[:, :offset]
        memory = x[:, offset : offset + self.memory_dim]
        offset += self.memory_dim
        attention = x[:, offset : offset + self.attention_dim]
        offset += self.attention_dim
        lifestyle = x[:, offset : offset + self.lifestyle_dim]
        tokens = torch.stack(
            [
                self.speech_projection(speech),
                self.memory_projection(memory),
                self.attention_projection(attention),
                self.lifestyle_projection(lifestyle),
            ],
            dim=1,
        )
        encoded = self.transformer(tokens + self.modality_embedding)
        return self.head(encoded.mean(dim=1))


class AblationMLP(nn.Module):
    def __init__(self, input_dim: int, num_classes: int = 2):
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.LayerNorm(64),
            nn.GELU(),
            nn.Dropout(0.25),
            nn.Linear(64, 32),
            nn.GELU(),
            nn.Dropout(0.20),
            nn.Linear(32, num_classes),
        )

    def forward(self, values: torch.Tensor):
        return self.network(values)
