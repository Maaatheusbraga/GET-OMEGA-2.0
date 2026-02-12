# INSTALAÇÃO: pip install fastapi uvicorn pyodbc pydantic
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import pyodbc
from datetime import datetime

app = FastAPI(title="GET OMEGA 2.0 - Python Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    params: Dict[str, Any]
    userName: str = "Matheus"
    reg: Optional[str] = None
    xmlFilters: Optional[dict] = None

@app.post("/api/generate-base")
async def generate_base(request: GenerateRequest):
    conn = None
    try:
        conn = pyodbc.connect(DB_CONFIG, autocommit=True)
        cursor = conn.cursor()
        
        p = request.params
        pid = request.procedureId.strip()
        user = str(request.userName).replace("'", "")
        cli = int(p.get('p_cliente') or p.get('id_cliente') or 0)
        cnpj = str(p.get('p_cnpj') or '').strip()
        raw_dt_i = str(p.get('p_periodo_i') or p.get('data_inicio') or '')
        raw_dt_f = str(p.get('p_periodo_f') or p.get('data_fim') or '')
        
        dt_i_br, dt_f_br = "", ""

        try:
            if raw_dt_i and raw_dt_f:
                date_i = datetime.strptime(raw_dt_i, '%Y-%m-%d')
                date_f = datetime.strptime(raw_dt_f, '%Y-%m-%d')
                if date_i > date_f:
                    return {"success": False, "error": "ERRO: A Data de Início não pode ser maior que a Data Final."}
                dt_i_br, dt_f_br = date_i.strftime('%d/%m/%Y'), date_f.strftime('%d/%m/%Y')
        except:
            return {"success": False, "error": "Datas inválidas."}

        prefix = "SET NOCOUNT ON; SET DATEFORMAT dmy; "
        reg = request.reg
        sql_exec, sql_select = "", ""

        # Mapeamento de Roteamento (Simplificado para o exemplo, mantendo sua lógica)
        if pid == 'efd_fiscal':
            sql_exec = f"{prefix} EXEC PROC_GERAR_EFD_FISCAL_GERADOR {cli}, '{cnpj}', '{dt_i_br}', '{dt_f_br}', '{user}'"
        elif pid == 'efd_contribuicoes':
            sql_exec = f"{prefix} EXEC PROC_REL_CONTRIBUICOES_GERADOR {cli}, '{cnpj}', '{dt_i_br}', '{dt_f_br}', '{user}'"
            if reg: sql_select = f"SELECT * FROM TBL_EFD_CONT_{''.join(filter(str.isalnum, reg))} WITH(NOLOCK) WHERE ID_CLIENTE={cli} AND CAST(PERIODO AS DATE) BETWEEN '{dt_i_br}' AND '{dt_f_br}' ORDER BY CAST(PERIODO AS DATE)"
        elif pid == 'bloco_d' or pid == 'bloco_1000':
            sql_exec = f"{prefix} EXEC PROC_REL_CONTRIBUICOES_GERADOR {cli}, '{cnpj}', '{dt_i_br}', '{dt_f_br}', '{user}'"
            if reg: sql_select = f"SELECT * FROM TBL_EFD_CONT_{''.join(filter(str.isalnum, reg))} WITH(NOLOCK) WHERE (ID_CLIENTE={cli} OR CNPJ='{cnpj}') AND CAST(PERIODO AS DATE) BETWEEN '{dt_i_br}' AND '{dt_f_br}' ORDER BY CAST(PERIODO AS DATE)"
        elif pid == 'base_xml':
            em, tp = request.xmlFilters.get('emitente'), request.xmlFilters.get('tipo')
            where = f"id_cliente={cli} and xMotivo='Autorizado o uso da NF-e' and cast(periodo as date) between '{dt_i_br}' and '{dt_f_br}'"
            if em == 'proprios': where += f" and IND_EMIT='0' " + (f"and Tipo='0'" if tp=='entrada' else f"and Tipo='1'" if tp=='saida' else "")
            else: where += " and IND_EMIT='1'"
            sql_select = f"{prefix} SELECT * FROM TBL_XML WITH(NOLOCK) WHERE {where}"
        elif pid == 'resumo_entrada':
            sql_exec = f"{prefix} EXEC PROC_RESUMO_NFE_ENTRADA_SPED_V2_GERADOR {cli}, '{dt_i_br}', '{dt_f_br}', '{cnpj}', '{user}'"
            sql_select = f"SELECT * FROM TBL_RESUMO_NFE_ENTRADA_SPED WITH(NOLOCK) WHERE ID_CLIENTE={cli} AND CAST(PERIODO AS DATE) BETWEEN '{dt_i_br}' AND '{dt_f_br}'"
        elif pid == 'resumo_saida':
            sql_exec = f"{prefix} EXEC PROC_RESUMO_NFE_SAIDA_SPED_GERADOR {cli}, '{dt_i_br}', '{dt_f_br}', '{user}'"
            sql_select = f"SELECT * FROM TBL_RESUMO_NFE_SAIDA_SPED WITH(NOLOCK) WHERE ID_CLIENTE={cli} AND CAST(PERIODO AS DATE) BETWEEN '{dt_i_br}' AND '{dt_f_br}'"
        elif pid == 'resumo_valores':
            sql_exec = f"{prefix} EXEC PROC_RES_VAL_SPED_GERADOR {cli}, '{dt_i_br}', '{dt_f_br}', '{user}'"
            sql_select = f"SELECT * FROM TBL_RESUMO_SPED WITH(NOLOCK) WHERE ID_CLIENTE={cli} AND CAST(PERIODO AS DATE) BETWEEN '{dt_i_br}' AND '{dt_f_br}'"
        elif pid == 'bloco_e':
            sql_exec = f"{prefix} EXEC PROC_EXPORT_E110_E111_GERADOR {cli}, '{dt_i_br}', '{dt_f_br}', '{user}'"
        elif pid == 'bloco_ipi':
            sql_exec = f"{prefix} EXEC PROC_EXPORT_E510_E520_GERADOR {cli}, '{dt_i_br}', '{dt_f_br}', '{user}'"
        elif pid == 'efd_bloco_m':
            sql_exec = f"{prefix} EXEC PROC_GERAR_EFD_CONTRIBUICOES_BLOCO_M '{cnpj}', '{dt_i_br}', '{dt_f_br}', '{user}'"
            sql_select = "SELECT 'Processamento Concluido' as STATUS"

        if sql_exec: cursor.execute(sql_exec)
        target_cursor = cursor
        if sql_select: target_cursor = cursor.execute(sql_select)

        all_tables = []
        fiscal_static_names = ["C170", "C190", "D190", "D590"]
        table_idx = 0

        while True:
            if not target_cursor.description:
                if not target_cursor.nextset(): break
                continue
            
            columns = [col[0] for col in target_cursor.description]
            rows = target_cursor.fetchall()
            
            full_rows = []
            for row in rows:
                row_dict = {}
                for i, value in enumerate(row):
                    if isinstance(value, datetime): row_dict[columns[i]] = value.strftime('%d/%m/%Y')
                    else: row_dict[columns[i]] = value
                full_rows.append(row_dict)
            
            t_name = fiscal_static_names[table_idx] if pid == 'efd_fiscal' and table_idx < 4 else f"Resultado {table_idx + 1}"
            
            all_tables.append({
                "name": t_name,
                "preview": full_rows[:20], # Apenas 20 para a tela
                "full": full_rows          # Tudo para o Excel
            })
            
            table_idx += 1
            if not target_cursor.nextset(): break

        is_multi = len(all_tables) > 1
        return {
            "success": True,
            "isMulti": is_multi,
            "data": all_tables # Enviamos a estrutura com preview e full
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        if conn: conn.close()

@app.get("/api/clientes")
async def get_clientes(search: str = ""):
    conn = pyodbc.connect(DB_CONFIG)
    cursor = conn.cursor()
    cursor.execute("SELECT TOP 50 id_cliente, nome, cnpj FROM cliente WHERE nome LIKE ?", (f"%{search}%",))
    columns = [col[0] for col in cursor.description]
    results = [dict(zip(columns, row)) for row in cursor.fetchall()]
    conn.close()
    return results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001)