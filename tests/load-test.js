import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";

const listAdsLatency = new Trend("list_ads_latency", true);
const challengeLatency = new Trend("challenge_latency", true);
const httpErrors = new Rate("http_errors");
const requestCount = new Counter("total_requests");

export const options = {
    stages: [
        { duration: "30s", target: 50 },
        { duration: "1m", target: 50 },
        { duration: "15s", target: 0 },
    ],
    thresholds: {
        http_req_duration: ["p(95)<500"],
        list_ads_latency: ["p(95)<200"],
        challenge_latency: ["p(95)<400"],
        http_errors: ["rate<0.01"],
    },

    summaryTrendStats: ["p(50)", "p(95)", "p(99)", "avg", "min", "max"],
};

const AD_COUNT = 5;

export function setup() {
    const adIds = [];

    for (let i = 0; i < AD_COUNT; i++) {
        const payload = JSON.stringify({
            title: `K6 Load Test Ad ${i + 1}`,
            advertiser_name: "K6 Tester",
            content_type: "text",
            content_text:
                "Conteúdo do anúncio de carga criado automaticamente pelo K6 para fins de stress test.",
        });

        const res = http.post(`${BASE_URL}/ads`, payload, {
            headers: { "Content-Type": "application/json" },
            timeout: "10s",
        });

        if (res.status !== 201) {
            console.warn(
                `[setup] Falha ao criar anúncio ${i + 1} (HTTP ${res.status}). Body: ${res.body}`,
            );
            continue;
        }

        let body;
        try {
            body = JSON.parse(res.body);
        } catch {
            console.warn(
                `[setup] Resposta inválida ao criar anúncio ${i + 1}.`,
            );
            continue;
        }

        const adId = body?.ad?.id;
        if (adId) {
            adIds.push(adId);
            console.log(`[setup] Anúncio criado com sucesso: adId=${adId}`);
        }
    }

    if (adIds.length === 0) {
        console.warn(
            "[setup] Nenhum anúncio criado. Teste de challenge será ignorado.",
        );
    } else {
        console.log(
            `[setup] ${adIds.length} anúncio(s) criado(s) com sucesso.`,
        );
    }

    return { adIds };
}

export default function (data) {
    const { adIds } = data;
    const adId =
        adIds.length > 0
            ? adIds[Math.floor(Math.random() * adIds.length)]
            : null;

    {
        const res = http.get(`${BASE_URL}/ads`, {
            tags: { endpoint: "list_ads" },
        });
        requestCount.add(1);

        check(res, {
            "GET /ads → status 200 ou 429": (r) =>
                r.status === 200 || r.status === 429,
            "GET /ads → body é array JSON": (r) => {
                if (r.status === 429) return true;
                try {
                    const body = JSON.parse(r.body);
                    return Array.isArray(body.items);
                } catch {
                    return false;
                }
            },
        });

        listAdsLatency.add(res.timings.duration);
        httpErrors.add(res.status >= 500);
    }

    sleep(Math.random() * 0.5 + 0.3);

    if (Math.random() < 0.1) {
        const payload = JSON.stringify({
            title: `K6 Ad VU${__VU} iter${__ITER}`,
            advertiser_name: "K6 Tester",
            content_type: "text",
            content_text:
                "Anúncio criado durante carga para testar escrita concorrente.",
        });

        const res = http.post(`${BASE_URL}/ads`, payload, {
            headers: { "Content-Type": "application/json" },
            tags: { endpoint: "create_ad" },
        });
        requestCount.add(1);

        check(res, {
            "POST /ads → 201 ou 429": (r) =>
                r.status === 201 || r.status === 429,
        });

        if (res.status === 429) {
            check(res, {
                "POST /ads → 429 possui Retry-After ou mensagem": (r) => {
                    try {
                        return (
                            r.headers["Retry-After"] !== undefined ||
                            r.body.length > 0
                        );
                    } catch {
                        return false;
                    }
                },
            });
        }

        httpErrors.add(res.status >= 500);
    }

    sleep(Math.random() * 0.5 + 0.3);

    if (adId) {
        const res = http.get(`${BASE_URL}/ads/${adId}/challenge`, {
            tags: { endpoint: "get_challenge" },
        });
        requestCount.add(1);

        check(res, {
            "GET /ads/:adId/challenge → 200, 404 ou 429": (r) =>
                r.status === 200 || r.status === 404 || r.status === 429,
            "GET /ads/:adId/challenge → possui campo 'challenge' (200)": (
                r,
            ) => {
                if (r.status !== 200) return true;
                try {
                    const body = JSON.parse(r.body);
                    return (
                        body.challenge !== undefined &&
                        typeof body.challenge.question === "string" &&
                        Array.isArray(body.challenge.options)
                    );
                } catch {
                    return false;
                }
            },
            "GET /ads/:adId/challenge → 'source' é 'ai' ou 'static'": (r) => {
                if (r.status !== 200) return true;
                try {
                    const body = JSON.parse(r.body);
                    return ["ai", "static"].includes(body.challenge?.source);
                } catch {
                    return false;
                }
            },
        });

        challengeLatency.add(res.timings.duration);
        httpErrors.add(res.status >= 500);
    }

    sleep(Math.random() * 1 + 0.5);
}

export function teardown(data) {
    console.log(`[teardown] Teste concluído. adIds usados: ${data.adIds}`);
}
