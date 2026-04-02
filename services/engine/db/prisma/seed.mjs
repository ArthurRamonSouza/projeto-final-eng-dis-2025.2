// services/engine/db/prisma/seed.mjs
import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });
dotenv.config({ path: resolve(__dirname, "../../.env"), override: true });

const { Pool } = pg;

const connectionString =
    process.env.DATABASE_URL ??
    "postgresql://app:app@localhost:5433/app";

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("Iniciando o seed de banco de dados...");

    // ---------------------------------------------------------
    // Anúncio 1: Smartwatch FitPro
    // ---------------------------------------------------------
    const ad1 = await prisma.ad.create({
        data: {
            id: "ad_seed_001",
            title: "Smartwatch FitPro",
            advertiserName: "TechWear",
            status: "active",
            contents: {
                create: {
                    contentType: "description",
                    contentText:
                        "O Smartwatch FitPro monitora seus batimentos 24h, possui resistência à água até 50m e bateria de 14 dias de duração.",
                },
            },
            staticChallenges: {
                create: [
                    {
                        type: "multiple_choice",
                        question:
                            "Qual a duração da bateria do Smartwatch FitPro?",
                        optionsJson: [
                            "7 dias",
                            "10 dias",
                            "14 dias",
                            "24 horas",
                        ],
                        correctAnswer: "14 dias",
                        source: "static",
                        status: "active",
                    },
                    {
                        type: "multiple_choice",
                        question:
                            "Qual o nível de resistência à água do relógio?",
                        optionsJson: [
                            "Não é resistente",
                            "Resiste até 10m",
                            "Resiste até 50m",
                            "Resiste até 100m",
                        ],
                        correctAnswer: "Resiste até 50m",
                        source: "static",
                        status: "active",
                    },
                    {
                        type: "multiple_choice",
                        question:
                            "Qual métrica de saúde é monitorada 24h pelo dispositivo?",
                        optionsJson: [
                            "Pressão arterial",
                            "Batimentos",
                            "Glicose",
                            "Passos apenas",
                        ],
                        correctAnswer: "Batimentos",
                        source: "static",
                        status: "active",
                    },
                ],
            },
        },
    });

    // ---------------------------------------------------------
    // Anúncio 2: Fone de Ouvido QuietSound
    // ---------------------------------------------------------
    const ad2 = await prisma.ad.create({
        data: {
            id: "ad_seed_002",
            title: "Fone de Ouvido QuietSound",
            advertiserName: "AudioTech",
            status: "active",
            contents: {
                create: {
                    contentType: "description",
                    contentText:
                        "O Fone QuietSound possui cancelamento de ruído ativo (ANC), bateria com 30 horas de duração e áudio de alta fidelidade para a melhor experiência musical.",
                },
            },
            staticChallenges: {
                create: [
                    {
                        type: "multiple_choice",
                        question:
                            "Quantas horas dura a bateria do fone QuietSound?",
                        optionsJson: [
                            "10 horas",
                            "20 horas",
                            "30 horas",
                            "40 horas",
                        ],
                        correctAnswer: "30 horas",
                        source: "static",
                        status: "active",
                    },
                    {
                        type: "multiple_choice",
                        question:
                            "Qual o principal recurso de destaque do fone?",
                        optionsJson: [
                            "Resistência à água",
                            "Cancelamento de ruído (ANC)",
                            "Leitor de cartão SD",
                            "Rádio FM",
                        ],
                        correctAnswer: "Cancelamento de ruído (ANC)",
                        source: "static",
                        status: "active",
                    },
                    {
                        type: "multiple_choice",
                        question:
                            "Qual a qualidade do áudio mencionada no anúncio?",
                        optionsJson: [
                            "Áudio padrão",
                            "Áudio de alta fidelidade",
                            "Áudio mono",
                            "Áudio de baixa resolução",
                        ],
                        correctAnswer: "Áudio de alta fidelidade",
                        source: "static",
                        status: "active",
                    },
                ],
            },
        },
    });

    // ---------------------------------------------------------
    // Anúncio 3: Cadeira Ergonômica Pro
    // ---------------------------------------------------------
    const ad3 = await prisma.ad.create({
        data: {
            id: "ad_seed_003",
            title: "Cadeira Ergonômica Pro",
            advertiserName: "OfficeComfort",
            status: "active",
            contents: {
                create: {
                    contentType: "description",
                    contentText:
                        "A Cadeira Ergonômica Pro oferece suporte lombar ajustável, material em tela respirável e suporta até 150kg, ideal para longas jornadas de trabalho ou jogos.",
                },
            },
            staticChallenges: {
                create: [
                    {
                        type: "multiple_choice",
                        question:
                            "Qual o peso máximo suportado pela Cadeira Ergonômica Pro?",
                        optionsJson: ["100kg", "120kg", "150kg", "200kg"],
                        correctAnswer: "150kg",
                        source: "static",
                        status: "active",
                    },
                    {
                        type: "multiple_choice",
                        question:
                            "Qual tipo de suporte ajustável a cadeira possui?",
                        optionsJson: [
                            "Suporte para os pés",
                            "Suporte lombar ajustável",
                            "Suporte para copo",
                            "Suporte para notebook",
                        ],
                        correctAnswer: "Suporte lombar ajustável",
                        source: "static",
                        status: "active",
                    },
                    {
                        type: "multiple_choice",
                        question:
                            "Qual a característica principal do material da cadeira?",
                        optionsJson: [
                            "Couro sintético",
                            "Tela respirável",
                            "Plástico rígido",
                            "Veludo",
                        ],
                        correctAnswer: "Tela respirável",
                        source: "static",
                        status: "active",
                    },
                ],
            },
        },
    });

    console.log(`Seed concluído com sucesso! Anúncios gerados:`);
    console.log(`- ${ad1.id} (${ad1.title})`);
    console.log(`- ${ad2.id} (${ad2.title})`);
    console.log(`- ${ad3.id} (${ad3.title})`);
}

main()
    .catch((e) => {
        console.error("Erro durante o seed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end(); // Importante fechar o pool
    });
