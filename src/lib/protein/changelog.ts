import raw from "./changelog.json";

export type ProteinChangelogEntry = {
  date: string;
  title: string;
  detail: string;
};

export type ProteinChangelog = {
  product: string;
  updated: string;
  route: string;
  features: ProteinChangelogEntry[];
};

export const proteinChangelog = raw as ProteinChangelog;

export const latestProteinFeatures = proteinChangelog.features;
