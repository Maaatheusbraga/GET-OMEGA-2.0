# INSTALAÇÃO: pip install fastapi uvicorn pyodbc pandas openpyxl
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pyodbc
import pandas as pd
import json

app = FastAPI(title="GET OMEGA 2.0 - Python Engine")

# Configuração de CORS para comunicação com o Frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuração da conexão com o SRV-SISTEMA (Mesmos dados do SQL Management Studio)
DB_CONFIG = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=SRV-SISTEMA;"
    "DATABASE=speds;"
    "UID=relatorio;"
    "PWD=relatorio123;"
    "TrustServerCertificate=yes;"
)

class GenerateRequest(BaseModel):
    procedureId: str
    params: dict
    userName: str = "Matheus"

@app.post("/api/generate-base")
async def generate_base(request: GenerateRequest):
    try:
        # Abre conexão via ODBC nativo
        conn = pyodbc.connect(DB_CONFIG)
        cursor = conn.cursor()
        
        # Extração e limpeza de parâmetros do Frontend
        cli = int(request.params.get('p_cliente', 0))
        cnpj = str(request.params.get('p_cnpj', '')).strip()
        # Formato YYYYMMDD (20250101) - O único que nunca falha no SQL Server
        dt_i = str(request.params.get('p_periodo_i', '')).replace("-", "")
        dt_f = str(request.params.get('p_periodo_f', '')).replace("-", "")
        user = request.userName

        # MAPEAMENTO DAS PARTICULARIDADES DE CADA PROCEDURE
        commands = {
            'efd_fiscal': f"EXEC PROC_GERAR_EFD_FISCAL_GERADOR {cli}, '{cnpj}', '{dt_i}', '{dt_f}', '{user}'",
            'efd_contribuicoes': f"EXEC PROC_GER_EFD_CONTR_GERADOR {cli}, '{cnpj}', '{dt_i}', '{dt_f}', '{user}'",
            'resumo_entrada': f"EXEC PROC_RESUMO_NFE_ENTRADA_SPED_V2_GERADOR {cli}, '{dt_i}', '{dt_f}', '{cnpj}', '{user}'",
            'resumo_saida': f"EXEC PROC_RESUMO_NFE_SAIDA_SPED_GERADOR {cli}, '{dt_i}', '{dt_f}', '{user}'",
            'bloco_e': f"EXEC PROC_EXPORT_E110_E111_GERADOR {cli}, '{dt_i}', '{dt_f}', '{user}'",
            'bloco_ipi': f"EXEC PROC_EXPORT_E510_E520_GERADOR {cli}, '{dt_i}', '{dt_f}', '{user}'"
        }

        sql = commands.get(request.procedureId)
        if not sql: 
            raise HTTPException(status_code=400, detail="Módulo não configurado no backend.")

        print(f"--------------------------------------------------")
        print(f"[SQL EXEC] Comando Bruto: {sql}")
        
        # Garante o formato de data na sessão
        cursor.execute("SET DATEFORMAT ymd")
        cursor.execute(sql)
        
        final_rows = []
        
        # LOGICA CRÍTICA: Varre todos os resultados da Procedure.
        # Procedures que fazem DELETE/INSERT geram resultados vazios antes do SELECT.
        # Este loop "pula" os vazios até encontrar os dados reais.
        while True:
            if cursor.description:
                columns = [col[0] for col in cursor.description]
                raw_data = cursor.fetchall()
                
                # Converte os dados do SQL para dicionários JSON (tratando tipos especiais)
                current_set = []
                for row in raw_data:
                    row_dict = {}
                    for i, value in enumerate(row):
                        # Converte Decimal e Datas para string para evitar erro de serialização
                        if hasattr(value, '__str__') and not isinstance(value, (int, str, float, bool, type(None))):
                            row_dict[columns[i]] = str(value)
                        else:
                            row_dict[columns[i]] = value
                    current_set.append(row_dict)
                
                if current_set:
                    final_rows = current_set # Armazena o último set de dados encontrado
            
            if not cursor.nextset():
                break

        conn.commit()
        cursor.close()
        conn.close()

        # Retorna o sucesso e os dados (limitado a 100 para o preview do grid)
        return {
            "success": True, 
            "data": final_rows[:100], 
            "total": len(final_rows)
        }

    except Exception as e:
        print(f"[ERRO SQL] {str(e)}")
        return {"success": False, "error": f"Erro na Engine Python: {str(e)}"}

@app.get("/api/clientes")
async def get_clientes(search: str = ""):
    """ Rota de consulta rápida de clientes usando Pandas """
    try:
        conn = pyodbc.connect(DB_CONFIG)
        query = f"SELECT TOP 50 id_cliente, nome, cnpj FROM cliente WHERE nome LIKE '%{search}%'"
        df = pd.read_sql(query, conn)
        conn.close()
        return df.to_dict(orient="records")
    except Exception as e:
        print(f"[ERRO CLIENTES] {str(e)}")
        return []

if __name__ == "__main__":
    import uvicorn
    print("🚀 PYTHON ENGINE GET OMEGA 2.0 ONLINE")
    print("Aguardando requisições do Frontend React...")
    uvicorn.run(app, host="0.0.0.0", port=3001)