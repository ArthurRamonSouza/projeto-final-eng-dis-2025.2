import asyncio

from sqlalchemy.future import select

# Importando a configuração e modelos do nosso código
from db.session import DATABASE_URL, AsyncSessionLocal, Base, engine
from models.domain import AdContent
from services.repository import get_ad_content, save_generation_result


async def run_db_test():
    print(f"URL QUE O PYTHON ESTÁ USANDO: {DATABASE_URL}")  # <-- Adicione esta linha
    print("🗄️ Conectando ao PostgreSQL local (Docker)...")

    # 1. Cria as tabelas reais no banco de dados
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        print("✅ Tabelas 'ad_contents' e 'generation_results' criadas com sucesso!")

    async with AsyncSessionLocal() as session:
        # 2. Inserindo um dado falso (Seed) para simular o que a API Orquestradora faria
        ad_id_teste = "ad_banco_001"

        existente = await session.execute(
            select(AdContent).where(AdContent.ad_id == ad_id_teste)
        )
        if not existente.scalar_one_or_none():
            novo_anuncio = AdContent(
                id="content_001",
                ad_id=ad_id_teste,
                content_type="description",
                content_text="O Tênis Cloud Max oferece amortecimento supremo e malha respirável. Apenas R$ 299,00.",
            )
            session.add(novo_anuncio)
            await session.commit()
            print("🌱 Dado de anúncio inserido na tabela 'ad_contents'!")

        # 3. Testando a sua função LER (get_ad_content)
        print("\n🔍 Testando get_ad_content()...")
        texto_recuperado = await get_ad_content(session, ad_id_teste)
        print(f"Texto puxado do banco: '{texto_recuperado}'")

        # 4. Testando a sua função de GRAVAR (save_generation_result)
        print("\n💾 Testando save_generation_result()...")
        resultado = await save_generation_result(
            session=session,
            job_id="job_banco_123",
            ad_id=ad_id_teste,
            requested_count=5,
            generated_count=5,
            status="completed",
            error_message=None,
        )
        print(
            f"Registro de log salvo na tabela! ID: {resultado.id} | Status: {resultado.status}"
        )


if __name__ == "__main__":
    asyncio.run(run_db_test())
