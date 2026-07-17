ALTER PROCEDURE PROC_CARGA_R11

@p_cliente int,
@p_periodo_i date,
@p_periodo_f date


AS

BEGIN

DECLARE @P_CNPJ VARCHAR(14) = (SELECT CNPJ FROM CLIENTE WHERE id_cliente = @P_CLIENTE)

DECLARE @P_USUARIO VARCHAR(100) = (SELECT SYSTEM_USER)


-- EXECUTANDO AS PROCEDURES DE CARGA NECESSÁRIAS

EXEC PROC_RESUMO_NFE_SAIDA_SPED_GERADOR @p_cliente,@p_periodo_i,@p_periodo_f,@P_USUARIO


EXEC PROC_EXPORT_E510_E520_GERADOR @p_cliente,@p_periodo_i,@p_periodo_f,@P_USUARIO

EXEC PROC_RESUMO_NFE_ENTRADA_SPED_V2_GERADOR @p_cliente,@p_periodo_i,@p_periodo_f,@P_CNPJ,@P_USUARIO


-- DELETANDO OS DADOS ANTIGOS


DELETE FROM TBL_R11
WHERE id_cliente = @p_cliente
AND CAST(PERIODO AS DATE) BETWEEN @p_periodo_i AND @p_periodo_f

COMMIT


-- PREENCHEENDO OS DADOS NO TBL_R11


INSERT INTO TBL_R11 (

id_cliente,
periodo,
Tipo,
cnpj_declarante,
cnpj_sucedida,
CNPJ_Estabelecimento_Detentor_Credito,
Ano_Periodo_apuracao,
Mes_Periodo_Apuracao,
Decendio_Quinzena_Periodo_Apuracao,
cfop,
Base_Calculo,
IPI_Creditado)


 SELECT 
		 id_cliente,
		 CAST(periodo AS DATE) AS 'PERIODO',
		 'R11' AS 'Tipo',
         CNPJ as 'cnpj_declarante',
	     '' as 'cnpj_sucedida',
	     CNPJ as 'CNPJ_Estabelecimento_Detentor_Credito',
		 YEAR(PERIODO) as 'Ano_Periodo_apuracao',
		
		 SUBSTRING(CAST(PERIODO AS CHAR),6,2) as 'Mes_Periodo_Apuracao',
		 '0' as 'Decendio_Quinzena_Periodo_Apuracao',
		 cfop,
		 cast(sum(VALOR_BASE_IPI) as decimal(14,2)) as 'Base_Calculo',
		  cast(sum(VALOR_IPI) as decimal(14,2)) as 'IPI_Creditado'

		


		 From TBL_EFD_E510 a with(nolock)

		 where ID_CLIENTE = @p_cliente
		 AND CFOP < 4000
		 and VALOR_IPI NOT IN (0)
		 and cast(periodo as date) between @p_periodo_i and @p_periodo_f
		 group by cnpj,cfop,YEAR(PERIODO),SUBSTRING(CAST(PERIODO AS CHAR),5,2),id_cliente, CAST(periodo AS DATE) 
		 order by  CAST(PERIODO AS DATE),CFOP

commit

-- ATUALIZANDO A COLUNA DE ARQUIVO TXT


UPDATE TBL_R11 SET ARQUIVO_TXT =

CONCAT(
		TIPO,
		cnpj_declarante,
		'              ',
		CNPJ_Estabelecimento_Detentor_Credito,
		Ano_Periodo_apuracao,
		Mes_Periodo_Apuracao,
		Decendio_Quinzena_Periodo_Apuracao,
		cfop,
		
		CONCAT(REPLICATE('0',14 - LEN(REPLACE(Base_Calculo,'.',''))),REPLACE(Base_Calculo,'.','')),
		CONCAT(REPLICATE('0',14 - LEN(REPLACE(IPI_Creditado,'.',''))),REPLACE(IPI_Creditado,'.','')),
		'00000000000000',
		'00000000000000'
		) 

where id_cliente = @p_cliente
and cast(periodo as date) between @p_periodo_i and @p_periodo_f

COMMIT


END

