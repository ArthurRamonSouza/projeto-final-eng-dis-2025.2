export type HealthResponse = {
  service: string;
  status: "ok" | "error";
};

export type DependenciesHealthResponse = {
  service: string;
  status: "ok" | "error";
  dependencies: {
    redis: "ok" | "error";
    postgres: "ok" | "error";
  };
};

export type ToggleAIRequest = {
  enabled: boolean;
};

export type ToggleAIResponse = {
  message: string;
  ai_enabled: boolean;
};