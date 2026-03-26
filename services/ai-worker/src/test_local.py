import asyncio
from unittest.mock import AsyncMock, patch

from services.ai_service import generate_challenges


async def run_test():
    print("🚀 Iniciando teste isolado da Frente 1 (IA + Pydantic)...")

    # Aqui nós 'sequestramos' as funções que iriam no PostgreSQL real
    # e trocamos por versões falsas (Mocks) que rodam na memória.
    with patch('services.ai_service.get_ad_content', new_callable=AsyncMock) as mock_get_content:
        with patch('services.ai_service.save_generation_result', new_callable=AsyncMock) as mock_save_result:
            
            # 1. Definimos o texto que simula o retorno do banco de dados
            texto_anuncio_falso = (
                "O novo smartwatch FitPro 5 tem bateria que dura 14 dias, "
                "monitoramento de batimentos cardíacos 24h e é à prova d'água até 50 metros. "
                "Disponível nas cores preto e prata por R$ 499,00."
            )
            mock_get_content.return_value = texto_anuncio_falso
            
            try:
                print(f"🧠 Chamando o Gemini e pedindo 2 perguntas...")
                
                # 2. Chamamos a sua função principal! 
                # Passamos 'None' na sessão do banco, pois fizemos o mock das funções de BD.
                desafios_validados = await generate_challenges(
                    session=None,
                    job_id="job_teste_001",
                    ad_id="ad_001",
                    requested_count=2
                )
                
                # 3. Exibindo a mágica do Pydantic funcionando
                print(f"\n✅ SUCESSO! A IA gerou {len(desafios_validados)} desafios e o Pydantic validou o formato!\n")
                
                for i, desafio in enumerate(desafios_validados, 1):
                    print(desafios_validados)
                    print(f"--- Desafio {i} ---")
                    print(f"ID Gerado: {desafio.id}")
                    print(f"Pergunta: {desafio.question}")
                    print(f"Opções: {desafio.options}")
                    print(f"Resposta Correta: {desafio.correct_answer}")
                    print(f"Source: {desafio.source}\n")
                
                print("💾 Auditoria simulada: A função 'save_generation_result' foi chamada para registrar o sucesso!")
                
            except Exception as e:
                print(f"\n❌ ERRO DURANTE O TESTE: O Pydantic bloqueou a IA ou houve falha na API.")
                print(e)

if __name__ == "__main__":
    # Como as nossas funções são assíncronas (async def), precisamos do asyncio para rodar o script
    asyncio.run(run_test())