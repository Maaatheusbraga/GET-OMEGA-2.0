from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pyodbc
from datetime import datetime

app = FastAPI(title="GET OMEGA 2.0")

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

@app.post("/api/generate-base")
async def generate_base(request: dict):
    conn = None
    try:
        conn = pyodbc.connect(DB_CONFIG, autocommit=True)
        cursor = conn.cursor()
        
        p = request.get('params', {})
        pid = request.get('procedureId', '').strip()
        user = str(request.get('userName', 'Analista')).replace("'", "")
        reg = request.get('reg', '').strip()
        xml_f = request.get('xmlFilters', {}) 
        
        # Datas formatadas para o padrão SQL brasileiro
        raw_i = p.get('p_periodo_i') or p.get('data_inicio')
        raw_f = p.get('p_periodo_f') or p.get('data_fim')
        dt_i = datetime.strptime(raw_i, '%Y-%m-%d').strftime('%d/%m/%Y')
        dt_f = datetime.strptime(raw_f, '%Y-%m-%d').strftime('%d/%m/%Y')
        
        cnpj = str(p.get('p_cnpj') or '').strip()
        cli_id_int = int(p.get('p_cliente') or p.get('id_cliente') or 0)

        prefix = "SET NOCOUNT ON; SET DATEFORMAT dmy; "
        sql_exec, sql_select = "", ""

        # --- BLOCO XML INSERIDO AQUI ---
        if pid == 'base_xml':
            tipo_xml = xml_f.get('tipo', 'entrada_saida')
            emit_xml = xml_f.get('emitente', 'proprios')
            where = f"id_cliente = {cli_id_int} AND xmotivo = 'Autorizado o uso da NF-e' AND CAST(periodo AS DATE) BETWEEN '{dt_i}' AND '{dt_f}'"
            
            if emit_xml == 'terceiros':
                where += " AND IND_EMIT = '1'"
            else:
                where += " AND IND_EMIT = '0'"
                if tipo_xml == 'entrada': where += " AND Tipo = '0'"
                elif tipo_xml == 'saida': where += " AND Tipo = '1'"
            
            cols = "id_cliente, cast(periodo as date) as 'periodo', modelo, serie, numero, data_emissao, data_ent_said, ind_emit, tipo, finalidade, cnpj_empresa, ie_empresa, nome_empresa, cnpj_part, ie_part, nome_part, uf_part, cod_mun_part, totais_vnf, totais_nbc, totais_nicms, totais_vpis, TOTAIS_vCOFINS, totais_vipi, TOTAIS_vII, totais_vdesc, totais_vseg, totais_vfrete, totais_vprod, totais_vbcst, totais_vst, totais_voutro, di_numero, di_data, numitem, codproduto, descproduto, infadprod, ncm, cfop, unid, qntd, valcontabil, valprod, valunit, valdesc, valfrete, valseg, valoutros, valII, cofins_cst, cofins_bc, cofins_val, cofins_aliq, pis_cst, pis_bc, pis_val, pis_aliq, ipi_cst, ipi_vipi, ipi_cenq, ipi_cnpjprod, ipi_clEnq, icms_cst, icms_bc, icms_val, icms_aliq, icms_predbc, icms_st_bc, icms_st_val, icms_st_aliq, icms_st_predbc, icms_st_ret_bc, icms_st_ret_val, icms_deson, infCpl, chave, xmotivo, observacao, ean, ean_trib, desc_finalidade, chassi, natureza_operacao, infad_fisco, codigo_participante, cprod_anvisa, bc_ipi, aliq_ipi, vl_bc_fcp_normal, per_fcp_normal, vl_fcp_normal, vl_bc_fcp_st, per_fcp_st, vl_fcp_st, mod_frete, desc_frete, IVA_ST, CST_IBS_CBS, COD_CLASS_TRIB_IBS_CBS, DESC_CLASS_IBS_CBS, BASE_CALCULO_IBS_CBS, ALIQUOTA_IBS_ESTADUAL, VALOR_IBS_ESTADUAL, ALIQUOTA_IBS_MUNICIPAL, VALOR_IBS_MUNICIPAL, VALOR_IBS_TOTAL, ALIQUOTA_CBS, VALOR_CBS"
            sql_select = f"SELECT {cols} FROM TBL_XML WITH(NOLOCK) WHERE {where} ORDER BY periodo, numero"

        # --- BLOCO 1000 (AJUSTADO CONFORME SUA DEFINIÇÃO) ---
        elif pid == 'bloco_1000':
            sql_exec = f"EXEC PROC_REL_CONTRIBUICOES_GERADOR '{cnpj}', '{dt_i}', '{dt_f}', '{user}'"
            if reg in ['1100', '1500']:
                sql_select = f"SELECT * FROM TBL_EFD_CONT_{reg} WHERE CNPJ = '{cnpj}' AND CAST(PERIODO AS DATE) BETWEEN '{dt_i}' AND '{dt_f}' ORDER BY CAST(PERIODO AS DATE)"
            elif reg in ['1300', '1700']:
                sql_select = f"SELECT * FROM TBL_EFD_CONT_{reg} WHERE CNPJ = '{cnpj}' AND TRY_CAST(PERIODO AS DATE) BETWEEN '{dt_i}' AND '{dt_f}' ORDER BY TRY_CAST(PERIODO AS DATE)"

        # --- MANTENDO OS OUTROS CARDS CONFORME SUAS REGRAS ESPECÍFICAS ---
        elif pid == 'efd_fiscal':
            sql_exec = f"EXEC PROC_GERAR_EFD_FISCAL_GERADOR {cli_id_int}, '{cnpj}', '{dt_i}', '{dt_f}', '{user}'"
        elif pid == 'efd_contribuicoes':
            sql_exec = f"EXEC PROC_GER_EFD_CONTR_GERADOR {cli_id_int}, '{cnpj}', '{dt_i}', '{dt_f}', '{user}'"
            if reg: sql_select = f"SELECT * FROM TBL_EFD_CONT_{reg} WHERE ID_CLIENTE={cli_id_int} AND CAST(PERIODO AS DATE) BETWEEN '{dt_i}' AND '{dt_f}'"
        elif pid == 'efd_bloco_m':
            sql_exec = f"EXEC PROC_REL_CONTRIBUICOES_BLOCO_M_GERADOR '{cnpj}', '{dt_i}', '{dt_f}', '{user}'"
        elif pid == 'bloco_d':
            sql_exec = f"EXEC PROC_REL_CONTRIBUICOES_BLOCO_D_GERADOR {cli_id_int}, '{dt_i}', '{dt_f}', '{user}'"
            if reg: sql_select = f"SELECT * FROM TBL_EFD_CONT_{reg} WHERE ID_CLIENTE = {cli_id_int} AND CAST(PERIODO AS DATE) BETWEEN '{dt_i}' AND '{dt_f}'"

        print(f"\n[DEBUG] SQL EXEC: {prefix + sql_exec}")
        
        if sql_exec:
            cursor.execute(prefix + sql_exec)
        
        all_tables = []
        target = cursor.execute(sql_select) if sql_select else cursor

        while True:
            if not target.description:
                if not target.nextset(): break
                continue
            cols = [col[0] for col in target.description]
            rows = target.fetchall()
            clean_rows = [dict(zip(cols, [v.strftime('%d/%m/%Y') if isinstance(v, datetime) else v for v in r])) for r in rows]
            all_tables.append({"name": reg if reg else "Resultado", "preview": clean_rows[:20], "full": clean_rows})
            if not target.nextset(): break

        return {"success": True, "data": all_tables}
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return {"success": False, "error": str(e)}
    finally:
        if conn: conn.close()

@app.get("/api/clientes")
async def get_clientes(search: str = ""):
    conn = pyodbc.connect(DB_CONFIG)
    cursor = conn.cursor()
    cursor.execute("SELECT TOP 50 id_cliente, nome, cnpj FROM cliente WHERE nome LIKE ?", (f"%{search}%",))
    cols = [col[0] for col in cursor.description]
    res = [dict(zip(cols, r)) for r in cursor.fetchall()]
    conn.close()
    return res

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001)