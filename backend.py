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
        
        # --- 1. PARÂMETROS ---
        p = request.params
        pid = request.procedureId.strip()
        user = str(request.userName).replace("'", "")
        
        cli = int(p.get('p_cliente') or p.get('id_cliente') or 0)
        cnpj = str(p.get('p_cnpj') or '').strip()
        raw_dt_i = str(p.get('p_periodo_i') or p.get('data_inicio') or '')
        raw_dt_f = str(p.get('p_periodo_f') or p.get('data_fim') or '')
        
        dt_i_br = ""
        dt_f_br = ""

        # --- 2. VALIDAÇÃO DE DATAS ---
        try:
            if raw_dt_i and raw_dt_f:
                date_i = datetime.strptime(raw_dt_i, '%Y-%m-%d')
                date_f = datetime.strptime(raw_dt_f, '%Y-%m-%d')
                
                # REGRA: Data Início não pode ser maior que Data Fim
                if date_i > date_f:
                    return {"success": False, "error": "ERRO: A Data de Início não pode ser maior que a Data Final."}

                dt_i_br = date_i.strftime('%d/%m/%Y')
                dt_f_br = date_f.strftime('%d/%m/%Y')
        except:
            return {"success": False, "error": "Datas inválidas."}

        # Prefixo obrigatório
        prefix = "SET NOCOUNT ON; SET DATEFORMAT dmy; "
        
        reg = request.reg
        sql_exec = ""
        sql_select = ""

        # --- 3. ROTEAMENTO ---
        if pid == 'efd_fiscal':
            sql_exec = f"{prefix} EXEC PROC_GERAR_EFD_FISCAL_GERADOR {cli}, '{cnpj}', '{dt_i_br}', '{dt_f_br}', '{user}'"

        elif pid == 'bloco_e':
            sql_exec = f"{prefix} EXEC PROC_EXPORT_E110_E111_GERADOR {cli}, '{dt_i_br}', '{dt_f_br}', '{user}'"

        elif pid == 'bloco_ipi':
            sql_exec = f"{prefix} EXEC PROC_EXPORT_E510_E520_GERADOR {cli}, '{dt_i_br}', '{dt_f_br}', '{user}'"

        elif pid == 'efd_contribuicoes':
            sql_exec = f"{prefix} EXEC PROC_REL_CONTRIBUICOES_GERADOR {cli}, '{cnpj}', '{dt_i_br}', '{dt_f_br}', '{user}'"
            if reg: 
                safe_reg = ''.join(filter(str.isalnum, reg)) 
                sql_select = f"SELECT * FROM TBL_EFD_CONT_{safe_reg} WITH(NOLOCK) WHERE ID_CLIENTE={cli} AND CAST(PERIODO AS DATE) BETWEEN '{dt_i_br}' AND '{dt_f_br}' ORDER BY CAST(PERIODO AS DATE)"

        elif pid == 'bloco_d':
            sql_exec = f"{prefix} EXEC PROC_REL_CONTRIBUICOES_GERADOR {cli}, '{cnpj}', '{dt_i_br}', '{dt_f_br}', '{user}'"
            if reg:
                safe_reg = ''.join(filter(str.isalnum, reg))
                sql_select = f"SELECT * FROM TBL_EFD_CONT_{safe_reg} WITH(NOLOCK) WHERE ID_CLIENTE={cli} AND CAST(PERIODO AS DATE) BETWEEN '{dt_i_br}' AND '{dt_f_br}' ORDER BY CAST(PERIODO AS DATE)"

        elif pid == 'bloco_1000':
            sql_exec = f"{prefix} EXEC PROC_REL_CONTRIBUICOES_GERADOR {cli}, '{cnpj}', '{dt_i_br}', '{dt_f_br}', '{user}'"
            if reg:
                 safe_reg = ''.join(filter(str.isalnum, reg))
                 sql_select = f"SELECT * FROM TBL_EFD_CONT_{safe_reg} WITH(NOLOCK) WHERE CNPJ='{cnpj}' AND CAST(PERIODO AS DATE) BETWEEN '{dt_i_br}' AND '{dt_f_br}' ORDER BY CAST(PERIODO AS DATE)"

        elif pid == 'base_xml':
            emitente = request.xmlFilters.get('emitente', 'proprios')
            tipo = request.xmlFilters.get('tipo', 'entrada_saida')
            where_clause = f"id_cliente = {cli} and xMotivo = 'Autorizado o uso da NF-e' and cast(periodo as date) between '{dt_i_br}' and '{dt_f_br}'"
            if emitente == 'proprios':
                if tipo == 'entrada': where_clause += " and Tipo = '0' and IND_EMIT = '0'"
                elif tipo == 'saida': where_clause += " and Tipo = '1' and IND_EMIT = '0'"
                else: where_clause += " and IND_EMIT = '0'"
            else: where_clause += " and IND_EMIT = '1'"
            sql_select = f"{prefix} SELECT * FROM TBL_XML WITH(NOLOCK) WHERE {where_clause}"

        elif pid == 'resumo_entrada':
            sql_exec = f"{prefix} EXEC PROC_RESUMO_NFE_ENTRADA_SPED_V2_GERADOR {cli}, '{dt_i_br}', '{dt_f_br}', '{cnpj}', '{user}'"
            sql_select = f"SELECT * FROM TBL_RESUMO_NFE_ENTRADA_SPED WITH(NOLOCK) WHERE ID_CLIENTE = {cli} AND CAST(PERIODO AS DATE) BETWEEN '{dt_i_br}' AND '{dt_f_br}' ORDER BY CAST(PERIODO AS DATE)"

        elif pid == 'resumo_saida':
            sql_exec = f"{prefix} EXEC PROC_RESUMO_NFE_SAIDA_SPED_GERADOR {cli}, '{dt_i_br}', '{dt_f_br}', '{user}'"
            sql_select = f"SELECT * FROM TBL_RESUMO_NFE_SAIDA_SPED WITH(NOLOCK) WHERE ID_CLIENTE = {cli} AND CAST(PERIODO AS DATE) BETWEEN '{dt_i_br}' AND '{dt_f_br}' ORDER BY CAST(PERIODO AS DATE)"

        elif pid == 'resumo_valores':
            sql_exec = f"{prefix} EXEC PROC_RES_VAL_SPED_GERADOR {cli}, '{dt_i_br}', '{dt_f_br}', '{user}'"
            sql_select = f"SELECT * FROM TBL_RESUMO_SPED WITH(NOLOCK) WHERE ID_CLIENTE = {cli} AND CAST(PERIODO AS DATE) BETWEEN '{dt_i_br}' AND '{dt_f_br}' ORDER BY CAST(PERIODO AS DATE)"

        elif pid == 'efd_bloco_m':
            sql_exec = f"{prefix} EXEC PROC_GERAR_EFD_CONTRIBUICOES_BLOCO_M '{cnpj}', '{dt_i_br}', '{dt_f_br}', '{user}'"
            sql_select = "SELECT 'Processamento Concluido' as STATUS, 'Verifique as tabelas do Bloco M no Banco' as OBS"

        print(f"[LOG] Executando PID: {pid}")

        # --- 4. EXECUÇÃO E FETCH INTELIGENTE (TOP 20 + NOMES ESTÁTICOS) ---
        if sql_exec: cursor.execute(sql_exec)
        
        all_tables = []
        target_cursor = cursor
        if sql_select: target_cursor = cursor.execute(sql_select)

        # LISTA FIXA DE NOMES (Conforme solicitado)
        fiscal_static_names = ["C170", "C190", "D190", "D590"] 

        table_idx = 0
        while True:
            try:
                # SE NÃO TIVER DESCRIÇÃO (Ex: Resultado de um DELETE), PULA SEM CONTAR
                if not target_cursor.description:
                    if not target_cursor.nextset(): break
                    continue 
                
                columns = [col[0] for col in target_cursor.description]
                rows = target_cursor.fetchall()
                
                cleaned_rows = []
                # 3. LIMITE TOP 20
                for row in rows[:20]: 
                    row_dict = {}
                    for i, value in enumerate(row):
                        if isinstance(value, datetime): row_dict[columns[i]] = value.strftime('%d/%m/%Y')
                        else: row_dict[columns[i]] = value
                    cleaned_rows.append(row_dict)
                
                # 4. APLICAÇÃO DOS NOMES
                t_name = f"Resultado {table_idx + 1}"
                
                # Se for EFD Fiscal, força o nome da lista na ordem
                if pid == 'efd_fiscal':
                    if table_idx < len(fiscal_static_names):
                        t_name = fiscal_static_names[table_idx]
                
                all_tables.append({"name": t_name, "rows": cleaned_rows})
                
                # Só incrementa o índice se achou uma tabela de verdade
                table_idx += 1
                
                if not target_cursor.nextset(): break

            except Exception as e:
                print(f"Loop finished/error: {e}")
                break

        is_multi = len(all_tables) > 1
        response_data = all_tables if is_multi else (all_tables[0]['rows'] if all_tables else [])

        return {
            "success": True, 
            "isMulti": is_multi,
            "data": response_data, 
            "total": sum(len(t['rows']) for t in all_tables) if is_multi else len(response_data)
        }

    except Exception as e:
        print(f"[ERRO SQL] {str(e)}")
        return {"success": False, "error": f"Erro Engine: {str(e)}"}
    finally:
        if conn: conn.close()

@app.get("/api/clientes")
async def get_clientes(search: str = ""):
    conn = None
    try:
        conn = pyodbc.connect(DB_CONFIG)
        cursor = conn.cursor()
        query = "SELECT TOP 50 id_cliente, nome, cnpj FROM cliente WHERE nome LIKE ?"
        cursor.execute(query, (f"%{search}%",))
        columns = [column[0] for column in cursor.description]
        results = []
        for row in cursor.fetchall(): results.append(dict(zip(columns, row)))
        return results
    except: return []
    finally: 
        if conn: conn.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001)