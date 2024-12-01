export type HakaiConfig = {
  root: {
    scope: string;
    page: string;
  };
};

export function hakaiConfig(config: HakaiConfig): HakaiConfig {
  return config;
}