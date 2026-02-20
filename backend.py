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
#CONFIGURAÇÃO DE CONEXÃO COM O BANCO DE DADOS - AJUSTE CONFORME SEU AMBIENTE
DB_CONFIG = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=SRV-SISTEMA;"
    "DATABASE=speds;"
    "UID=relatorio;"
    "PWD=relatorio123;"
    "TrustServerCertificate=yes;"
)

# Função auxiliar para blindar a conversão para número
def to_float(v):
    if v is None or v == "": return 0.0
    try:
        sv = str(v).strip()
        if '.' in sv and ',' in sv:
            sv = sv.replace('.', '').replace(',', '.')
        else:
            sv = sv.replace(',', '.')
        return float(sv)
    except:
        return v

#CRIANDO PARAMETROS PARA RECEBER DO USUARIO E MANDAR PARA O BACKEND
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
        
        raw_i = p.get('p_periodo_i') or p.get('data_inicio')
        raw_f = p.get('p_periodo_f') or p.get('data_fim')
        dt_i = datetime.strptime(raw_i, '%Y-%m-%d').strftime('%d/%m/%Y')
        dt_f = datetime.strptime(raw_f, '%Y-%m-%d').strftime('%d/%m/%Y')
        
        cnpj = str(p.get('p_cnpj') or '').strip()
        cli_id_int = int(p.get('p_cliente') or p.get('id_cliente') or 0)

        prefix = "SET NOCOUNT ON; SET DATEFORMAT dmy; "
        sql_exec, sql_select = "", ""

        # --- DEFINIÇÃO DE PROCEDIMENTOS E CONSULTAS PARA CADA TIPO DE DADO SOLICITADO ---
        if pid == 'credito_gerado':
            sql_exec = ""
            sql_select = f"""
            SET DATEFORMAT dmy;
            SELECT 
               A.ID_CLIENTE,
               (SELECT B.NOME FROM CLIENTE B WHERE B.id_cliente = A.ID_CLIENTE) AS 'NOME',
               (SELECT B.CNPJ FROM CLIENTE B WHERE B.id_cliente = A.ID_CLIENTE) AS 'CNPJ',
               A.PERIODO_ARQ,
               A.REG,
               SUM(TRY_CAST(REPLACE(a.coluna4,',','.') as decimal(12,2))) AS 'CREDITO_GERADO',
               case when a.reg = '5325' then '3A'
                    when a.reg = '5380' then '3B'
                    when a.reg = '5425' then '3C'
                    ELSE 'OUTRA FICHA'
                    END 'FICHA'
            FROM TBL_CAT83_ARQUIVO a with(nolock)
            where a.id_cliente = {cli_id_int}
            and cast(a.periodo_arq as date) between '{dt_i}' and '{dt_f}'
            and a.reg in ('5325','5380','5425')
            GROUP BY A.periodo_arq,a.reg,a.id_cliente
            ORDER BY CAST(a.periodo_arq as date),a.reg
            """

        elif pid == 'bloco_ipi':
            sql_exec = f"EXEC PROC_EXPORT_E510_E520_GERADOR @p_cliente={cli_id_int}, @p_periodo_i='{dt_i}', @p_periodo_f='{dt_f}', @p_usuario='{user}'"

        elif pid == 'bloco_e':
            sql_exec = f"EXEC PROC_EXPORT_E110_E111_GERADOR @p_cliente={cli_id_int}, @p_periodo_i='{dt_i}', @p_periodo_f='{dt_f}', @p_usuario='{user}'"

        elif pid == 'resumo_valores_sped':
            sql_exec = f"EXEC PROC_RES_VAL_SPED_GERADOR @p_cliente={cli_id_int}, @p_periodo_i='{dt_i}', @p_periodo_f='{dt_f}', @p_usuario='{user}'"
            cols = "id_cliente, nome, cnpj, TRY_CAST(periodo as date) as 'periodo', cfop, TRY_CAST(cst as char) as 'cst', TRY_CAST(replace(valor_contabil,',','.') as decimal (14,2)) as 'valor_contabil', TRY_CAST(replace(base_calculo,',','.') as decimal(14,2)) as 'base_calculo', TRY_CAST(replace(valor_icms,',','.') as decimal(14,2)) as 'valor_icms'"
            sql_select = f"SET DATEFORMAT dmy; SELECT {cols} FROM TBL_RESUMO_SPED WITH(NOLOCK) WHERE ID_CLIENTE = '{cli_id_int}' AND TRY_CAST(periodo as date) BETWEEN '{dt_i}' AND '{dt_f}' ORDER BY TRY_CAST(periodo as date)"

        elif pid == 'resumo_entrada_sped':
            sql_exec = f"EXEC PROC_RESUMO_NFE_ENTRADA_SPED_V2_GERADOR {cli_id_int}, '{dt_i}', '{dt_f}', '{cnpj}', '{user}'"
            cols = "ID_CLIENTE, cast(PERIODO as date) as 'PERIODO', REG, NOME, CNPJ, IE,UF_EMPRESA, IND_OPER, IND_EMIT, TIPO_EMITENTE, NOME_PART, CNPJ_PART, IE_PART, UF_PART, COD_MOD, COD_SIT, SERIE, NUMERO_NOTA, CHAVE, cast(DATA_EMISSAO as date) as 'DATA_EMISSAO', cast(DATA_ENTRADA_SAIDA as date) as 'DATA_ENTRADA_SAIDA', replace(VALOR_NOTA,',','.') as 'VALOR_NOTA', IND_PAGAMENTO, replace(VALOR_DESCONTO,',','.') as 'VALOR_DESCONTO', replace(VALOR_ABAT_NT,',','.') as 'VALOR_ABAT_NAT', replace(VALOR_TOTAL_SERVICOS,',','.') as 'VALOR_TOTAL_SERVICOS', ind_frete, replace(VALOR_FRETE,',','.') as 'VALOR_FRETE', replace(VALOR_SEGURO,',','.') as 'VALOR_SEGURO', replace(VALOR_OUTROS,',','.') as 'VALOR_OUTROS', replace(VALOR_BASE,',','.') as 'VALOR_BASE', replace(VALOR_ICMS,',','.') as 'VALOR_ICMS', replace(VALOR_BASE_ST,',','.') as 'VALOR_BASE_ST', replace(VALOR_ICMS_ST,',','.') as 'VALOR_ICMS_ST', replace(VALOR_IPI_TOTAL_NF,',','.') as 'VALOR_IPI_TOTAL_NF', replace(VALOR_PIS,',','.') as 'VALOR_PIS', replace(VALOR_COFINS,',','.') as 'VALOR_COFINS', replace(VALOR_PIS_ST,',','.') as 'VALOR_PIS_ST', replace(VALOR_COFINS_ST,',','.') as 'VALOR_COFINS_ST', replace(CST_ICMS,',','.') as 'CST_ICMS', CFOP, replace(ALIQUOTA_ICMS,',','.') as 'ALIQUOTA_ICMS', replace(VALOR_CONTABIL,',','.') as 'VALOR_CONTABIL', replace(BASE_ICMS,',','.') as 'BASE_ICMS', replace(VL_ICMS,',','.') as 'VL_ICMS', replace(BASE_ICMS_ST,',','.') as 'BASE_ICMS_ST', replace(VL_ICMS_ST,',','.') as 'VL_ICMS_ST', replace(VL_RED_BC,',','.') as 'VL_RED_BC', replace(VL_IPI,',','.') as 'VL_IPI'"
            sql_select = f"SELECT {cols} FROM TBL_RESUMO_NFE_ENTRADA_SPED WITH(NOLOCK) WHERE ID_CLIENTE = '{cli_id_int}' AND CAST(PERIODO AS DATE) BETWEEN '{dt_i}' AND '{dt_f}' ORDER BY CAST(PERIODO AS DATE)"

        elif pid == 'resumo_saida_sped':
            sql_exec = f"EXEC PROC_RESUMO_NFE_SAIDA_SPED_GERADOR {cli_id_int}, '{dt_i}', '{dt_f}', '{user}'"
            cols = "id_cliente, TRY_CAST(periodo as date) as 'periodo', NOME_EMIT, CNPJ_EMIT, IE_EMIT, ind_oper, ind_emit, cod_part, NOME_PART, CNPJ_PART, CPF_PART, IE_PART, UF_PART, cod_mod, cod_sit, serie, numero_nota, chave, TRY_CAST(data_emissao as date) as 'data_emissao', TRY_CAST(data_entrada_saida as date) as 'data_entrada_saida', Valor_Nota, ind_pagamento, TRY_CAST(replace(Valor_Desconto,',','.') as decimal(14,2)) as 'Valor_Desconto', TRY_CAST(replace(Valor_Abat_NT,',','.') as decimal (14,2)) as 'Valor_Abat_NT', TRY_CAST(replace(Valor_Total_servicos,',','.') as decimal (14,2)) as 'Valor_Total_servicos', ind_frete, TRY_CAST(replace(Valor_Frete,',','.') as decimal (14,2)) as 'Valor_frete', TRY_CAST(replace(Valor_Seguro,',','.') as decimal (14,2)) as 'Valor_seguro', TRY_CAST(replace(Valor_Outros,',','.') as decimal (14,2)) as 'Valor_Outros', TRY_CAST(replace(Valor_Base,',','.') as decimal(14,2)) as 'Valor_Base', TRY_CAST(replace(Valor_Icms,',','.') as decimal (14,2)) as 'Valor_Icms', TRY_CAST(replace(Valor_Base_ST,',','.') as decimal (14,2)) as 'Valor_Base_ST', TRY_CAST(replace(Valor_Icms_ST,',','.') as decimal (14,2)) as 'Valor_Icms_ST', TRY_CAST(replace(Valor_Ipi_Total_NF,',','.') as decimal (14,2)) as 'Valor_Ipi_Toal_NF', TRY_CAST(replace(Valor_Pis,',','.') as decimal (14,2)) as 'Valor_Pis', TRY_CAST(replace(Valor_Cofins,',','.') as decimal (14,2)) as 'Valor_Cofins', TRY_CAST(replace(Valor_Pis_ST,',','.') as decimal (14,2)) as 'Valor_Pis_ST', TRY_CAST(replace(Valor_Cofins_ST,',','.') as decimal (14,2)) as 'Valor_Cofins_ST', CST_ICMS, CFOP, TRY_CAST(replace(ALIQUOTA_ICMS,',','.') as decimal (14,2)) as 'ALIQUOTA_ICMS', TRY_CAST(replace(VALOR_CONTABIL,',','.') as decimal (14,2)) as 'VALOR_CONTABIL', TRY_CAST(replace(BASE_ICMS,',','.') as decimal (14,2)) as 'BASE_ICMS', TRY_CAST(replace(VL_ICMS,',','.') as decimal (14,2)) as 'VL_ICMS', TRY_CAST(replace(BASE_ICMS_ST,',','.') as decimal (14,2)) as 'BASE_ICMS_ST', TRY_CAST(replace(VL_ICMS_ST,',','.') as decimal (14,2)) as 'VL_ICMS_ST', TRY_CAST(replace(VL_RED_BC,',','.') as decimal (14,2)) as 'VL_RED_BC', TRY_CAST(replace(VL_IPI,',','.') as decimal (14,2)) as 'VL_IPI', IIF(VL_ICMS = 0,0, IIF(BASE_ICMS = 0,0, TRY_CAST(VL_ICMS / BASE_ICMS AS DECIMAL(8,2)) * 100)) AS 'ALIQ_ICMS_CALCULADA'"
            sql_select = f"Select {cols} from TBL_RESUMO_NFE_SAIDA_SPED with(nolock) where id_cliente = '{cli_id_int}' and TRY_CAST(periodo as date) between '{dt_i}' and '{dt_f}' order by TRY_CAST(periodo as date)"

        elif pid == 'base_xml':
            tipo_xml = xml_f.get('tipo', 'entrada_saida')
            emit_xml = xml_f.get('emitente', 'proprios')
            where = f"id_cliente = {cli_id_int} AND xmotivo = 'Autorizado o uso da NF-e' AND CAST(periodo AS DATE) BETWEEN '{dt_i}' AND '{dt_f}'"
            if emit_xml == 'terceiros': where += " AND IND_EMIT = '1'"
            else:
                where += " AND IND_EMIT = '0'"
                if tipo_xml == 'entrada': where += " AND Tipo = '0'"
                elif tipo_xml == 'saida': where += " AND Tipo = '1'"
            cols = "id_cliente, cast(periodo as date) as 'periodo', modelo, serie, numero, data_emissao, data_ent_said, ind_emit, tipo, finalidade, cnpj_empresa, ie_empresa, nome_empresa, cnpj_part, ie_part, nome_part, uf_part, cod_mun_part, totais_vnf, totais_nbc, totais_nicms, totais_vpis, TOTAIS_vCOFINS, totais_vipi, TOTAIS_vII, totais_vdesc, totais_vseg, totais_vfrete, totais_vprod, totais_vbcst, totais_vst, totais_voutro, di_numero, di_data, numitem, codproduto, descproduto, infadprod, ncm, cfop, unid, qntd, valcontabil, valprod, valunit, valdesc, valfrete, valseg, valoutros, valII, cofins_cst, cofins_bc, cofins_val, cofins_aliq, pis_cst, pis_bc, pis_val, pis_aliq, ipi_cst, ipi_vipi, ipi_cenq, ipi_cnpjprod, ipi_clEnq, icms_cst, icms_bc, icms_val, icms_aliq, icms_predbc, icms_st_bc, icms_st_val, icms_st_aliq, icms_st_predbc, icms_st_ret_bc, icms_st_ret_val, icms_deson, infCpl, chave, xmotivo, observacao, ean, ean_trib, desc_finalidade, chassi, natureza_operacao, infad_fisco, codigo_participante, cprod_anvisa, bc_ipi, aliq_ipi, vl_bc_fcp_normal, per_fcp_normal, vl_fcp_normal, vl_bc_fcp_st, per_fcp_st, vl_fcp_st, mod_frete, desc_frete, IVA_ST, CST_IBS_CBS, COD_CLASS_TRIB_IBS_CBS, DESC_CLASS_IBS_CBS, BASE_CALCULO_IBS_CBS, ALIQUOTA_IBS_ESTADUAL, VALOR_IBS_ESTADUAL, ALIQUOTA_IBS_MUNICIPAL, VALOR_IBS_MUNICIPAL, VALOR_IBS_TOTAL, ALIQUOTA_CBS, VALOR_CBS"
            sql_select = f"SELECT {cols} FROM TBL_XML WITH(NOLOCK) WHERE {where} ORDER BY periodo, numero"

        elif pid == 'bloco_1000':
            sql_exec = f"EXEC PROC_REL_CONTRIBUICOES_GERADOR '{cnpj}', '{dt_i}', '{dt_f}', '{user}'"
            if reg in ['1100', '1500']: sql_select = f"SELECT * FROM TBL_EFD_CONT_{reg} WHERE CNPJ = '{cnpj}' AND CAST(PERIODO AS DATE) BETWEEN '{dt_i}' AND '{dt_f}' ORDER BY CAST(PERIODO AS DATE)"
            elif reg in ['1300', '1700']: sql_select = f"SELECT * FROM TBL_EFD_CONT_{reg} WHERE CNPJ = '{cnpj}' AND TRY_CAST(PERIODO AS DATE) BETWEEN '{dt_i}' AND '{dt_f}' ORDER BY TRY_CAST(PERIODO AS DATE)"

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

        if sql_exec:
            cursor.execute(prefix + sql_exec)
        
        all_tables = []
        target = cursor.execute(sql_select) if sql_select else cursor

        t_idx = 1
        while True:
            if not target.description:
                if not target.nextset(): break
                continue
            cols_res = [col[0] for col in target.description]
            rows = target.fetchall()
            clean_rows = []
            
            for r in rows:
                row_dict = {}
                for col_idx, col_name in enumerate(cols_res):
                    val = r[col_idx]
                    user_col = col_idx + 1 # Transforma em índice Base-1 

                    if val is None:
                        row_dict[col_name] = "-"
                        continue

                    # --- REGRAS ESPECÍFICAS DE FORMATAÇÃO ---
                    if pid == 'efd_fiscal':
                        if t_idx == 1:
                            if user_col in [7, 8, 10, 11, 38, 74]: val = str(val) 
                        elif t_idx == 2:
                            if 7 <= user_col <= 13: val = str(val) 
                            elif (26 <= user_col <= 37) or (40 <= user_col <= 46): val = to_float(val) 
                        elif t_idx == 3:
                            if (7 <= user_col <= 13) or user_col == 40: val = str(val) 
                            elif 26 <= user_col <= 39: val = to_float(val) 
                        elif t_idx == 4:
                            if 7 <= user_col <= 13: val = str(val) 
                            elif (24 <= user_col <= 33) or (36 <= user_col <= 42): val = to_float(val) 

                    # REGRAS EFD CONTRIBUIÇÕES 
                    elif pid == 'efd_contribuicoes':
                        if reg == 'F525':
                            if user_col in [5, 10]: val = to_float(val)
                        elif reg == 'F550':
                            if user_col == 7 or (9 <= user_col <= 12) or (14 <= user_col <= 17): val = to_float(val)
                        elif reg == 'F600':
                            if (8 <= user_col <= 9) or (13 <= user_col <= 14): val = to_float(val)
                        elif reg == 'F700':
                            if user_col in [8, 9]: val = to_float(val)

                    # REGRAS BLOCO D
                    elif pid == 'bloco_d':
                        if reg == 'D200':
                            if user_col == 16: val = to_float(val)
                        elif reg in ['D201', 'D205']:
                            if user_col in [7, 8, 10]: val = to_float(val)
                            
                    # REGRAS BLOCO 1000
                    elif pid == 'bloco_1000':
                        if reg in ['1100', '1500']:
                            if 10 <= user_col <= 22: val = to_float(val)
                        elif reg in ['1300', '1700']:
                            if 8 <= user_col <= 12: val = to_float(val)
                    #REGRAS RESUMO ENTRADA SPED
                    elif pid == 'resumo_entrada_sped':
                        if user_col in [22, 24, 25, 26, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 42, 43, 44, 45, 46, 47, 48, 49 ]: val = to_float(val)
                        
                    elif pid == 'resumo_saida_sped':
                        if user_col in [17, 19, 20, 21, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39]: val = to_float(val)

                    # Formatação universal de Data
                    if isinstance(val, datetime):
                        val = val.strftime('%d/%m/%Y')
                        
                    row_dict[col_name] = val
                    
                clean_rows.append(row_dict)

            
            # Nome da sheet de cada resultado - pode ser customizado por tipo de dado ou reg, ou seguir um padrão genérico

            # EFD_FISCAL
            if pid == 'efd_fiscal':
                if t_idx == 1: nome_aba = "C170"
                elif t_idx == 2: nome_aba = "C590"
                elif t_idx == 3: nome_aba = "D190"
                elif t_idx == 4: nome_aba = "D590"
                else: nome_aba = f"EFD_T{t_idx}"
            #BLOCO M
            elif pid == 'efd_bloco_m':
                bloco_m_abas = [
                    "M200", "M200_M205", "M200_M210", "M600", "M600_M605", 
                    "M600_M610", "M100", "M500", "M500_M110", "M500_M505", 
                    "M500_M510", "M700", "M400", "M800", "M620"
                ]
                if t_idx <= len(bloco_m_abas): nome_aba = bloco_m_abas[t_idx - 1]
                else: nome_aba = f"M_T{t_idx}"

             #BASE XML   
            elif pid == 'base_xml': nome_aba = "XML"

            #CREDITO GERADO
            elif pid == 'credito_gerado': nome_aba = "CREDITO_GERADO"

            #RESUMO DE ENTRADA NO SPED
            elif pid == 'resumo_entrada_sped': nome_aba = "RESUMO_ENTRADA"

            #RESUMO DE SAIDA NO SPED
            elif pid == 'resumo_saida_sped': nome_aba = "RESUMO_SAIDA"

            #RESUMO DE VALORES DO SPED
            elif pid == 'resumo_valores_sped': nome_aba = "RESUMO_VALORES"

            #BLOCO E
            elif pid == 'bloco_e': 
                if t_idx == 1: nome_aba = "E110"
                elif t_idx == 2: nome_aba = "E111"
                else: nome_aba = f"BLOCO_E_T{t_idx}"

            #BLOCO IPI
            elif pid == 'bloco_ipi': 
               if t_idx == 1: nome_aba = "E510"
               elif t_idx == 2: nome_aba = "E520"
               elif t_idx == 3: nome_aba = "E530"
               elif t_idx == 4: nome_aba = "E531"
               else: nome_aba = f"BLOCO_IPI_T{t_idx}"
                
            all_tables.append({"name": nome_aba, "preview": clean_rows[:20], "full": clean_rows})
            t_idx += 1
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