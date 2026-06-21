export const rateOfChange = (previous: number, current: number) => ((current-previous)/previous) * 100;

export const rateOfChangePrevious = (current: number, roc: number) => current / (1 + roc);