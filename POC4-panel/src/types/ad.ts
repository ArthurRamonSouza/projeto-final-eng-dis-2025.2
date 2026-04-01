export type AdStatus = "active" | "inactive";

export type Ad = {
  id: string;
  title: string;
  advertiser_name: string;
  status: AdStatus;
};

export type CreateAdPayload = {
  title: string;
  advertiser_name: string;
  content_type: "transcript" | "description" | "summary";
  content_text: string;
};

export type CreateAdResponse = {
  ad: {
    id: string;
    title: string;
    advertiser_name: string;
    status: AdStatus;
  };
  content: {
    id: string;
    content_type: "transcript" | "description" | "summary";
  };
  initial_refill_requested: boolean;
};

export type ListAdsResponse = {
  items: Ad[];
};