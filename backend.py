# ============================================================================
# IMPORTAÇÕES (Ferramentas necessárias para o servidor funcionar)
# ============================================================================
import os # Biblioteca para manipular o Sistema Operacional (usada para excluir arquivos temp)
import tempfile # Biblioteca que cria arquivos temporários no HD
import logging
from fastapi import FastAPI, BackgroundTasks, Request # Motor principal do servidor web
from fastapi.middleware.cors import CORSMiddleware # Libera acesso de navegadores
from fastapi.responses import FileResponse # Ferramenta que envia arquivos (.xlsx) para o navegador
import pyodbc # Driver que conecta o Python com o SQL Server
from datetime import datetime, date  # Manipulação de datas
import xlsxwriter # Biblioteca poderosa que escreve os dados no formato do Excel

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | GET-OMEGA | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
audit_log = logging.getLogger("get_omega.audit")


def _client_ip(req: Request) -> str:
    if req.client:
        return req.client.host
    return "?"

# Inicia o aplicativo/servidor
app = FastAPI(title="GET OMEGA 2.0")

# Permite que o frontend (React) consiga conversar com o backend sem dar erro de segurança
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# String de conexão com o banco de dados SQL Server do Get Omega
DB_CONFIG = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=SRV-SISTEMA;"
    "DATABASE=speds;"
    "UID=relatorio;"
    "PWD=relatorio123;"
    "TrustServerCertificate=yes;"
)

# ============================================================================
# FUNÇÕES DE APOIO (Ajudantes para deixar o código principal limpo)
# ============================================================================

# Função disparada pelo BackgroundTasks após o download concluir para apagar o Excel do HD
def remove_temp_file(path: str):
    try:
        os.unlink(path)
    except Exception as e:
        print(f"Erro ao deletar arquivo temporário: {e}")

# Transforma textos com vírgula (ex: "1.500,00") em números decimais puros pro Excel conseguir somar
def to_float(v):
    if v is None or v == "": return 0.0
    try:
        sv = str(v).strip()
        if '.' in sv and ',' in sv: sv = sv.replace('.', '').replace(',', '.')
        else: sv = sv.replace(',', '.')
        return float(sv)
    except:
        return v

# ============================================================================
# O CORAÇÃO DO SISTEMA: Define qual Procedure será executada no banco
# ============================================================================
def get_sql(pid, cli_id_int, dt_i, dt_f, cnpj, user, reg, xml_f):
    prefix = "SET NOCOUNT ON; SET DATEFORMAT dmy; "
    sql_exec, sql_select = "", ""

    # Avalia qual "pid" (ID do Módulo) chegou do React e monta a instrução SQL correspondente
    if pid == 'credito_gerado':
        sql_select = f"""
        SET DATEFORMAT dmy; SELECT A.ID_CLIENTE, (SELECT B.NOME FROM CLIENTE B WHERE B.id_cliente = A.ID_CLIENTE) AS 'NOME', (SELECT B.CNPJ FROM CLIENTE B WHERE B.id_cliente = A.ID_CLIENTE) AS 'CNPJ', A.PERIODO_ARQ, A.REG, SUM(TRY_CAST(REPLACE(a.coluna4,',','.') as decimal(12,2))) AS 'CREDITO_GERADO', case when a.reg = '5325' then '3A' when a.reg = '5380' then '3B' when a.reg = '5425' then '3C' ELSE 'OUTRA FICHA' END 'FICHA' FROM TBL_CAT83_ARQUIVO a with(nolock) where a.id_cliente = {cli_id_int} and cast(a.periodo_arq as date) between '{dt_i}' and '{dt_f}' and a.reg in ('5325','5380','5425') GROUP BY A.periodo_arq,a.reg,a.id_cliente ORDER BY CAST(a.periodo_arq as date),a.reg
        """
    elif pid == 'bloco_ipi':
        sql_exec = f"EXEC PROC_EXPORT_E510_E520_GERADOR @p_cliente={cli_id_int}, @p_periodo_i='{dt_i}', @p_periodo_f='{dt_f}', @p_usuario='{user}'"
    elif pid == 'bloco_e':
        sql_exec = f"EXEC PROC_EXPORT_E110_E111_GERADOR @p_cliente={cli_id_int}, @p_periodo_i='{dt_i}', @p_periodo_f='{dt_f}', @p_usuario='{user}'"
    elif pid == 'resumo_valores_sped':
        sql_exec = f"EXEC PROC_RES_VAL_SPED_GERADOR @p_cliente={cli_id_int}, @p_periodo_i='{dt_i}', @p_periodo_f='{dt_f}', @p_usuario='{user}'"
        sql_select = f"SET DATEFORMAT dmy; SELECT id_cliente, nome, cnpj, TRY_CAST(periodo as date) as 'periodo', cfop, TRY_CAST(cst as char) as 'cst', TRY_CAST(replace(valor_contabil,',','.') as decimal (14,2)) as 'valor_contabil', TRY_CAST(replace(base_calculo,',','.') as decimal(14,2)) as 'base_calculo', TRY_CAST(replace(valor_icms,',','.') as decimal(14,2)) as 'valor_icms' FROM TBL_RESUMO_SPED WITH(NOLOCK) WHERE ID_CLIENTE = '{cli_id_int}' AND TRY_CAST(periodo as date) BETWEEN '{dt_i}' AND '{dt_f}' ORDER BY TRY_CAST(periodo as date)"
    elif pid == 'resumo_entrada_sped':
        sql_exec = f"EXEC PROC_RESUMO_NFE_ENTRADA_SPED_V2_GERADOR {cli_id_int}, '{dt_i}', '{dt_f}', '{cnpj}', '{user}'"
        cols = "ID_CLIENTE, cast(PERIODO as date) as 'PERIODO', REG, NOME, CNPJ, IE,UF_EMPRESA, IND_OPER, IND_EMIT, TIPO_EMITENTE, NOME_PART, CNPJ_PART, IE_PART, UF_PART, COD_MOD, COD_SIT, SERIE, NUMERO_NOTA, CHAVE, cast(DATA_EMISSAO as date) as 'DATA_EMISSAO', cast(DATA_ENTRADA_SAIDA as date) as 'DATA_ENTRADA_SAIDA', replace(VALOR_NOTA,',','.') as 'VALOR_NOTA', IND_PAGAMENTO, replace(VALOR_DESCONTO,',','.') as 'VALOR_DESCONTO', replace(VALOR_ABAT_NT,',','.') as 'VALOR_ABAT_NAT', replace(VALOR_TOTAL_SERVICOS,',','.') as 'VALOR_TOTAL_SERVICOS', ind_frete, replace(VALOR_FRETE,',','.') as 'VALOR_FRETE', replace(VALOR_SEGURO,',','.') as 'VALOR_SEGURO', replace(VALOR_OUTROS,',','.') as 'VALOR_OUTROS', replace(VALOR_BASE,',','.') as 'VALOR_BASE', replace(VALOR_ICMS,',','.') as 'VALOR_ICMS', replace(VALOR_BASE_ST,',','.') as 'VALOR_BASE_ST', replace(VALOR_ICMS_ST,',','.') as 'VALOR_ICMS_ST', replace(VALOR_IPI_TOTAL_NF,',','.') as 'VALOR_IPI_TOTAL_NF', replace(VALOR_PIS,',','.') as 'VALOR_PIS', replace(VALOR_COFINS,',','.') as 'VALOR_COFINS', replace(VALOR_PIS_ST,',','.') as 'VALOR_PIS_ST', replace(VALOR_COFINS_ST,',','.') as 'VALOR_COFINS_ST', replace(CST_ICMS,',','.') as 'CST_ICMS', CFOP, replace(ALIQUOTA_ICMS,',','.') as 'ALIQUOTA_ICMS', replace(VALOR_CONTABIL,',','.') as 'VALOR_CONTABIL', replace(BASE_ICMS,',','.') as 'BASE_ICMS', replace(VL_ICMS,',','.') as 'VL_ICMS', replace(BASE_ICMS_ST,',','.') as 'BASE_ICMS_ST', replace(VL_ICMS_ST,',','.') as 'VL_ICMS_ST', replace(VL_RED_BC,',','.') as 'VL_RED_BC', replace(VL_IPI,',','.') as 'VL_IPI'"
        sql_select = f"SELECT {cols} FROM TBL_RESUMO_NFE_ENTRADA_SPED WITH(NOLOCK) WHERE ID_CLIENTE = '{cli_id_int}' AND CAST(PERIODO AS DATE) BETWEEN '{dt_i}' AND '{dt_f}' ORDER BY CAST(PERIODO AS DATE)"
    elif pid == 'resumo_saida_sped':
        sql_exec = f"EXEC PROC_RESUMO_NFE_SAIDA_SPED_GERADOR {cli_id_int}, '{dt_i}', '{dt_f}', '{user}'"
        cols = "id_cliente, TRY_CAST(periodo as date) as 'periodo', NOME_EMIT, CNPJ_EMIT, IE_EMIT, ind_oper, ind_emit, cod_part, NOME_PART, CNPJ_PART, CPF_PART, IE_PART, UF_PART, cod_mod, cod_sit, serie, numero_nota, chave, TRY_CAST(data_emissao as date) as 'data_emissao', TRY_CAST(data_entrada_saida as date) as 'data_entrada_saida', Valor_Nota, ind_pagamento, TRY_CAST(replace(Valor_Desconto,',','.') as decimal(14,2)) as 'Valor_Desconto', TRY_CAST(replace(Valor_Abat_NT,',','.') as decimal (14,2)) as 'Valor_Abat_NT', TRY_CAST(replace(Valor_Total_servicos,',','.') as decimal (14,2)) as 'Valor_Total_servicos', ind_frete, TRY_CAST(replace(Valor_Frete,',','.') as decimal (14,2)) as 'Valor_frete', TRY_CAST(replace(Valor_Seguro,',','.') as decimal (14,2)) as 'Valor_seguro', TRY_CAST(replace(Valor_Outros,',','.') as decimal (14,2)) as 'Valor_Outros', TRY_CAST(replace(Valor_Base,',','.') as decimal(14,2)) as 'Valor_Base', TRY_CAST(replace(Valor_Icms,',','.') as decimal (14,2)) as 'Valor_Icms', TRY_CAST(replace(Valor_Base_ST,',','.') as decimal (14,2)) as 'Valor_Base_ST', TRY_CAST(replace(Valor_Icms_ST,',','.') as decimal (14,2)) as 'Valor_Icms_ST', TRY_CAST(replace(Valor_Ipi_Total_NF,',','.') as decimal (14,2)) as 'Valor_Ipi_Toal_NF', TRY_CAST(replace(Valor_Pis,',','.') as decimal (14,2)) as 'Valor_Pis', TRY_CAST(replace(Valor_Cofins,',','.') as decimal (14,2)) as 'Valor_Cofins', TRY_CAST(replace(Valor_Pis_ST,',','.') as decimal (14,2)) as 'Valor_Pis_ST', TRY_CAST(replace(Valor_Cofins_ST,',','.') as decimal (14,2)) as 'Valor_Cofins_ST', CST_ICMS, CFOP, TRY_CAST(replace(ALIQUOTA_ICMS,',','.') as decimal (14,2)) as 'ALIQUOTA_ICMS', TRY_CAST(replace(VALOR_CONTABIL,',','.') as decimal (14,2)) as 'VALOR_CONTABIL', TRY_CAST(replace(BASE_ICMS,',','.') as decimal (14,2)) as 'BASE_ICMS', TRY_CAST(replace(VL_ICMS,',','.') as decimal (14,2)) as 'VL_ICMS', TRY_CAST(replace(BASE_ICMS_ST,',','.') as decimal (14,2)) as 'BASE_ICMS_ST', TRY_CAST(replace(VL_ICMS_ST,',','.') as decimal (14,2)) as 'VL_ICMS_ST', TRY_CAST(replace(VL_RED_BC,',','.') as decimal (14,2)) as 'VL_RED_BC', TRY_CAST(replace(VL_IPI,',','.') as decimal (14,2)) as 'VL_IPI', IIF(VL_ICMS = 0,0, IIF(BASE_ICMS = 0,0, TRY_CAST(VL_ICMS / BASE_ICMS AS DECIMAL(8,2)) * 100)) AS 'ALIQ_ICMS_CALCULADA'"
        sql_select = f"Select {cols} from TBL_RESUMO_NFE_SAIDA_SPED with(nolock) where id_cliente = '{cli_id_int}' and TRY_CAST(periodo as date) between '{dt_i}' and '{dt_f}' order by TRY_CAST(periodo as date)"
    elif pid == 'base_xml':
        # Monta a query dinamicamente baseada nos Radio Buttons do Módulo XML
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
        # Procedure do bloco D já traz os selects sozinhos, então não precisamos preencher o sql_select
        if reg: sql_select = ""

    return prefix, sql_exec, sql_select

# ============================================================================
# FORMATAÇÃO CÉLULA A CÉLULA
# ============================================================================
# Regras de negócio rigorosas para transformar textos do banco em números/datas corretos
def format_value(pid, t_idx, reg, user_col, val):
    if val is None: return "-"
    
    if isinstance(val, (datetime, date)):
        val = val.strftime('%d/%m/%Y')
        
    if pid == 'efd_fiscal':
        if t_idx == 1 and user_col in [7, 8, 10, 11, 38, 74]: val = str(val) 
        elif t_idx == 2:
            if 7 <= user_col <= 13: val = str(val) 
            elif (26 <= user_col <= 37) or (40 <= user_col <= 46): val = to_float(val) 
        elif t_idx == 3:
            if (7 <= user_col <= 13) or user_col == 40: val = str(val) 
            elif 26 <= user_col <= 39: val = to_float(val) 
        elif t_idx == 4:
            if 7 <= user_col <= 13: val = str(val) 
            elif (24 <= user_col <= 33) or (36 <= user_col <= 42): val = to_float(val) 
    elif pid == 'efd_contribuicoes':
        if reg == 'F525' and user_col in [5, 10]: val = to_float(val)
        elif reg == 'F550' and (user_col == 7 or (9 <= user_col <= 12) or (14 <= user_col <= 17)): val = to_float(val)
        elif reg == 'F600' and ((8 <= user_col <= 9) or (13 <= user_col <= 14)): val = to_float(val)
        elif reg == 'F700' and user_col in [8, 9]: val = to_float(val)

    elif pid == 'bloco_d':
        if t_idx == 1 and user_col == 16: val = to_float(val) 
        elif t_idx in [2, 3] and user_col in [7, 8, 10]: val = to_float(val) 

    elif pid == 'bloco_1000':
        if reg in ['1100', '1500'] and 10 <= user_col <= 22: val = to_float(val)
        elif reg in ['1300', '1700'] and 8 <= user_col <= 12: val = to_float(val)
    elif pid == 'resumo_entrada_sped':
        if user_col in [22, 24, 25, 26, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 42, 43, 44, 45, 46, 47, 48, 49 ]: val = to_float(val)
    elif pid == 'resumo_saida_sped':
        if user_col in [17, 19, 20, 21, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39]: val = to_float(val)
    elif pid == 'bloco_e':
        if user_col == 2: val = str(val) 
        
    return val

# Ordem fixa das 17 abas exportadas pelo PROC_REL_CONTRIBUICOES_BLOCO_M_GERADOR (1 result set = 1 aba)
BLOCO_M_SHEET_NAMES = [
    "M200", "M200_M205", "M200_M210",
    "M600", "M600_M605", "M600_M610",
    "M100", "M500",
    "M100_M105", "M100_M110",
    "M500_M505", "M500_M510",
    "M700", "M400", "M800",
    "M220", "M620",
]

# Função que dá os nomes bonitos nas Abas da Planilha (C170, D190, M200, etc.)
def get_tab_name(pid, t_idx, reg):
    if pid == 'efd_fiscal':
        if t_idx == 1: return "C170"
        elif t_idx == 2: return "C590"
        elif t_idx == 3: return "D190"
        elif t_idx == 4: return "D590"
        else: return f"EFD_T{t_idx}"
    elif pid == 'efd_bloco_m':
        if 1 <= t_idx <= len(BLOCO_M_SHEET_NAMES):
            return BLOCO_M_SHEET_NAMES[t_idx - 1]
        return f"M_T{t_idx}"
    elif pid == 'base_xml': return "XML"
    elif pid == 'credito_gerado': return "CREDITO_GERADO"
    elif pid == 'resumo_entrada_sped': return "RESUMO_ENTRADA"
    elif pid == 'resumo_saida_sped': return "RESUMO_SAIDA"
    elif pid == 'resumo_valores_sped': return "RESUMO_VALORES"
    elif pid == 'bloco_e': 
        if t_idx == 1: return "E110"
        elif t_idx == 2: return "E111"
        else: return f"BLOCO_E_T{t_idx}"

    elif pid == 'bloco_d':
        if t_idx == 1: return "D200"
        elif t_idx == 2: return "D201"
        elif t_idx == 3: return "D205"
        else: return f"BLOCO_D_T{t_idx}"   

    elif pid == 'bloco_ipi': 
        if t_idx == 1: return "E510"
        elif t_idx == 2: return "E520"
        elif t_idx == 3: return "E530"
        elif t_idx == 4: return "E531"
        else: return f"BLOCO_IPI_T{t_idx}"
    elif reg: return reg
    else: return f"Tabela_{t_idx}"

def _fetch_usuario_login_row(cursor, conn, username: str, password: str, raw_username: str, raw_password: str):
    """
    Vários formatos de coluna no SQL Server fazem um único WHERE falhar (ex.: CHAR com espaços).
    Ordem: trim+CAST, igualdade simples (legado), login case-insensitive, credenciais sem strip.
    """
    usernames_to_try = []

    def _add_candidate(val: str):
        val = (val or "").strip()
        if val and val not in usernames_to_try:
            usernames_to_try.append(val)

    _add_candidate(username)
    # Vários usuários digitam e-mail completo, mas no banco o Login pode estar em outro formato.
    local_part = ""
    if '@' in username:
        local_part = username.split('@', 1)[0].strip()
        _add_candidate(local_part)
    # Alguns cadastros guardam login sem pontuação do e-mail.
    if local_part:
        _add_candidate(local_part.replace(".", ""))
        # Em alguns ambientes, o login é apenas o primeiro bloco antes do ponto.
        _add_candidate(local_part.split(".", 1)[0])

    attempts = []
    for uname in usernames_to_try:
        attempts.extend([
        (
            "SELECT Login, permissao FROM TBL_USUARIO "
            "WHERE LTRIM(RTRIM(CAST(Login AS NVARCHAR(4000)))) = ? "
            "AND LTRIM(RTRIM(CAST(senha AS NVARCHAR(4000)))) = ?",
            (uname, password),
        ),
        (
            "SELECT Login, permissao FROM TBL_USUARIO WHERE Login = ? AND senha = ?",
            (uname, password),
        ),
        (
            "SELECT Login, permissao FROM TBL_USUARIO "
            "WHERE LOWER(LTRIM(RTRIM(CAST(Login AS NVARCHAR(4000))))) = LOWER(?) "
            "AND LTRIM(RTRIM(CAST(senha AS NVARCHAR(4000)))) = ?",
            (uname, password),
        ),
    ])

    # Se a tabela tiver coluna de e-mail, tenta autenticar por ela também.
    email_columns = ["Email", "email", "EMAIL", "E_MAIL", "e_mail", "MAIL", "mail"]
    for col_name in email_columns:
        try:
            cursor.execute(
                "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'TBL_USUARIO' AND COLUMN_NAME = ?",
                (col_name,),
            )
            if cursor.fetchone():
                for uname in usernames_to_try:
                    attempts.append((
                        f"SELECT Login, permissao FROM TBL_USUARIO "
                        f"WHERE LOWER(LTRIM(RTRIM(CAST({col_name} AS NVARCHAR(4000))))) = LOWER(?) "
                        f"AND LTRIM(RTRIM(CAST(senha AS NVARCHAR(4000)))) = ?",
                        (uname, password),
                    ))
                break
        except Exception:
            pass
    if (raw_username, raw_password) != (username, password):
        attempts.append(
            (
                "SELECT Login, permissao FROM TBL_USUARIO WHERE Login = ? AND senha = ?",
                (raw_username, raw_password),
            )
        )

    for idx, (sql_q, params) in enumerate(attempts):
        try:
            cursor.execute(sql_q, params)
            row = cursor.fetchone()
            if row:
                if idx > 0:
                    audit_log.info("LOGIN matched via fallback strategy #%s", idx + 1)
                return row
        except Exception as ex:
            try:
                conn.rollback()
            except Exception:
                pass
            audit_log.warning("LOGIN SQL attempt %s skipped: %s", idx + 1, ex)
    # Diagnóstico rápido para identificar se o problema é usuário inexistente ou senha incorreta.
    try:
        in_clause = " OR ".join(
            ["LOWER(LTRIM(RTRIM(CAST(Login AS NVARCHAR(4000))))) = LOWER(?)"] * len(usernames_to_try)
        )
        cursor.execute(
            f"SELECT TOP 1 Login FROM TBL_USUARIO WHERE {in_clause}",
            tuple(usernames_to_try),
        )
        found_login = cursor.fetchone()
        if found_login:
            audit_log.info("LOGIN diagnostico | usuario encontrado no banco, mas senha nao conferiu")
        else:
            audit_log.info("LOGIN diagnostico | usuario nao encontrado no banco para os candidatos=%s", usernames_to_try)
    except Exception as ex:
        audit_log.warning("LOGIN diagnostico falhou: %s", ex)
    return None

# ============================================================================
# ENDPOINTS / ROTAS DA API (As portas de entrada que o React usa para pedir as coisas)
# ============================================================================

# ROTA 1: Validação de Login com Nível de Permissão
@app.post("/api/login")
async def login(payload: dict, req: Request):
    conn = None
    try:
        raw_username = payload.get("username")
        raw_password = payload.get("password")
        if raw_username is None:
            raw_username = ""
        if raw_password is None:
            raw_password = ""
        if not isinstance(raw_username, str):
            raw_username = str(raw_username)
        if not isinstance(raw_password, str):
            raw_password = str(raw_password)

        username = raw_username.strip()
        password = raw_password.strip()
        audit_log.info("LOGIN tentativa | ip=%s | usuario=%s", _client_ip(req), username or "(vazio)")

        conn = pyodbc.connect(DB_CONFIG)
        cursor = conn.cursor()

        row = _fetch_usuario_login_row(cursor, conn, username, password, raw_username, raw_password)

        if row:
            perm = str(row[1]).lower().strip() if row[1] else "normal"
            login_name = (row[0] or "").strip() if row[0] is not None else ""
            audit_log.info("LOGIN ok | ip=%s | usuario=%s | permissao=%s", _client_ip(req), login_name, perm)
            return {"success": True, "user": {"name": login_name, "permissao": perm}}
        else:
            audit_log.info("LOGIN falhou | ip=%s | usuario=%s", _client_ip(req), username or "(vazio)")
            return {"success": False, "error": "Usuário ou senha incorretos."}
    except Exception as e:
        return {"success": False, "error": f"Erro no banco de dados: {str(e)}"}
    finally:
        if conn: conn.close()

# ROTA 2: Gerador de Preview (Devolve apenas as 50 primeiras linhas para o React desenhar na tela)
@app.post("/api/generate-base")
async def generate_base(payload: dict, req: Request):
    conn = None
    try:
        conn = pyodbc.connect(DB_CONFIG, autocommit=True)
        cursor = conn.cursor()
        
        p, pid, user, reg, xml_f = payload.get('params', {}), payload.get('procedureId', '').strip(), str(payload.get('userName', 'Analista')).replace("'", ""), payload.get('reg', '').strip(), payload.get('xmlFilters', {})
        audit_log.info(
            "PREVIEW | ip=%s | usuario=%s | modulo=%s | reg=%s | cliente_id=%s",
            _client_ip(req), user, pid or "(vazio)", reg or "-", p.get('p_cliente') or p.get('id_cliente') or "-",
        ) 
        
        dt_i = datetime.strptime(p.get('p_periodo_i') or p.get('data_inicio'), '%Y-%m-%d').strftime('%d/%m/%Y')
        dt_f = datetime.strptime(p.get('p_periodo_f') or p.get('data_fim'), '%Y-%m-%d').strftime('%d/%m/%Y')
        cnpj, cli_id_int = str(p.get('p_cnpj') or '').strip(), int(p.get('p_cliente') or p.get('id_cliente') or 0)

        prefix, sql_exec, sql_select = get_sql(pid, cli_id_int, dt_i, dt_f, cnpj, user, reg, xml_f)

        if sql_exec: cursor.execute(prefix + sql_exec)
        
        all_tables = []
        target = cursor.execute(sql_select) if sql_select else cursor
        t_idx = 1
        
        # Loop que varre as abas. O nextset() serve para pegar múltiplos SELECTs vindos da Procedure
        while True:
            if not target.description:
                if not target.nextset(): break
                continue
                
            # Tratamento Poka-Yoke: Se o banco mandar uma coluna vazia, dá o nome genérico COLUNA_X
            cols_res = [col[0] if col[0] and str(col[0]).strip() != "" else f"COLUNA_{i+1}" for i, col in enumerate(target.description)]
            rows = target.fetchmany(50) # Pega estritamente 50 linhas para não travar o navegador
            clean_rows = []
            
            for r in rows:
                row_dict = {}
                for col_idx, col_name in enumerate(cols_res):
                    row_dict[col_name] = format_value(pid, t_idx, reg, col_idx + 1, r[col_idx])
                clean_rows.append(row_dict)
            
            nome_aba = get_tab_name(pid, t_idx, reg)
            all_tables.append({"name": nome_aba, "preview": clean_rows})
            
            t_idx += 1
            if not target.nextset(): break

        return {"success": True, "data": all_tables}
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        if conn: conn.close()

# ROTA 3: Gerador do Excel Completo (Puxa tudo, salva no HD temporariamente e envia via download)
@app.post("/api/download-excel")
async def download_excel(payload: dict, background_tasks: BackgroundTasks, req: Request):
    conn = None
    try:
        conn = pyodbc.connect(DB_CONFIG, autocommit=True)
        cursor = conn.cursor()
        
        p, pid, user, reg, xml_f = payload.get('params', {}), payload.get('procedureId', '').strip(), str(payload.get('userName', 'Analista')).replace("'", ""), payload.get('reg', '').strip(), payload.get('xmlFilters', {})
        audit_log.info(
            "DOWNLOAD_EXCEL | ip=%s | usuario=%s | modulo=%s | reg=%s | cliente_id=%s",
            _client_ip(req), user, pid or "(vazio)", reg or "-", p.get('p_cliente') or p.get('id_cliente') or "-",
        ) 
        
        dt_i = datetime.strptime(p.get('p_periodo_i') or p.get('data_inicio'), '%Y-%m-%d').strftime('%d/%m/%Y')
        dt_f = datetime.strptime(p.get('p_periodo_f') or p.get('data_fim'), '%Y-%m-%d').strftime('%d/%m/%Y')
        cnpj, cli_id_int = str(p.get('p_cnpj') or '').strip(), int(p.get('p_cliente') or p.get('id_cliente') or 0)

        prefix, sql_exec, sql_select = get_sql(pid, cli_id_int, dt_i, dt_f, cnpj, user, reg, xml_f)
        if sql_exec: cursor.execute(prefix + sql_exec)
        target = cursor.execute(sql_select) if sql_select else cursor

        # Cria um arquivo temporário físico no servidor para suportar bases infinitas
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx")
        
        # Inicia a criação do arquivo habilitando o recurso constant_memory (não carrega tudo na RAM)
        wb = xlsxwriter.Workbook(tmp.name, {'constant_memory': True})
        
        # Formatação visual do Cabeçalho do Excel: Fundo Azul Escuro, Texto Branco e Negrito
        header_format = wb.add_format({
            'bg_color': '#0B2447',
            'font_color': '#FFFFFF',
            'bold': True,
            'align': 'center',
            'valign': 'vcenter'
        })

        t_idx = 1
        while True:
            if not target.description:
                if not target.nextset(): break
                continue
                
            nome_aba = get_tab_name(pid, t_idx, reg)
            ws = wb.add_worksheet(nome_aba[:31]) # Excel não aceita abas com mais de 31 caracteres
            
            # Tratamento da Coluna Vazia
            cols_res = [col[0] if col[0] and str(col[0]).strip() != "" else f"COLUNA_{i+1}" for i, col in enumerate(target.description)]

            # Escreve o cabeçalho (Linha 0) com a formatação bonitona
            for col_num, col_name in enumerate(cols_res):
                ws.write(0, col_num, col_name, header_format)

            col_widths = {i: len(str(col)) + 2 for i, col in enumerate(cols_res)}

            row_num = 1
            # Loop Chunking: Puxa do banco 10.000 linhas por vez para não estourar a memória
            while True:
                rows = target.fetchmany(10000)
                if not rows:
                    break
                
                for r in rows:
                    row_data = []
                    for col_idx, col_name in enumerate(cols_res):
                        val = format_value(pid, t_idx, reg, col_idx + 1, r[col_idx])
                        row_data.append(val)
                        
                        # Calcula a largura inteligente das colunas apenas para as 500 primeiras linhas
                        if row_num <= 500:
                            cell_len = len(str(val)) if val is not None else 1
                            if cell_len > col_widths[col_idx]:
                                col_widths[col_idx] = cell_len
                    
                    # Escreve a linha inteira no arquivo temporário
                    ws.write_row(row_num, 0, row_data)
                    row_num += 1

            # Aplica a largura inteligente calculada em cada coluna
            for col_idx, width in col_widths.items():
                ws.set_column(col_idx, col_idx, min(max(width, 12), 80))

            t_idx += 1
            if not target.nextset(): break

        # Fecha o arquivo temporário garantindo que tudo foi gravado
        wb.close()
        
        # Agenda para o Python deletar o arquivo logo depois que o download finalizar no navegador
        background_tasks.add_task(remove_temp_file, tmp.name)
        
        # Preparação do nome padrão sugerido para baixar
        dt_i_formatada = dt_i.replace('/', '-')
        dt_f_formatada = dt_f.replace('/', '-')
        nome_proc = pid.replace('_', ' ').upper()
        
        # Define a parte extra do nome dinamicamente (REG ou Filtros do XML)
        extra_part = f" - {reg}" if reg and str(reg).strip() != "" else ""
        
        if pid == 'base_xml':
            t_xml = xml_f.get('tipo', 'entrada_saida')
            e_xml = xml_f.get('emitente', 'proprios')
            tipo_texto = "ENTRADA E SAÍDA" if t_xml == 'entrada_saida' else t_xml.upper()
            emit_texto = e_xml.upper()
            extra_part = f" - {tipo_texto} + {emit_texto}"
        
        filename = f"GET OMEGA - {nome_proc}{extra_part} - {cnpj or cli_id_int} - {dt_i_formatada} A {dt_f_formatada}.xlsx"
        
        # Envia o arquivo Excel formatado para a tela do usuário
        return FileResponse(
            path=tmp.name, 
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename=filename
        )
    except Exception as e:
        # Poka-Yoke Crítico: Se der erro, manda um JSON para o React, que avisa o usuário
        return {"success": False, "error": str(e)}
    finally:
        if conn: conn.close()

# ROTA 4: Pesquisa Dinâmica de Clientes (Chamada a cada letra digitada)
@app.get("/api/clientes")
async def get_clientes(req: Request, search: str = ""):
    audit_log.info("BUSCA_CLIENTES | ip=%s | termo=%s", _client_ip(req), search or "(vazio)")
    conn = pyodbc.connect(DB_CONFIG)
    cursor = conn.cursor()
    # Puxa os top 50 resultados que batem com o que foi digitado na lupa
    cursor.execute("SELECT TOP 50 id_cliente, nome, cnpj FROM cliente WHERE nome LIKE ?", (f"%{search}%",))
    cols = [col[0] for col in cursor.description]
    res = [dict(zip(cols, r)) for r in cursor.fetchall()]
    conn.close()
    return res

# Comando que inicializa o servidor de fato ao rodar o arquivo
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001)