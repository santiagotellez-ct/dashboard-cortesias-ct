function mergeRedemptionState(records, redemptions) {
  return records.map((record) => {
    const redeemedAt = redemptions[record.id];
    return {
      ...record,
      redeemed: Boolean(redeemedAt),
      redeemedAt: redeemedAt || null
    };
  });
}

export { mergeRedemptionState };
