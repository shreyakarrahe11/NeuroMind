import numpy as np
import torch
from torch import nn

from training.train_fusion import compute_class_weights


def test_binary_class_weights_match_binary_logits():
    labels = np.array([0, 0, 0, 1, 1], dtype=np.int64)
    weights = compute_class_weights(labels, num_classes=2)
    assert weights.shape == (2,)
    criterion = nn.CrossEntropyLoss(weight=torch.tensor(weights, dtype=torch.float32))
    logits = torch.tensor([[2.0, 0.1], [1.0, 0.2], [0.8, 0.2], [0.2, 1.0], [0.1, 1.5]])
    loss = criterion(logits, torch.tensor(labels, dtype=torch.long))
    assert torch.isfinite(loss)


def test_class_weight_helper_rejects_unexpected_label_index():
    labels = np.array([0, 1, 2], dtype=np.int64)
    try:
        compute_class_weights(labels, num_classes=2)
    except ValueError:
        return
    raise AssertionError('Unexpected class index should be rejected')
