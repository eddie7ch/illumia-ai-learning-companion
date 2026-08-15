import { describe, expect, it } from 'vitest';
import { estimateRealtimeCostUsd } from './_aiBudget.js';

describe('estimateRealtimeCostUsd', () => {
  it('stores separate gpt-realtime-2.1-mini modality costs', () => {
    const result = estimateRealtimeCostUsd({
      textInputTokens: 1_000_000,
      textOutputTokens: 1_000_000,
      audioInputTokens: 1_000_000,
      audioOutputTokens: 1_000_000,
      imageInputTokens: 1_000_000,
    });
    expect(result).toEqual({
      textInputCostUsd: 0.6,
      textOutputCostUsd: 2.4,
      audioInputCostUsd: 10,
      audioOutputCostUsd: 20,
      imageInputCostUsd: 0.8,
      totalCostUsd: 33.8,
    });
  });

  it('never creates negative costs from invalid negative counts', () => {
    expect(estimateRealtimeCostUsd({
      textInputTokens: -1,
      textOutputTokens: -1,
      audioInputTokens: -1,
      audioOutputTokens: -1,
      imageInputTokens: -1,
    }).totalCostUsd).toBe(0);
  });
});